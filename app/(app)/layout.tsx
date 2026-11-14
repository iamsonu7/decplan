import Link from "next/link";
import { requireUser, signOut } from "@/auth";

// Pages are added to this list as each build step lands.
const NAV = [{ href: "/", label: "Today" }];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const email = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-row items-center gap-4 border-b-[1.5px] border-ink bg-lilac p-4 md:w-60 md:flex-col md:items-stretch md:border-b-0 md:border-r-[1.5px]">
        <div className="text-xl font-extrabold">Journey HQ</div>
        <nav className="flex flex-1 flex-row gap-2 md:flex-col">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 font-semibold hover:bg-paper">
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <p className="hidden truncate text-sm text-muted md:block" title={email}>
            {email}
          </p>
          <button type="submit" className="mt-1 text-sm font-semibold underline">
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
