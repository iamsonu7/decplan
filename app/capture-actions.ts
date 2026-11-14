"use server";
// Server actions behind the capture box.
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth";
import { estimateCostUsd, getProvider } from "@/lib/ai";
import { AIError } from "@/lib/ai/types";
import { runBot } from "@/lib/capture/bot";
import { ITEM_TYPES, itemSchema, TYPE_INFO, type ItemType } from "@/lib/capture/items";
import { fileItem, outreachFirms, runQuery, saveCapture, undoFiled } from "@/lib/capture/store";
import { db } from "@/lib/db";
import { aiUsage, captures, inboxItems, type FiledRef } from "@/lib/db/schema";
import { todayStr } from "@/lib/dates";

export type Card = {
  captureId: string;
  index: number;
  type: ItemType;
  typeLabel: string;
  label: string;
  where: string;
  href: string;
  action: "created" | "updated";
  undone: boolean;
  question?: string;
  inboxId?: string;
};
export type CaptureResult = { ok: true; reply: string; cards: Card[] } | { ok: false; error: string };

function toCard(captureId: string, index: number, ref: FiledRef): Card {
  const type = ref.type as ItemType;
  const info = TYPE_INFO[type];
  const href = ref.table === "notes" || ref.table === "opportunities" ? `${info.href}/${ref.id}` : info.href;
  return {
    captureId,
    index,
    type,
    typeLabel: info.label,
    label: ref.label,
    where: info.where,
    href,
    action: ref.action,
    undone: ref.undone === true,
    question: type === "inbox" ? String(ref.source.question ?? "What should I do with this?") : undefined,
    inboxId: type === "inbox" ? ref.id : undefined,
  };
}

function describe(cards: Card[]): string {
  if (cards.length === 0) return "";
  const asks = cards.filter((c) => c.type === "inbox");
  const filed = cards.length - asks.length;
  return [filed > 0 ? `Filed ${filed} item${filed === 1 ? "" : "s"}.` : "", ...asks.map((c) => c.question)].filter(Boolean).join(" ");
}

// Handles one message typed into the capture box. `answersInboxId` is set when
// the message is the user's answer to a question the bot asked earlier.
export async function capture(message: string, answersInboxId?: string): Promise<CaptureResult> {
  await requireUser();
  const text = message.trim().slice(0, 4000);
  if (!text) return { ok: false, error: "Type something first." };

  try {
    const provider = getProvider();
    const today = todayStr();
    const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(`${today}T00:00:00Z`));

    let prompt = text;
    let inbox: typeof inboxItems.$inferSelect | undefined;
    if (answersInboxId) {
      [inbox] = await db.select().from(inboxItems).where(eq(inboxItems.id, answersInboxId));
      if (inbox) prompt = `Earlier I wrote: "${inbox.rawText}"\nYou asked: "${inbox.question}"\nMy answer: ${text}\nNow file the earlier note properly.`;
    }

    const result = await runBot(provider, prompt, { today, weekday, firms: await outreachFirms(), runQuery });
    await db.insert(aiUsage).values({ provider: provider.id, model: provider.model, purpose: result.items.length > 0 ? "capture" : "question", ...result.usage });

    const captureId = await saveCapture(text, "", []);
    const refs: FiledRef[] = [];
    for (const item of result.items) refs.push(await fileItem(item, today, captureId));

    // The earlier inbox note is settled once its answer produced a real item.
    const resolved = refs.find((r) => r.type !== "inbox");
    if (inbox && resolved) {
      await db.update(inboxItems).set({ resolvedInto: { table: resolved.table, id: resolved.id }, deletedAt: new Date() }).where(eq(inboxItems.id, inbox.id));
    }

    const cards = refs.map((ref, i) => toCard(captureId, i, ref));
    const reply = result.answer || describe(cards);
    await saveCapture(text, reply, refs, captureId);
    revalidatePath("/", "layout");
    return { ok: true, reply, cards };
  } catch (e) {
    if (e instanceof AIError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong while filing that. Nothing was lost: try again." };
  }
}

async function loadRef(captureId: string, index: number) {
  const [row] = await db.select().from(captures).where(eq(captures.id, captureId));
  const ref = row?.createdItems[index];
  if (!row || !ref) throw new Error("That item is no longer available.");
  return { row, ref };
}

export async function undoCard(captureId: string, index: number): Promise<{ ok: true; card: Card } | { ok: false; error: string }> {
  await requireUser();
  try {
    const { row, ref } = await loadRef(captureId, index);
    if (!ref.undone) await undoFiled(ref);
    const refs = row.createdItems.map((r, i) => (i === index ? { ...r, undone: true } : r));
    await db.update(captures).set({ createdItems: refs }).where(eq(captures.id, captureId));
    revalidatePath("/", "layout");
    return { ok: true, card: toCard(captureId, index, refs[index]) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not undo." };
  }
}

// Files the same item again as a different type. No AI call is needed.
export async function changeCardType(captureId: string, index: number, newType: string): Promise<{ ok: true; card: Card } | { ok: false; error: string }> {
  await requireUser();
  try {
    if (!ITEM_TYPES.includes(newType as ItemType)) throw new Error("Unknown type.");
    const { row, ref } = await loadRef(captureId, index);
    const item = itemSchema.parse({ ...ref.source, type: newType });
    if (!ref.undone) await undoFiled(ref);
    const next = await fileItem(item, todayStr(), captureId);
    const refs = row.createdItems.map((r, i) => (i === index ? next : r));
    await db.update(captures).set({ createdItems: refs }).where(eq(captures.id, captureId));
    revalidatePath("/", "layout");
    return { ok: true, card: toCard(captureId, index, next) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not change the type." };
  }
}

// This month's AI use, for Settings.
export async function monthlyUsage() {
  await requireUser();
  const monthStart = new Date(`${todayStr().slice(0, 7)}-01T00:00:00+05:30`);
  const rows = await db.select().from(aiUsage);
  const mine = rows.filter((r) => r.createdAt >= monthStart);
  const byProvider = new Map<string, { calls: number; inputTokens: number; outputTokens: number }>();
  for (const r of mine) {
    const sum = byProvider.get(r.provider) ?? { calls: 0, inputTokens: 0, outputTokens: 0 };
    byProvider.set(r.provider, { calls: sum.calls + 1, inputTokens: sum.inputTokens + r.inputTokens, outputTokens: sum.outputTokens + r.outputTokens });
  }
  return [...byProvider.entries()].map(([provider, u]) => ({ provider, ...u, costUsd: estimateCostUsd(provider, u) }));
}
