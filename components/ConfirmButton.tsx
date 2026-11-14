"use client";
// A button that opens a dialog describing the exact action before doing it.
import { useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions";

export function ConfirmButton(props: {
  label: string;
  title: string; // e.g. "Delete this contact permanently?"
  detail: string; // the exact content affected
  confirmLabel: string;
  action: () => Promise<ActionResult>;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button type="button" className={props.className ?? "text-sm font-semibold underline"} onClick={() => ref.current?.showModal()}>
        {props.label}
      </button>
      <dialog ref={ref} className="card m-auto w-[min(92vw,28rem)] p-6 backdrop:bg-ink/30">
        <h2 className="text-xl font-extrabold">{props.title}</h2>
        <p className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border-[1.5px] border-ink bg-cream p-3 text-sm">{props.detail}</p>
        {error && <p role="alert" className="mt-3 font-semibold">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn bg-paper" onClick={() => ref.current?.close()}>
            Cancel
          </button>
          <button
            type="button"
            className="btn bg-peach"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await props.action();
                if (res.ok) ref.current?.close();
                else setError(res.error);
              })
            }
          >
            {pending ? "Working…" : props.confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
