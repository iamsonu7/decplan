// Stores the Google tokens (encrypted) and hands out a fresh access token.
// Every Google API call in the app should get its token from getGoogleAccessToken().
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { googleTokens } from "@/lib/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";

export class GoogleNotConnectedError extends Error {
  constructor(message = "Google is not connected. Sign out and sign in again.") {
    super(message);
  }
}

export async function saveGoogleTokens(input: {
  email: string;
  refreshToken?: string | null;
  accessToken?: string | null;
  expiresAt?: number | null; // seconds since 1970
  scopes?: string | null;
}) {
  const access = input.accessToken ? encrypt(input.accessToken) : null;
  const expires = input.expiresAt ? new Date(input.expiresAt * 1000) : null;

  if (input.refreshToken) {
    const row = {
      email: input.email,
      refreshTokenEnc: encrypt(input.refreshToken),
      accessTokenEnc: access,
      accessTokenExpiresAt: expires,
      scopes: input.scopes ?? "",
      updatedAt: new Date(),
    };
    await db.insert(googleTokens).values(row).onConflictDoUpdate({ target: googleTokens.email, set: row });
    return;
  }

  // Google sent no refresh token this time: keep the one we already have.
  const updated = await db
    .update(googleTokens)
    .set({ accessTokenEnc: access, accessTokenExpiresAt: expires, updatedAt: new Date() })
    .where(eq(googleTokens.email, input.email))
    .returning({ email: googleTokens.email });
  if (updated.length === 0) {
    throw new GoogleNotConnectedError("Google did not send a refresh token. Remove the app's access in your Google account and sign in again.");
  }
}

export async function getConnection(email: string) {
  const [row] = await db.select().from(googleTokens).where(eq(googleTokens.email, email));
  return row ?? null;
}

export async function getGoogleAccessToken(email: string): Promise<string> {
  const row = await getConnection(email);
  if (!row) throw new GoogleNotConnectedError();

  // Reuse the stored access token if it is valid for at least another minute.
  if (row.accessTokenEnc && row.accessTokenExpiresAt && row.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
    return decrypt(row.accessTokenEnc);
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: decrypt(row.refreshTokenEnc),
    }),
    cache: "no-store",
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) {
    // "invalid_grant" means access was revoked or expired (7 days in Testing mode).
    throw new GoogleNotConnectedError(`Google refused to refresh access (${data.error ?? res.status}). Sign out and sign in again.`);
  }

  await db
    .update(googleTokens)
    .set({
      accessTokenEnc: encrypt(data.access_token),
      accessTokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      updatedAt: new Date(),
    })
    .where(eq(googleTokens.email, email));
  return data.access_token;
}
