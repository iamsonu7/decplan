"use server";
// Generic create / edit / delete actions used by every table page.
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth";
import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { coerceValue, getTableConfig, isTableKey, type TableKey } from "@/lib/tables/config";
import { anyTable } from "@/lib/tables/server";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function check(key: string): asserts key is TableKey {
  if (!isTableKey(key)) throw new Error("Unknown table.");
}

async function run(fn: () => Promise<string | void>): Promise<ActionResult> {
  await requireUser();
  try {
    const id = await fn();
    revalidatePath("/", "layout");
    return { ok: true, id: id || undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

// Creates a row. Required columns that were not given get a sensible starting value.
export async function createRow(key: string, values: Record<string, unknown> = {}): Promise<ActionResult> {
  return run(async () => {
    check(key);
    const data: Record<string, unknown> = {};
    for (const col of getTableConfig(key).columns) {
      if (values[col.key] !== undefined) data[col.key] = coerceValue(col, values[col.key]);
      else if (col.required) data[col.key] = col.type === "date" ? todayStr() : "Untitled";
    }
    const [row] = await db.insert(anyTable(key)).values(data).returning({ id: anyTable(key).id });
    return row.id as string;
  });
}

export async function updateCell(key: string, id: string, colKey: string, raw: unknown): Promise<ActionResult> {
  return run(async () => {
    check(key);
    const col = getTableConfig(key).columns.find((c) => c.key === colKey);
    if (!col) throw new Error("Unknown column.");
    const t = anyTable(key);
    await db.update(t).set({ [col.key]: coerceValue(col, raw) }).where(eq(t.id, id));
  });
}

// Moves a row to the Trash. It can be restored from there.
export async function deleteRow(key: string, id: string): Promise<ActionResult> {
  return run(async () => {
    check(key);
    const t = anyTable(key);
    await db.update(t).set({ deletedAt: new Date() }).where(eq(t.id, id));
  });
}

export async function restoreRow(key: string, id: string): Promise<ActionResult> {
  return run(async () => {
    check(key);
    const t = anyTable(key);
    await db.update(t).set({ deletedAt: null }).where(eq(t.id, id));
  });
}

// Permanent. The Trash page asks for confirmation before calling this.
export async function deleteForever(key: string, id: string): Promise<ActionResult> {
  return run(async () => {
    check(key);
    const t = anyTable(key);
    await db.delete(t).where(eq(t.id, id));
  });
}
