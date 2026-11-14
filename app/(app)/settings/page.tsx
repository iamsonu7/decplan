import Link from "next/link";
import { sql } from "drizzle-orm";
import { requireUser, signOut } from "@/auth";
import { db } from "@/lib/db";
import { GOOGLE_SCOPES, missingScopes } from "@/lib/google/scopes";
import { getConnection, getGoogleAccessToken } from "@/lib/google/token";
import { TABLE_CONFIG } from "@/lib/tables/config";

async function checks(email: string) {
  let tables = 0;
  let dbError: string | null = null;
  try {
    const res = await db.execute(sql`select count(*)::int as n from information_schema.tables where table_schema = 'public'`);
    tables = Number(res.rows[0]?.n ?? 0);
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Unknown error";
  }
  let tokenOk = false;
  let tokenError: string | null = null;
  let missing: string[] = [];
  if (!dbError) {
    try {
      const row = await getConnection(email);
      missing = missingScopes(row?.scopes ?? "");
      await getGoogleAccessToken(email); // proves the stored refresh token works
      tokenOk = true;
    } catch (e) {
      tokenError = e instanceof Error ? e.message : "Unknown error";
    }
  }
  return { tables, dbError, tokenOk, tokenError, missing };
}

function Status({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-4 py-3">
      <span className={`pill ${ok ? "bg-mint" : "bg-peach"}`}>{ok ? "OK" : "Fix"}</span>
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-muted">{detail}</p>
      </div>
    </div>
  );
}

const AUTOMATIC = ["Read Gmail, Drive, Docs, Sheets, Calendar", "Create items inside the app", "Create calendar events and Google Tasks", "Create new Docs and Sheets", "Create Gmail drafts"];
const ASK_FIRST = ["Send any email", "Edit or delete an existing Drive file", "Delete calendar events", "Run any Apps Script", "Delete anything in the app permanently"];

export default async function SettingsPage() {
  const email = await requireUser();
  const c = await checks(email);
  const exportable = Object.entries(TABLE_CONFIG);

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-extrabold">Settings</h1>

      <section className="card mt-6 p-5">
        <h2 className="text-xl font-extrabold">Connections</h2>
        <div className="mt-2 divide-y divide-ink/15">
          <Status ok title="Signed in" detail={email} />
          <form
            className="py-3"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button type="submit" className="font-semibold underline">
              Sign out
            </button>
          </form>
          <Status
            ok={!c.dbError && c.tables > 0}
            title="Database"
            detail={c.dbError ? `Cannot reach the database: ${c.dbError}` : c.tables > 0 ? `${c.tables} tables found` : "Connected, but no tables. Run: npm run db:migrate"}
          />
          <Status ok={c.tokenOk} title="Google connection" detail={c.tokenOk ? "Refresh token stored encrypted and working" : c.tokenError ?? "Not checked because the database is unreachable"} />
          <Status
            ok={c.tokenOk && c.missing.length === 0}
            title="Google permissions"
            detail={c.missing.length === 0 && c.tokenOk ? `All ${GOOGLE_SCOPES.length} permissions granted` : `Missing: ${c.missing.join(", ") || "unknown"}. Sign out, sign in again and tick every box.`}
          />
        </div>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-xl font-extrabold">Google permissions the app holds</h2>
        <ul className="mt-3 grid gap-2">
          {GOOGLE_SCOPES.map((s) => (
            <li key={s.scope}>
              <span className="font-semibold">{s.label}:</span> <span className="text-muted">{s.why}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-xl font-extrabold">What the bot may do</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border-[1.5px] border-ink bg-mint p-4">
            <h3 className="font-bold">Automatic, no confirmation</h3>
            <ul className="mt-2 list-disc pl-5">
              {AUTOMATIC.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border-[1.5px] border-ink bg-peach p-4">
            <h3 className="font-bold">Always asks you first</h3>
            <ul className="mt-2 list-disc pl-5">
              {ASK_FIRST.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">The bot and the Google features arrive in the next build steps. These rules are fixed in the code.</p>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-xl font-extrabold">AI provider</h2>
        <p className="mt-2 text-muted">Set up in build step 3, with the capture bot. The monthly token and cost estimate will show here.</p>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-xl font-extrabold">Export your data</h2>
        <p className="mt-2 text-muted">Google sign-in tokens are never included.</p>
        <p className="mt-4">
          {/* A plain link on purpose: this downloads a file, it is not a page. */}
          <a href="/api/export?format=json" download className="btn bg-sky">
            Download everything as JSON
          </a>
        </p>
        <h3 className="mt-5 font-bold">CSV, one file per table</h3>
        <p className="mt-2 flex flex-wrap gap-2">
          {exportable.map(([key, t]) => (
            <a key={key} href={`/api/export?format=csv&table=${key}`} className="pill bg-paper hover:bg-butter">
              {t.label}
            </a>
          ))}
        </p>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-xl font-extrabold">Trash</h2>
        <p className="mt-2 text-muted">Deleted items stay in the Trash until you delete them permanently.</p>
        <p className="mt-3">
          <Link href="/trash" className="font-semibold underline">
            Open Trash
          </Link>
        </p>
      </section>
    </div>
  );
}
