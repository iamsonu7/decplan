"use client";
import { useTransition } from "react";
import { deleteForever, restoreRow } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";

export function TrashRow({ tableKey, id, title, detail, singular }: { tableKey: string; id: string; title: string; detail: string; singular: string }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-wrap items-center gap-3 py-2">
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <button type="button" className="text-sm font-semibold underline" disabled={pending} onClick={() => start(async () => void (await restoreRow(tableKey, id)))}>
        Restore
      </button>
      <ConfirmButton
        label="Delete permanently"
        title={`Delete this ${singular} permanently?`}
        detail={`${detail}\n\nThis cannot be undone.`}
        confirmLabel="Delete permanently"
        action={() => deleteForever(tableKey, id)}
      />
    </li>
  );
}
