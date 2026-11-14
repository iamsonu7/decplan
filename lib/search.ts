// Global search: looks for the text in every table.
import { htmlToText } from "@/lib/html";
import { TABLE_CONFIG, type TableKey } from "@/lib/tables/config";
import { anyTable } from "@/lib/tables/server";
import { db } from "@/lib/db";
import { and, isNull, or, sql } from "drizzle-orm";

export type SearchHit = { table: TableKey; label: string; id: string; title: string; snippet: string; href: string };

const BODY_TABLES: TableKey[] = ["notes", "opportunities"];

export async function searchAll(query: string): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  // Escape the characters that have a special meaning in a LIKE pattern.
  const pattern = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
  const hits: SearchHit[] = [];

  for (const key of Object.keys(TABLE_CONFIG) as TableKey[]) {
    const config = TABLE_CONFIG[key];
    const t = anyTable(key);
    const textCols = config.columns.filter((c) => ["text", "longtext", "url", "select"].includes(c.type)).map((c) => c.key);
    const conditions = textCols.map((c) => sql`${t[c]} ilike ${pattern}`);
    if (BODY_TABLES.includes(key)) conditions.push(sql`${t.body} ilike ${pattern}`, sql`array_to_string(${t.tags}, ' ') ilike ${pattern}`);
    const rows: Record<string, unknown>[] = await db.select().from(t).where(and(isNull(t.deletedAt), or(...conditions))).limit(20);

    for (const row of rows) {
      const title = String(row[config.columns[0].key] ?? "Untitled");
      const rest = BODY_TABLES.includes(key)
        ? htmlToText(String(row.body ?? ""))
        : textCols.slice(1).map((c) => row[c]).filter(Boolean).join(" · ");
      const id = String(row.id);
      const href = BODY_TABLES.includes(key) ? `${config.href}/${id}` : key === "planItems" ? `/plan?plan=${row.planId}` : `${config.href}?q=${encodeURIComponent(title)}`;
      hits.push({ table: key, label: config.label, id, title, snippet: rest.slice(0, 160), href });
    }
  }
  return hits;
}
