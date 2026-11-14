// Server side of the table registry: maps each table key to its database table.
import { desc, isNotNull, isNull } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { getTableConfig, type TableKey } from "./config";

export const DB_TABLES = {
  tasks: s.tasks,
  outreach: s.outreach,
  contacts: s.contacts,
  deliverables: s.deliverables,
  learning: s.learningLog,
  notes: s.notes,
  opportunities: s.opportunities,
  planItems: s.planItems,
} satisfies Record<TableKey, PgTable>;

export type Row = { id: string } & Record<string, unknown>;

// The generic helpers below work on any table in the registry, so the exact
// column types are not known here. Values are validated by coerceValue first.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function anyTable(key: TableKey): any {
  return DB_TABLES[key];
}

// Rows for a table page: only the configured columns, newest first.
export async function listRows(key: TableKey, opts: { deleted?: boolean } = {}): Promise<Row[]> {
  const t = anyTable(key);
  const rows = (await db
    .select()
    .from(t)
    .where(opts.deleted ? isNotNull(t.deletedAt) : isNull(t.deletedAt))
    .orderBy(desc(t.createdAt))) as Row[];
  const keys = getTableConfig(key).columns.map((c) => c.key);
  return rows.map((r) => Object.fromEntries([["id", r.id], ...keys.map((k) => [k, r[k] ?? null])]) as Row);
}
