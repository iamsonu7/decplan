"use client";
import { useState, useTransition } from "react";
import { deleteRow } from "@/app/actions";
import { fileInboxItem } from "@/app/inbox-actions";
import { ITEM_TYPES, TYPE_INFO } from "@/lib/capture/items";

export function InboxRow({ id, rawText, question }: { id: string; rawText: string; question: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <li className="py-3">
      <p className="font-semibold">{rawText}</p>
      {question && <p className="text-muted">Bot asked: {question}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          File as
          <select
            aria-label="File as"
            className="rounded-md border-[1.5px] border-ink bg-paper px-2 py-1"
            defaultValue=""
            disabled={pending}
            onChange={(e) => {
              const type = e.target.value;
              if (type)
                start(async () => {
                  const res = await fileInboxItem(id, type);
                  setError(res.ok ? null : res.error);
                });
            }}
          >
            <option value="">Choose…</option>
            {ITEM_TYPES.filter((t) => t !== "inbox").map((t) => (
              <option key={t} value={t}>
                {TYPE_INFO[t].label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="underline" disabled={pending} onClick={() => start(async () => void (await deleteRow("inbox", id)))}>
          Move to Trash
        </button>
        {error && <span role="alert" className="font-semibold">{error}</span>}
      </div>
    </li>
  );
}
