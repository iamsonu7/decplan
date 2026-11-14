"use server";
// Actions for the two rich-text page types: notes and opportunities.
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth";
import type { ActionResult } from "@/app/actions";
import { db } from "@/lib/db";
import { notes, opportunities, OPPORTUNITY_STATUSES, type OpportunityStatus } from "@/lib/db/schema";
import { cleanHtml } from "@/lib/html";
import { parseTags } from "@/lib/tables/config";

export type DocKind = "notes" | "opportunities";

export async function createDoc(kind: DocKind): Promise<ActionResult> {
  await requireUser();
  const table = kind === "notes" ? notes : opportunities;
  const [row] = await db.insert(table).values({ title: "Untitled" }).returning({ id: table.id });
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function saveDoc(kind: DocKind, id: string, input: { title: string; body: string; tags: string; status?: string }): Promise<ActionResult> {
  await requireUser();
  const title = input.title.trim().slice(0, 300) || "Untitled";
  const base = { title, body: cleanHtml(input.body), tags: parseTags(input.tags) };
  try {
    if (kind === "notes") {
      await db.update(notes).set(base).where(eq(notes.id, id));
    } else {
      const status = OPPORTUNITY_STATUSES.includes(input.status as OpportunityStatus) ? (input.status as OpportunityStatus) : "open";
      await db.update(opportunities).set({ ...base, status }).where(eq(opportunities.id, id));
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
