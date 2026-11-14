"use client";
// Small interactive pieces of the Today page.
import { useState, useTransition } from "react";
import { createRow, updateCell, type ActionResult } from "@/app/actions";
import { toggleItem } from "@/app/(app)/plan/actions";

const field = "rounded-[10px] border-[1.5px] border-ink bg-paper px-3 py-2";

function useAct() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const act = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      setError(res.ok ? null : res.error);
      if (res.ok) after?.();
    });
  return { pending, error, act };
}

export function PlanTick({ id, title, done }: { id: string; title: string; done: boolean }) {
  const { act } = useAct();
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2">
      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-ink" key={String(done)} defaultChecked={done} onChange={(e) => act(() => toggleItem(id, e.target.checked))} />
      <span className={done ? "text-muted line-through" : ""}>{title}</span>
    </label>
  );
}

export function TaskTick({ id, title, note }: { id: string; title: string; note?: string }) {
  const { act } = useAct();
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2">
      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-ink" onChange={() => act(() => updateCell("tasks", id, "status", "done"))} />
      <span>
        {title}
        {note && <span className="ml-2 text-sm font-semibold text-muted">{note}</span>}
      </span>
    </label>
  );
}

export function QuickTask({ today }: { today: string }) {
  const { pending, error, act } = useAct();
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const d = new FormData(form);
        act(() => createRow("tasks", { title: d.get("title"), dueDate: d.get("due") }), () => form.reset());
      }}
    >
      <input name="title" required placeholder="Add a task…" aria-label="New task" className={`${field} min-w-40 flex-1`} />
      <input name="due" type="date" defaultValue={today} aria-label="Due date" className={field} />
      <button type="submit" className="btn bg-sky" disabled={pending}>
        Add
      </button>
      {error && <p role="alert" className="w-full font-semibold">{error}</p>}
    </form>
  );
}

export function QuickLog({ today }: { today: string }) {
  const { pending, error, act } = useAct();
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const d = new FormData(form);
        act(() => createRow("learning", { date: today, topic: d.get("topic"), hours: d.get("hours") }), () => form.reset());
      }}
    >
      <input name="topic" required placeholder="What did you work on?" aria-label="Topic" className={`${field} min-w-40 flex-1`} />
      <input name="hours" type="number" min={0.25} max={24} step={0.25} required placeholder="Hours" aria-label="Hours" className={`${field} w-24`} />
      <button type="submit" className="btn bg-mint" disabled={pending}>
        Log
      </button>
      {error && <p role="alert" className="w-full font-semibold">{error}</p>}
    </form>
  );
}
