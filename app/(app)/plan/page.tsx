import { and, asc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/auth";
import { NewPlanForm, PlanView } from "@/components/PlanView";
import { db } from "@/lib/db";
import { planBlocks, planItems, plans } from "@/lib/db/schema";
import { todayStr } from "@/lib/dates";
import { loadDecemberPlan } from "./actions";

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  await requireUser();
  const today = todayStr();
  const all = await db
    .select({ id: plans.id, name: plans.name, startDate: plans.startDate, endDate: plans.endDate })
    .from(plans)
    .where(isNull(plans.deletedAt))
    .orderBy(asc(plans.startDate));

  if (all.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-4xl font-extrabold">Plan</h1>
        <div className="card mt-6 p-6">
          <h2 className="text-xl font-bold">No plan yet</h2>
          <p className="mt-2 text-muted">Load the Dec 1 to 26 plan (4 blocks, the running-alongside items and the 3 deliverables), or start your own below.</p>
          <form
            className="mt-4"
            action={async () => {
              "use server";
              await loadDecemberPlan();
            }}
          >
            <button type="submit" className="btn bg-mint">
              Load the December plan
            </button>
          </form>
        </div>
        <div className="mt-6">
          <NewPlanForm />
        </div>
      </div>
    );
  }

  // Chosen plan, else the one running today, else the next upcoming, else the latest.
  const { plan: wanted } = await searchParams;
  const plan =
    all.find((p) => p.id === wanted) ??
    all.find((p) => p.startDate <= today && today <= p.endDate) ??
    all.find((p) => p.startDate > today) ??
    all[all.length - 1];

  const blocks = await db
    .select({ id: planBlocks.id, name: planBlocks.name, startDate: planBlocks.startDate, endDate: planBlocks.endDate, output: planBlocks.output })
    .from(planBlocks)
    .where(and(eq(planBlocks.planId, plan.id), isNull(planBlocks.deletedAt)))
    .orderBy(asc(planBlocks.sortOrder), asc(planBlocks.startDate));
  const rows = await db
    .select()
    .from(planItems)
    .where(and(eq(planItems.planId, plan.id), isNull(planItems.deletedAt)))
    .orderBy(asc(planItems.date), asc(planItems.createdAt), asc(planItems.title));
  const items = rows.map((r) => ({ id: r.id, blockId: r.blockId, date: r.date, title: r.title, done: r.doneAt !== null }));

  return <PlanView plans={all} plan={plan} blocks={blocks} items={items} today={today} />;
}
