// Database side of the capture bot: files items, undoes them, answers data queries.
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { captures, inboxItems, outreach, type FiledRef, type OutreachStatus } from "@/lib/db/schema";
import { htmlToText } from "@/lib/html";
import { TABLE_CONFIG, type TableKey } from "@/lib/tables/config";
import { anyTable } from "@/lib/tables/server";
import { toRow, type Item } from "./items";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (ch) => `\\${ch}`);

// Finds the outreach row a firm name refers to, tolerating small differences.
async function findOutreach(firm: string) {
  const name = firm.trim();
  if (name.length < 2) return null;
  const [row] = await db
    .select()
    .from(outreach)
    .where(and(isNull(outreach.deletedAt), or(ilike(outreach.firm, `%${escapeLike(name)}%`), sql`${name} ilike '%' || ${outreach.firm} || '%'`)))
    .orderBy(desc(outreach.updatedAt))
    .limit(1);
  return row ?? null;
}

// Files one item and returns a record of what was done, enough to undo it later.
export async function fileItem(item: Item, today: string, captureId: string | null): Promise<FiledRef> {
  const plan = toRow(item, today);
  const base = { type: item.type, label: plan.label, source: item };

  if (plan.table === "inbox") {
    const [row] = await db.insert(inboxItems).values({ captureId, rawText: String(plan.values.rawText), question: String(plan.values.question) }).returning({ id: inboxItems.id });
    return { ...base, table: "inbox", id: row.id, action: "created" };
  }

  if (plan.table === "outreach") {
    const v = plan.values as { firm: string; person: string | null; email: string | null; status: OutreachStatus | null; note: string };
    const line = `[${today}] ${v.note}`;
    const existing = await findOutreach(v.firm);
    if (existing) {
      await db
        .update(outreach)
        .set({ status: v.status ?? existing.status, notes: existing.notes ? `${existing.notes}\n${line}` : line })
        .where(eq(outreach.id, existing.id));
      return { ...base, table: "outreach", id: existing.id, action: "updated", label: `${existing.firm}${v.status ? `: ${v.status}` : ": note added"}`, previous: { status: existing.status, notes: existing.notes } };
    }
    const [row] = await db
      .insert(outreach)
      .values({ firm: v.firm, person: v.person, email: v.email, status: v.status ?? "to send", notes: line })
      .returning({ id: outreach.id });
    return { ...base, table: "outreach", id: row.id, action: "created", label: `${v.firm} (new row)` };
  }

  const t = anyTable(plan.table as TableKey);
  const [row] = await db.insert(t).values(plan.values).returning({ id: t.id });
  return { ...base, table: plan.table, id: row.id as string, action: "created" };
}

// Reverses a filing: a created row goes to the Trash, an updated row gets its old values back.
export async function undoFiled(ref: FiledRef): Promise<void> {
  if (ref.action === "updated" && ref.previous) {
    await db.update(outreach).set({ status: ref.previous.status as OutreachStatus, notes: ref.previous.notes }).where(eq(outreach.id, ref.id));
    return;
  }
  const t = anyTable(ref.table as TableKey);
  await db.update(t).set({ deletedAt: new Date() }).where(eq(t.id, ref.id));
}

export async function outreachFirms(): Promise<string[]> {
  const rows = await db.select({ firm: outreach.firm }).from(outreach).where(isNull(outreach.deletedAt)).orderBy(desc(outreach.updatedAt)).limit(100);
  return [...new Set(rows.map((r) => r.firm))];
}

// Answers the bot's query_data tool: a small, compact slice of one table.
export async function runQuery(table: string, search: string | null): Promise<unknown> {
  const key = (table === "plan_items" ? "planItems" : table) as TableKey;
  const config = TABLE_CONFIG[key];
  const t = anyTable(key);
  const textCols = config.columns.filter((c) => ["text", "longtext", "select"].includes(c.type)).map((c) => c.key);
  const hasBody = key === "notes" || key === "opportunities";
  const pattern = search ? `%${escapeLike(search)}%` : null;
  const match = pattern ? or(...textCols.map((c) => sql`${t[c]} ilike ${pattern}`), ...(hasBody ? [sql`${t.body} ilike ${pattern}`] : [])) : undefined;

  const rows: Record<string, unknown>[] = await db
    .select()
    .from(t)
    .where(and(isNull(t.deletedAt), match))
    .orderBy(key === "planItems" ? t.date : desc(t.updatedAt))
    .limit(40);

  const short = (v: unknown) => (typeof v === "string" && v.length > 200 ? `${v.slice(0, 200)}…` : v);
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const c of config.columns) if (r[c.key] !== null && r[c.key] !== "" && r[c.key] !== false) out[c.key] = short(r[c.key]);
    if (hasBody) out.text = htmlToText(String(r.body ?? "")).slice(0, 300);
    if (key === "planItems") out.done = r.doneAt !== null;
    return out;
  });
}

export async function saveCapture(rawText: string, reply: string, refs: FiledRef[], id?: string): Promise<string> {
  if (id) {
    await db.update(captures).set({ reply, createdItems: refs }).where(eq(captures.id, id));
    return id;
  }
  const [row] = await db.insert(captures).values({ rawText, reply, createdItems: refs }).returning({ id: captures.id });
  return row.id;
}
