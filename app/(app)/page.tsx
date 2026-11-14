import { sql } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db } from "@/lib/db";
import { GOOGLE_SCOPES, missingScopes } from "@/lib/google/scopes";
import { getConnection, getGoogleAccessToken } from "@/lib/google/token";

// Step 1 status page. It becomes the real Today page in step 2.
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
    <div className="card flex items-start gap-4 p-5">
      <span className={`pill ${ok ? "bg-mint" : "bg-peach"}`}>{ok ? "OK" : "Fix"}</span>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-muted">{detail}</p>
      </div>
    </div>
  );
}

export default async function TodayPage() {
  const email = await requireUser();
  const c = await checks(email);

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-extrabold">Today</h1>
      <p className="mt-2 text-muted">Step 1 is in place: sign-in and database. The pages arrive in step 2.</p>

      <div className="mt-8 grid gap-5">
        <Status ok title="Signed in" detail={email} />
        <Status
          ok={!c.dbError && c.tables > 0}
          title="Database"
          detail={c.dbError ? `Cannot reach the database: ${c.dbError}` : c.tables > 0 ? `${c.tables} tables found` : "Connected, but no tables. Run: npm run db:migrate"}
        />
        <Status
          ok={c.tokenOk}
          title="Google connection"
          detail={c.tokenOk ? "Refresh token stored encrypted and working" : c.tokenError ?? "Not checked because the database is unreachable"}
        />
        <Status
          ok={c.tokenOk && c.missing.length === 0}
          title="Google permissions"
          detail={
            c.missing.length === 0 && c.tokenOk
              ? `All ${GOOGLE_SCOPES.length} permissions granted`
              : `Missing: ${c.missing.join(", ") || "unknown"}. Sign out, sign in again and tick every box.`
          }
        />
      </div>
    </div>
  );
}
