// One generic page for every simple database: /tasks, /outreach, /contacts, /deliverables, /learning
import { notFound } from "next/navigation";
import { requireUser } from "@/auth";
import { DataTable } from "@/components/DataTable";
import { getTableConfig, isTableKey } from "@/lib/tables/config";
import { listRows } from "@/lib/tables/server";

export default async function TablePage({ params, searchParams }: { params: Promise<{ page: string }>; searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const { page } = await params;
  if (!isTableKey(page) || !getTableConfig(page).page) notFound();
  const config = getTableConfig(page);
  const { q } = await searchParams;
  const rows = await listRows(page);

  return (
    <div>
      <h1 className="text-4xl font-extrabold">{config.label}</h1>
      <div className="mt-6">
        <DataTable tableKey={page} singular={config.singular} columns={config.columns} rows={rows} boardBy={config.boardBy} initialSearch={q} />
      </div>
    </div>
  );
}
