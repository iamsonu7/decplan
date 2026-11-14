import { requireUser, signOut } from "@/auth";
import { CaptureBox, CaptureButton } from "@/components/CaptureBox";
import { Nav } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const email = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-3 border-b-[1.5px] border-ink bg-lilac p-4 md:sticky md:top-0 md:h-screen md:w-60 md:overflow-y-auto md:border-b-0 md:border-r-[1.5px]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xl font-extrabold">Journey HQ</div>
          <form action="/search" className="min-w-0 flex-1 md:hidden">
            <input type="search" name="q" placeholder="Search…" aria-label="Search everything" className="w-full rounded-lg border-[1.5px] border-ink bg-paper px-3 py-1.5" />
          </form>
        </div>
        <form action="/search" className="hidden md:block">
          <input type="search" name="q" placeholder="Search everything…" aria-label="Search everything" className="w-full rounded-lg border-[1.5px] border-ink bg-paper px-3 py-1.5" />
        </form>
        <CaptureButton className="btn w-full justify-between bg-mint py-2">
          <span>Capture</span>
          <kbd className="hidden text-sm font-semibold md:inline">Ctrl K</kbd>
        </CaptureButton>
        <Nav />
        <form
          className="mt-auto hidden md:block"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <p className="truncate text-sm text-muted" title={email}>
            {email}
          </p>
          <button type="submit" className="mt-1 text-sm font-semibold underline">
            Sign out
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-10">{children}</main>
      <CaptureBox />
    </div>
  );
}
