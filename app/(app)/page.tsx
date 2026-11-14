import Link from "next/link";
import { and, asc, eq, isNull, lt, lte, ne } from "drizzle-orm";
import { requireUser } from "@/auth";
import { PlanTick, QuickLog, QuickTask, TaskTick } from "@/components/TodayWidgets";
import { db } from "@/lib/db";
import { learningLog, planItems, tasks } from "@/lib/db/schema";
import { formatDay, streak, todayStr, weekStart } from "@/lib/dates";

export default async function TodayPage() {
  await requireUser();
  const today = todayStr();

  const [todayItems, missed, dueTasks, logs] = await Promise.all([
    db.select().from(planItems).where(and(eq(planItems.date, today), isNull(planItems.deletedAt))).orderBy(asc(planItems.createdAt), asc(planItems.title)),
    db.select().from(planItems).where(and(lt(planItems.date, today), isNull(planItems.doneAt), isNull(planItems.deletedAt))).orderBy(asc(planItems.date)),
    db.select().from(tasks).where(and(lte(tasks.dueDate, today), ne(tasks.status, "done"), isNull(tasks.deletedAt))).orderBy(asc(tasks.dueDate)),
    db.select({ date: learningLog.date, hours: learningLog.hours }).from(learningLog).where(isNull(learningLog.deletedAt)),
  ]);

  const monday = weekStart(today);
  const hoursToday = logs.filter((l) => l.date === today).reduce((sum, l) => sum + l.hours, 0);
  const hoursWeek = logs.filter((l) => l.date >= monday && l.date <= today).reduce((sum, l) => sum + l.hours, 0);
  const days = streak(logs.map((l) => l.date), today);
  const stats = [
    { label: "Day streak", value: String(days), colour: "bg-peach" },
    { label: "Hours today", value: String(hoursToday), colour: "bg-mint" },
    { label: "Hours this week", value: String(hoursWeek), colour: "bg-sky" },
    { label: "Plan items done today", value: `${todayItems.filter((i) => i.doneAt).length}/${todayItems.length}`, colour: "bg-lilac" },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-4xl font-extrabold">Today</h1>
      <p className="mt-2 text-muted">{formatDay(today)}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`card p-4 ${s.colour}`}>
            <div className="text-3xl font-extrabold">{s.value}</div>
            <div className="text-sm font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-xl font-extrabold">Today&apos;s plan</h2>
          <div className="mt-2 divide-y divide-ink/15">
            {todayItems.map((i) => (
              <PlanTick key={i.id} id={i.id} title={i.title} done={i.doneAt !== null} />
            ))}
          </div>
          {todayItems.length === 0 && (
            <p className="mt-2 text-muted">
              Nothing planned for today. See the <Link href="/plan" className="underline">Plan</Link>.
            </p>
          )}
          {missed.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold">Catch up: {missed.length} earlier item(s) not done</summary>
              <div className="mt-1 divide-y divide-ink/15">
                {missed.slice(0, 15).map((i) => (
                  <PlanTick key={i.id} id={i.id} title={`${formatDay(i.date)}: ${i.title}`} done={false} />
                ))}
              </div>
            </details>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-xl font-extrabold">Tasks and reminders due</h2>
          <div className="mt-2 divide-y divide-ink/15">
            {dueTasks.map((t) => (
              <TaskTick
                key={t.id}
                id={t.id}
                title={t.title}
                note={[t.isReminder ? "reminder" : "", t.dueDate && t.dueDate < today ? `overdue since ${formatDay(t.dueDate)}` : ""].filter(Boolean).join(" · ")}
              />
            ))}
          </div>
          {dueTasks.length === 0 && <p className="mt-2 text-muted">Nothing due.</p>}
          <div className="mt-4">
            <QuickTask today={today} />
          </div>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="text-xl font-extrabold">Log your hours</h2>
          <div className="mt-3">
            <QuickLog today={today} />
          </div>
        </section>
      </div>
    </div>
  );
}
