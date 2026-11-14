"use client";
// Table and board views for one database page, with filters, sorting and inline editing.
import { useMemo, useState, useTransition } from "react";
import { createRow, deleteRow, restoreRow, updateCell } from "@/app/actions";
import type { Column } from "@/lib/tables/config";

type Row = { id: string } & Record<string, unknown>;
const PILL_COLOURS = ["bg-sky", "bg-butter", "bg-mint", "bg-lilac", "bg-peach"];

function pillColour(col: Column, value: unknown) {
  const i = col.options?.indexOf(String(value)) ?? -1;
  return i < 0 ? "bg-paper" : PILL_COLOURS[i % PILL_COLOURS.length];
}

function asText(v: unknown): string {
  if (v == null) return "";
  return Array.isArray(v) ? v.join(", ") : String(v);
}

export function DataTable(props: {
  tableKey: string;
  singular: string;
  columns: Column[];
  rows: Row[];
  boardBy?: string;
  initialSearch?: string;
}) {
  const { tableKey, columns, rows } = props;
  const boardCol = columns.find((c) => c.key === props.boardBy);
  const selectCols = columns.filter((c) => c.type === "select");

  const [view, setView] = useState<"table" | "board">("table");
  const [search, setSearch] = useState(props.initialSearch ?? "");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [message, setMessage] = useState<{ text: string; undoId?: string } | null>(null);
  const [pending, start] = useTransition();

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter(
      (r) =>
        (!q || columns.some((c) => asText(r[c.key]).toLowerCase().includes(q))) &&
        Object.entries(filters).every(([k, v]) => !v || r[k] === v),
    );
    if (sort) {
      out = [...out].sort((a, b) => {
        const x = a[sort.key];
        const y = b[sort.key];
        if (x == null || x === "") return 1; // empty values always last
        if (y == null || y === "") return -1;
        if (typeof x === "number" && typeof y === "number") return (x - y) * sort.dir;
        return asText(x).localeCompare(asText(y), undefined, { numeric: true }) * sort.dir;
      });
    }
    return out;
  }, [rows, columns, search, filters, sort]);

  function save(id: string, col: Column, value: unknown) {
    start(async () => {
      const res = await updateCell(tableKey, id, col.key, value);
      setMessage(res.ok ? null : { text: res.error });
    });
  }

  function add(values: Record<string, unknown> = {}) {
    start(async () => {
      const res = await createRow(tableKey, values);
      setMessage(res.ok ? null : { text: res.error });
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteRow(tableKey, id);
      setMessage(res.ok ? { text: `Moved to Trash.`, undoId: id } : { text: res.error });
    });
  }

  // A plain function (not a component) so inputs keep focus while other cells save.
  function cell(row: Row, col: Column) {
    const value = row[col.key];
    const common = "w-full rounded-md bg-transparent px-2 py-1.5 outline-none focus:bg-paper focus:ring-2 focus:ring-ink";
    // The key makes the input reset when the saved value changes.
    const key = `${row.id}:${col.key}:${asText(value)}`;
    const blurSave = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.target.value !== asText(value)) save(row.id, col, e.target.value);
    };
    switch (col.type) {
      case "checkbox":
        return (
          <input
            key={key}
            type="checkbox"
            aria-label={col.label}
            className="mx-2 size-4 accent-ink"
            defaultChecked={value === true}
            onChange={(e) => save(row.id, col, e.target.checked)}
          />
        );
      case "select":
        return (
          <select
            key={key}
            aria-label={col.label}
            className={`pill cursor-pointer ${pillColour(col, value)}`}
            defaultValue={asText(value)}
            onChange={(e) => save(row.id, col, e.target.value)}
          >
            {col.options?.map((o) => <option key={o}>{o}</option>)}
          </select>
        );
      case "date":
        return <input key={key} type="date" aria-label={col.label} className={common} defaultValue={asText(value)} onChange={(e) => save(row.id, col, e.target.value)} />;
      case "number":
        return <input key={key} type="number" min={0} step={0.25} aria-label={col.label} className={`${common} w-20`} defaultValue={asText(value)} onBlur={blurSave} />;
      case "longtext":
        return <textarea key={key} rows={1} aria-label={col.label} className={`${common} min-w-56 resize-none [field-sizing:content]`} defaultValue={asText(value)} onBlur={blurSave} />;
      case "url":
        return (
          <span className="flex items-center gap-1">
            <input key={key} type="url" placeholder="https://" aria-label={col.label} className={`${common} min-w-48`} defaultValue={asText(value)} onBlur={blurSave} />
            {typeof value === "string" && value && (
              <a href={value} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-semibold underline">
                Open
              </a>
            )}
          </span>
        );
      default:
        return (
          <input
            key={key}
            type="text"
            aria-label={col.label}
            className={`${common} ${col.required ? "min-w-44 font-semibold" : "min-w-32"}`}
            defaultValue={asText(value)}
            onBlur={blurSave}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        );
    }
  }

  const titleCol = columns[0];
  const cardCols = columns.filter((c) => c !== titleCol && c !== boardCol && c.type !== "longtext" && c.type !== "checkbox").slice(0, 3);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn bg-mint" onClick={() => add()} disabled={pending}>
          + New {props.singular}
        </button>
        <input
          type="search"
          placeholder="Filter…"
          aria-label="Filter rows"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-[10px] border-[1.5px] border-ink bg-paper px-3 py-2"
        />
        {selectCols.map((c) => (
          <select
            key={c.key}
            aria-label={`Filter by ${c.label}`}
            value={filters[c.key] ?? ""}
            onChange={(e) => setFilters({ ...filters, [c.key]: e.target.value })}
            className="rounded-[10px] border-[1.5px] border-ink bg-paper px-3 py-2"
          >
            <option value="">{c.label}: all</option>
            {c.options?.map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
        {boardCol && (
          <div className="ml-auto flex overflow-hidden rounded-[10px] border-[1.5px] border-ink">
            {(["table", "board"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`px-3 py-2 font-semibold capitalize ${view === v ? "bg-lilac" : "bg-paper"}`}>
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {message && (
        <p role="status" className="mt-4 flex items-center gap-3 rounded-lg border-[1.5px] border-ink bg-butter px-3 py-2 font-semibold">
          {message.text}
          {message.undoId && (
            <button
              type="button"
              className="underline"
              onClick={() => {
                const id = message.undoId!;
                start(async () => {
                  await restoreRow(tableKey, id);
                  setMessage(null);
                });
              }}
            >
              Undo
            </button>
          )}
        </p>
      )}

      <p className="mt-4 text-sm text-muted">
        {visible.length} of {rows.length} shown{pending ? " · saving…" : ""}
      </p>

      {view === "table" || !boardCol ? (
        <div className="card mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-[1.5px] border-ink bg-sky">
                {columns.map((c) => (
                  <th key={c.key} className="whitespace-nowrap px-2 py-2">
                    <button
                      type="button"
                      className="px-2 font-bold"
                      title="Sort"
                      onClick={() => setSort(sort?.key === c.key ? (sort.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 })}
                    >
                      {c.label}
                      {sort?.key === c.key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-b border-ink/15 last:border-b-0 hover:bg-cream">
                  {columns.map((c) => (
                    <td key={c.key} className="px-2 py-1 align-top">
                      {cell(row, c)}
                    </td>
                  ))}
                  <td className="px-2 py-1 align-top">
                    <button type="button" title="Move to Trash" aria-label="Move to Trash" className="rounded-md px-2 py-1.5 text-muted hover:bg-peach hover:text-ink" onClick={() => remove(row.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-muted">
                    {rows.length === 0 ? `Nothing here yet. Click "+ New ${props.singular}" to add one.` : "Nothing matches the filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-2 flex gap-4 overflow-x-auto pb-3">
          {boardCol.options?.map((option) => {
            const items = visible.filter((r) => r[boardCol.key] === option);
            return (
              <section
                key={option}
                className="w-64 shrink-0 rounded-[14px] border-[1.5px] border-ink bg-paper p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) save(id, boardCol, option);
                }}
              >
                <h3 className="flex items-center justify-between">
                  <span className={`pill ${pillColour(boardCol, option)}`}>{option}</span>
                  <span className="text-sm text-muted">{items.length}</span>
                </h3>
                <div className="mt-3 grid gap-3">
                  {items.map((row) => (
                    <article key={row.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", row.id)} className="card cursor-grab p-3">
                      <p className="font-bold">{asText(row[titleCol.key]) || "Untitled"}</p>
                      {cardCols.map((c) => asText(row[c.key]) && <p key={c.key} className="truncate text-sm text-muted">{asText(row[c.key])}</p>)}
                      <select
                        aria-label={`Move to another ${boardCol.label.toLowerCase()}`}
                        className="mt-2 w-full rounded-md border border-ink/40 bg-paper px-1 py-1 text-sm"
                        value={option}
                        onChange={(e) => save(row.id, boardCol, e.target.value)}
                      >
                        {boardCol.options?.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </article>
                  ))}
                  <button type="button" className="rounded-lg border border-dashed border-ink/50 py-2 text-sm font-semibold text-muted hover:bg-cream" onClick={() => add({ [boardCol.key]: option })}>
                    + Add
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
