import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { isAllowedEmail } from "@/lib/allowed";

const ERRORS: Record<string, string> = {
  AccessDenied: "That Google account is not allowed to use this app.",
  Configuration: "Sign-in is not set up correctly. Check the environment variables in SETUP.md.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (isAllowedEmail(session?.user?.email)) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        <span className="pill bg-mint">Private</span>
        <h1 className="mt-4 text-4xl font-extrabold">Journey HQ</h1>
        <p className="mt-2 text-muted">Your career command centre. One account only.</p>

        {error && (
          <p role="alert" className="mt-6 rounded-lg border-[1.5px] border-ink bg-peach p-3 font-semibold">
            {ERRORS[error] ?? "Sign-in failed. Please try again."}
          </p>
        )}

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="btn w-full" type="submit">
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
