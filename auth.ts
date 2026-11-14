// Sign in with Google. Only ALLOWED_EMAIL gets in; everyone else is rejected.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { isAllowedEmail } from "@/lib/allowed";
import { GOOGLE_SCOPE_STRING } from "@/lib/google/scopes";
import { saveGoogleTokens } from "@/lib/google/token";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Reads AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET and AUTH_SECRET from the environment.
  providers: [
    Google({
      authorization: {
        params: {
          scope: GOOGLE_SCOPE_STRING,
          access_type: "offline", // gives us a refresh token
          prompt: "consent", // makes Google send the refresh token every time
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/signin" },
  trustHost: true,
  callbacks: {
    async signIn({ account, profile }) {
      const email = profile?.email;
      if (account?.provider !== "google" || profile?.email_verified !== true || !isAllowedEmail(email)) {
        return false; // shows "AccessDenied" on the sign-in page
      }
      await saveGoogleTokens({
        email: email!.toLowerCase(),
        refreshToken: account.refresh_token,
        accessToken: account.access_token,
        expiresAt: account.expires_at,
        scopes: account.scope,
      });
      return true;
    },
  },
});

// Use at the top of every page, server action and route handler.
// Returns the signed-in email, or sends the visitor to the sign-in page.
export async function requireUser(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !isAllowedEmail(email)) redirect("/signin");
  return email;
}
