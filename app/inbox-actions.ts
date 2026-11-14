"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth";
import type { ActionResult } from "@/app/actions";
import { ITEM_TYPES, itemSchema, type ItemType } from "@/lib/capture/items";
import { fileItem } from "@/lib/capture/store";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";
import { todayStr } from "@/lib/dates";

// Files an inbox note as the type the user picked. No AI call.
export async function fileInboxItem(id: string, type: string): Promise<ActionResult> {
  await requireUser();
  try {
    if (!ITEM_TYPES.includes(type as ItemType) || type === "inbox") throw new Error("Pick a type.");
    const [row] = await db.select().from(inboxItems).where(eq(inboxItems.id, id));
    if (!row) throw new Error("That inbox item no longer exists.");
    const item = itemSchema.parse({ type, title: row.rawText.slice(0, 200), details: row.rawText });
    const ref = await fileItem(item, todayStr(), row.captureId);
    await db.update(inboxItems).set({ resolvedInto: { table: ref.table, id: ref.id }, deletedAt: new Date() }).where(eq(inboxItems.id, id));
    revalidatePath("/", "layout");
    return { ok: true, id: ref.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not file that." };
  }
}
