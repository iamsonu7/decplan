"use client";
// The Plan page: blocks with progress bars, a tick-box per day, and forms to add things.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRow, updateCell, type ActionResult } from "@/app/actions";
import { addBlock, addItem, addPlan, deleteBlockForever, renameBlock, toggleItem } from "@/app/(app)/plan/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatDay } from "@/lib/dates";

export type PlanItem = { id: string; blockId: string | null; date: string; title: string; done: boolean };
export type PlanBlock = { id: string; name: string; startDate: string; endDate: string; output: string | null };
export type PlanSummary = { id: string; name: string; startDate: string; endDate: string };

const BLOCK_COLOURS = ["bg-sky", "bg-mint", "bg-peach", "bg-lilac", "bg-butter"];
const field = "rounded-[10px] border-[1.5px] border-ink bg-paper px-3 py-2";

function Progress({ done, total, colour }: { done: number; total: number; colour: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="h-4 flex-1 overflow-hidden rounded-full border-[1.5px] border-ink bg-paper" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full border-r-[1.5px] border-ink ${colour}`} style={{ width: `${pct}%`, borderRightWidth: pct === 0 || pct === 100 ? 0 : undefined }} />
      </div>
      <span className="w-24 text-right text-sm font-semibold">
        {done}/{total} · {pct}%
      </span>
    </div>
  );
}

export function PlanView(props: { plans: PlanSummary[]; plan: PlanSummary; blocks: PlanBlock[]; items: PlanItem[]; today: string }) {
  const { plan, blocks, items, today } = props;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (fn: () => Promise<ActionResult>, after?: (res: ActionResult) => void) =>
    start(async () => {
      const res = await fn();
      setError(res.ok ? null : res.error);
      if (res.ok) after?.(res);
    });

  // A plain function (not a component) so inputs keep their focus between saves.
  function itemList(list: PlanItem[], blockId: string | null, colour: string) {
    return (
      <>
        <ul className="mt-4 divide-y divide-ink/15">
          {list.map((item) => (
            <li key={item.id} className={`flex items-start gap-3 py-2 ${item.date === today ? "-mx-2 rounded-lg bg-butter px-2" : ""}`}>
              <input
                type="checkbox"
                aria-label={`Done: ${item.title}`}
                className="mt-1.5 size-4 shrink-0 accent-ink"
                // Uncontrolled so the tick shows at once; the key resets it to the saved value.
                key={String(item.done)}
                defaultChecked={item.done}
                onChange={(e) => act(() => toggleItem(item.id, e.target.checked))}
              />
              <span className="w-20 shrink-0 pt-0.5 text-sm font-semibold text-muted">{formatDay(item.date)}</span>
              <textarea
                key={item.title}
                rows={1}
                aria-label="Item"
                defaultValue={item.title}
                className={`min-w-0 flex-1 resize-none rounded-md bg-transparent px-1 outline-none [field-sizing:content] focus:bg-paper focus:ring-2 focus:ring-ink ${item.done ? "text-muted line-through" : ""}`}
                onBlur={(e) => e.target.value !== item.title && act(() => updateCell("planItems", item.id, "title", e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              <button type="button" title="Move to Trash" aria-label="Move to Trash" className="rounded-md px-2 text-muted hover:bg-peach hover:text-ink" onClick={() => act(() => deleteRow("planItems", item.id))}>
                ✕
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="py-2 text-muted">No items yet.</li>}
        </ul>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            act(() => addItem(plan.id, blockId, String(data.get("date")), String(data.get("title"))), () => form.reset());
          }}
        >
          <input name="date" type="date" required aria-label="Date" min={plan.startDate} max={plan.endDate} className={field} />
          <input name="title" required placeholder="Add an item…" aria-label="New item" className={`${field} min-w-40 flex-1`} />
          <button type="submit" className={`btn ${colour}`} disabled={pending}>
            Add
          </button>
        </form>
      </>
    );
  }

  const done = items.filter((i) => i.done).length;
  const running = items.filter((i) => !i.blockId);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-extrabold">Plan</h1>
        <select aria-label="Choose plan" className={`${field} ml-auto`} value={plan.id} onChange={(e) => router.push(`/plan?plan=${e.target.value}`)}>
          {props.plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-muted">
        {plan.name}: {formatDay(plan.startDate)} to {formatDay(plan.endDate)}
      </p>
      <div className="mt-4">
        <Progress done={done} total={items.length} colour="bg-mint" />
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-lg border-[1.5px] border-ink bg-peach px-3 py-2 font-semibold">
          {error}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6">
        {blocks.map((block, i) => {
          const list = items.filter((it) => it.blockId === block.id);
          const colour = BLOCK_COLOURS[i % BLOCK_COLOURS.length];
          return (
            <section key={block.id} className="card overflow-hidden">
              <header className={`border-b-[1.5px] border-ink p-5 ${colour}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    key={block.name}
                    aria-label="Block name"
                    defaultValue={block.name}
                    className="w-full min-w-0 rounded-md bg-transparent text-2xl font-extrabold sm:w-auto sm:flex-1 outline-none focus:bg-paper focus:ring-2 focus:ring-ink"
                    onBlur={(e) => e.target.value !== block.name && act(() => renameBlock(block.id, e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  />
                  <span className="text-sm font-semibold">
                    {formatDay(block.startDate)} to {formatDay(block.endDate)}
                  </span>
                </div>
                {block.output && <p className="mt-1">Output: {block.output}</p>}
                <div className="mt-3">
                  <Progress done={list.filter((x) => x.done).length} total={list.length} colour="bg-ink" />
                </div>
              </header>
              <div className="p-5">
                {itemList(list, block.id, colour)}
                <div className="mt-4 text-right">
                  <ConfirmButton
                    label="Delete block"
                    className="text-sm text-muted underline"
                    title="Delete this block permanently?"
                    detail={`${block.name}\n${list.length} item(s) inside it will be deleted too. This cannot be undone.`}
                    confirmLabel="Delete permanently"
                    action={() => deleteBlockForever(block.id, plan.id)}
                  />
                </div>
              </div>
            </section>
          );
        })}

        <section className="card p-5">
          <h2 className="text-2xl font-extrabold">Running alongside</h2>
          <div className="mt-3">
            <Progress done={running.filter((x) => x.done).length} total={running.length} colour="bg-lilac" />
          </div>
          {itemList(running, null, "bg-lilac")}
        </section>

        <details className="card p-5">
          <summary className="cursor-pointer text-lg font-bold">Add a block to this plan</summary>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const d = new FormData(form);
              act(() => addBlock(plan.id, String(d.get("name")), String(d.get("start")), String(d.get("end")), String(d.get("output"))), () => form.reset());
            }}
          >
            <input name="name" required placeholder="Block name" aria-label="Block name" className={`${field} sm:col-span-2`} />
            <label className="grid gap-1 text-sm font-semibold">
              Starts <input name="start" type="date" required className={field} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Ends <input name="end" type="date" required className={field} />
            </label>
            <input name="output" placeholder="Output (what this block should produce)" aria-label="Output" className={`${field} sm:col-span-2`} />
            <button type="submit" className="btn bg-mint sm:col-span-2" disabled={pending}>
              Add block
            </button>
          </form>
        </details>

        <NewPlanForm />
      </div>
    </div>
  );
}

export function NewPlanForm({ open = false }: { open?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <details className="card p-5" open={open}>
      <summary className="cursor-pointer text-lg font-bold">Start a new plan (for example, January)</summary>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          start(async () => {
            const res = await addPlan(String(d.get("name")), String(d.get("start")), String(d.get("end")));
            if (res.ok) router.push(`/plan?plan=${res.id}`);
            else setError(res.error);
          });
        }}
      >
        <input name="name" required placeholder="Plan name" aria-label="Plan name" className={`${field} sm:col-span-2`} />
        <label className="grid gap-1 text-sm font-semibold">
          Starts <input name="start" type="date" required className={field} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Ends <input name="end" type="date" required className={field} />
        </label>
        {error && <p role="alert" className="font-semibold sm:col-span-2">{error}</p>}
        <button type="submit" className="btn bg-mint sm:col-span-2" disabled={pending}>
          Create plan
        </button>
      </form>
    </details>
  );
}
