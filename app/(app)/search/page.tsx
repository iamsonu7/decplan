import Link from "next/link";
import { requireUser } from "@/auth";
import { searchAll } from "@/lib/search";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const { q = "" } = await searchParams;
  const hits = await searchAll(q);
  const groups = [...new Set(hits.map((h) => h.label))];

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-extrabold">Search</h1>
      <form className="mt-6 flex gap-2">
        <input type="search" name="q" defaultValue={q} autoFocus placeholder="Search everything…" aria-label="Search everything" className="min-w-0 flex-1 rounded-[10px] border-[1.5px] border-ink bg-paper px-3 py-2" />
        <button type="submit" className="btn bg-sky">
          Search
        </button>
      </form>
      {q.trim().length >= 2 && hits.length === 0 && <p className="mt-6 text-muted">Nothing found for &quot;{q}&quot;.</p>}
      {q.trim().length === 1 && <p className="mt-6 text-muted">Type at least 2 characters.</p>}
      {groups.map((label) => (
        <section key={label} className="card mt-6 p-5">
          <h2 className="text-xl font-extrabold">{label}</h2>
          <ul className="mt-2 divide-y divide-ink/15">
            {hits.filter((h) => h.label === label).map((h) => (
              <li key={h.id} className="py-2">
                <Link href={h.href} className="font-semibold underline">
                  {h.title}
                </Link>
                {h.snippet && <p className="truncate text-sm text-muted">{h.snippet}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
