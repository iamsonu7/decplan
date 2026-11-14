// Every Google permission the app asks for, on one consent screen.
// Keep this list as narrow as the features allow.
const G = "https://www.googleapis.com/auth/";

export const GOOGLE_SCOPES = [
  { scope: "openid", label: "Sign in", why: "Know who is signing in" },
  { scope: "email", label: "Email address", why: "Check you are the allowed account" },
  { scope: "profile", label: "Name", why: "Show your name in the app" },
  { scope: `${G}gmail.readonly`, label: "Gmail (read)", why: "Read threads and detect outreach replies" },
  { scope: `${G}gmail.compose`, label: "Gmail (drafts and send)", why: "Create drafts; send only after you confirm" },
  { scope: `${G}calendar.events`, label: "Calendar events", why: "Create reminder events with notifications" },
  { scope: `${G}tasks`, label: "Google Tasks", why: "Mirror app tasks to your phone" },
  { scope: `${G}drive.readonly`, label: "Drive (read)", why: "Search and read your files, Docs and Sheets" },
  { scope: `${G}drive.file`, label: "Drive (files this app creates)", why: "Create new Docs and Sheets and edit only those" },
] as const;

export const GOOGLE_SCOPE_STRING = GOOGLE_SCOPES.map((s) => s.scope).join(" ");

// Google reports "email" and "profile" under these longer names.
const ALIASES: Record<string, string> = {
  email: `${G}userinfo.email`,
  profile: `${G}userinfo.profile`,
};

// Which requested scopes are missing from what Google actually granted.
export function missingScopes(granted: string): string[] {
  const have = new Set(granted.split(/\s+/).filter(Boolean));
  return GOOGLE_SCOPES.filter((s) => !have.has(s.scope) && !have.has(ALIASES[s.scope] ?? "")).map((s) => s.label);
}
