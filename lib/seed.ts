// Writes the December plan into the database. Safe to run twice: it does nothing
// if a plan with the same name already exists.
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deliverables, planBlocks, planItems, plans } from "@/lib/db/schema";
import { decemberPlan } from "@/lib/seed-plan";

export async function seedDecemberPlan(year = 2026): Promise<"created" | "already there"> {
  const seed = decemberPlan(year);
  const existing = await db.select({ id: plans.id }).from(plans).where(eq(plans.name, seed.plan.name));
  if (existing.length > 0) return "already there";

  await db.transaction(async (tx) => {
    const [plan] = await tx.insert(plans).values(seed.plan).returning({ id: plans.id });
    for (const [i, block] of seed.blocks.entries()) {
      const { items, ...rest } = block;
      const [row] = await tx.insert(planBlocks).values({ ...rest, planId: plan.id, sortOrder: i }).returning({ id: planBlocks.id });
      await tx.insert(planItems).values(items.map((item) => ({ ...item, planId: plan.id, blockId: row.id })));
    }
    await tx.insert(planItems).values(seed.running.map((item) => ({ ...item, planId: plan.id })));
    await tx.insert(deliverables).values(seed.deliverables.map((name) => ({ name, planId: plan.id })));
  });
  return "created";
}
