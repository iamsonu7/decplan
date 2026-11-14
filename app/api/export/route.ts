// Downloads all app data as JSON, or one table as CSV. Google tokens are never exported.
import { auth } from "@/auth";
import { isAllowedEmail } from "@/lib/allowed";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { todayStr } from "@/lib/dates";
import { isTableKey } from "@/lib/tables/config";
import { anyTable } from "@/lib/tables/server";

const EVERYTHING = {
  plans: s.plans,
  planBlocks: s.planBlocks,
  planItems: s.planItems,
  tasks: s.tasks,
  outreach: s.outreach,
  contacts: s.contacts,
  notes: s.notes,
  opportunities: s.opportunities,
  deliverables: s.deliverables,
  learningLog: s.learningLog,
  weeklyReviews: s.weeklyReviews,
  captures: s.captures,
  inboxItems: s.inboxItems,
  activityLog: s.activityLog,
  aiUsage: s.aiUsage,
  settings: s.settings,
};

export async function GET(request: Request) {
  const session = await auth();
  if (!isAllowedEmail(session?.user?.email)) return new Response("Not signed in", { status: 401 });

  const url = new URL(request.url);
  const stamp = todayStr();

  if (url.searchParams.get("format") === "csv") {
    const key = url.searchParams.get("table") ?? "";
    if (!isTableKey(key)) return new Response("Unknown table", { status: 400 });
    const rows = (await db.select().from(anyTable(key))) as Record<string, unknown>[];
    return new Response(toCsv(rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="journey-hq-${key}-${stamp}.csv"` },
    });
  }

  const data: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  for (const [name, table] of Object.entries(EVERYTHING)) data[name] = await db.select().from(table);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="journey-hq-${stamp}.json"` },
  });
}
