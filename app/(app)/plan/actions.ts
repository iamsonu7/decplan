"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth";
import type { ActionResult } from "@/app/actions";
import { db } from "@/lib/db";
import { planBlocks, planItems, plans } from "@/lib/db/schema";
import { seedDecemberPlan } from "@/lib/seed";

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const text = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 500) : "");

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

export async function loadDecemberPlan(): Promise<ActionResult> {
  return run(async () => {
    await seedDecemberPlan();
  });
}

export async function toggleItem(id: string, done: boolean): Promise<ActionResult> {
  return run(async () => {
    await db.update(planItems).set({ doneAt: done ? new Date() : null }).where(eq(planItems.id, id));
  });
}

export async function addItem(planId: string, blockId: string | null, date: string, title: string): Promise<ActionResult> {
  return run(async () => {
    if (!isDate(date)) throw new Error("Pick a date.");
    if (!text(title)) throw new Error("Type what the item is.");
    await db.insert(planItems).values({ planId, blockId, date, title: text(title) });
  });
}

export async function addBlock(planId: string, name: string, startDate: string, endDate: string, output: string): Promise<ActionResult> {
  return run(async () => {
    if (!text(name)) throw new Error("Give the block a name.");
    if (!isDate(startDate) || !isDate(endDate) || endDate < startDate) throw new Error("Pick a start date and an end date after it.");
    const existing = await db.select({ id: planBlocks.id }).from(planBlocks).where(eq(planBlocks.planId, planId));
    await db.insert(planBlocks).values({ planId, name: text(name), startDate, endDate, output: text(output) || null, sortOrder: existing.length });
  });
}

export async function renameBlock(id: string, name: string): Promise<ActionResult> {
  return run(async () => {
    if (!text(name)) throw new Error("The block needs a name.");
    await db.update(planBlocks).set({ name: text(name) }).where(eq(planBlocks.id, id));
  });
}

export async function addPlan(name: string, startDate: string, endDate: string): Promise<ActionResult> {
  return run(async () => {
    if (!text(name)) throw new Error("Give the plan a name.");
    if (!isDate(startDate) || !isDate(endDate) || endDate < startDate) throw new Error("Pick a start date and an end date after it.");
    const [row] = await db.insert(plans).values({ name: text(name), startDate, endDate }).returning({ id: plans.id });
    return row.id;
  });
}

// Permanent: removes the block and its items. The page asks for confirmation first.
export async function deleteBlockForever(id: string, planId: string): Promise<ActionResult> {
  return run(async () => {
    await db.delete(planBlocks).where(and(eq(planBlocks.id, id), eq(planBlocks.planId, planId)));
  });
}
