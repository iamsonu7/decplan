import { requireUser } from "@/auth";
import { TrashRow } from "@/components/TrashList";
import { TABLE_CONFIG, type TableKey } from "@/lib/tables/config";
import { listRows } from "@/lib/tables/server";

export default async function TrashPage() {
  await requireUser();
  const keys = Object.keys(TABLE_CONFIG) as TableKey[];
  const groups = await Promise.all(keys.map(async (key) => ({ key, config: TABLE_CONFIG[key], rows: await listRows(key, { deleted: true }) })));
  const filled = groups.filter((g) => g.rows.length > 0);

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-extrabold">Trash</h1>
      <p className="mt-2 text-muted">Restore an item, or delete it permanently. Permanent deletion always asks first.</p>
      {filled.length === 0 && <p className="card mt-6 p-5 text-muted">The Trash is empty.</p>}
      {filled.map((g) => (
        <section key={g.key} className="card mt-6 p-5">
          <h2 className="text-xl font-extrabold">{g.config.label}</h2>
          <ul className="mt-2 divide-y divide-ink/15">
            {g.rows.map((row) => {
              const cols = g.config.columns;
              const title = String(row[cols[0].key] ?? "Untitled");
              const detail = cols
                .map((c) => [c.label, row[c.key]] as const)
                .filter(([, v]) => v !== null && v !== "" && v !== false)
                .map(([label, v]) => `${label}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
                .join("\n");
              return <TrashRow key={row.id} tableKey={g.key} id={row.id} title={title} detail={detail} singular={g.config.singular} />;
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
