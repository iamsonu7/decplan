// Shared list and editor pages for Notes and Opportunities.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/auth";
import { createDoc, type DocKind } from "@/app/doc-actions";
import { DocEditor } from "@/components/DocEditor";
import { db } from "@/lib/db";
import { notes, opportunities } from "@/lib/db/schema";
import { htmlToText } from "@/lib/html";

const META = {
  notes: { label: "Notes", singular: "note", href: "/notes", colour: "bg-butter" },
  opportunities: { label: "Opportunities", singular: "opportunity", href: "/opportunities", colour: "bg-mint" },
} as const;

async function load(kind: DocKind) {
  if (kind === "notes") {
    const rows = await db.select().from(notes).where(isNull(notes.deletedAt)).orderBy(desc(notes.updatedAt));
    return rows.map((r) => ({ ...r, status: undefined as string | undefined }));
  }
  return db.select().from(opportunities).where(isNull(opportunities.deletedAt)).orderBy(desc(opportunities.updatedAt));
}

export async function DocListPage({ kind, tag, q }: { kind: DocKind; tag?: string; q?: string }) {
  await requireUser();
  const meta = META[kind];
  const all = await load(kind);
  const tags = [...new Set(all.flatMap((d) => d.tags))].sort();
  const needle = q?.trim().toLowerCase();
  const docs = all.filter((d) => (!tag || d.tags.includes(tag)) && (!needle || `${d.title} ${htmlToText(d.body)}`.toLowerCase().includes(needle)));

  return (
    <div>
      <h1 className="text-4xl font-extrabold">{meta.label}</h1>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form
          action={async () => {
            "use server";
            const res = await createDoc(kind);
            if (res.ok) redirect(`${META[kind].href}/${res.id}`);
          }}
        >
          <button type="submit" className="btn bg-mint">
            + New {meta.singular}
          </button>
        </form>
        <form className="flex gap-2">
          {tag && <input type="hidden" name="tag" value={tag} />}
          <input type="search" name="q" defaultValue={q} placeholder="Filter…" aria-label={`Filter ${meta.label.toLowerCase()}`} className="rounded-[10px] border-[1.5px] border-ink bg-paper px-3 py-2" />
        </form>
        <div className="flex flex-wrap gap-2">
          <Link href={meta.href} className={`pill ${tag ? "bg-paper" : "bg-lilac"}`}>
            all
          </Link>
          {tags.map((t) => (
            <Link key={t} href={`${meta.href}?tag=${encodeURIComponent(t)}`} className={`pill ${tag === t ? "bg-lilac" : "bg-paper"}`}>
              {t}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {docs.map((d) => (
          <Link key={d.id} href={`${meta.href}/${d.id}`} className="card block p-5 hover:translate-x-px hover:translate-y-px">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{d.title}</h2>
              {d.status && <span className={`pill shrink-0 ${meta.colour}`}>{d.status}</span>}
            </div>
            <p className="mt-2 line-clamp-3 text-muted">{htmlToText(d.body) || "Empty"}</p>
            {d.tags.length > 0 && (
              <p className="mt-3 flex flex-wrap gap-1">
                {d.tags.map((t) => (
                  <span key={t} className="pill bg-cream">
                    {t}
                  </span>
                ))}
              </p>
            )}
          </Link>
        ))}
        {docs.length === 0 && <p className="text-muted">{all.length === 0 ? `Nothing here yet. Click "+ New ${meta.singular}".` : "Nothing matches."}</p>}
      </div>
    </div>
  );
}

export async function DocEditPage({ kind, id }: { kind: DocKind; id: string }) {
  await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const table = kind === "notes" ? notes : opportunities;
  const [row] = await db.select().from(table).where(and(eq(table.id, id), isNull(table.deletedAt)));
  if (!row) notFound();
  const status = "status" in row ? (row.status as string) : undefined;
  return <DocEditor kind={kind} listHref={META[kind].href} doc={{ id: row.id, title: row.title, body: row.body, tags: row.tags, status }} />;
}
