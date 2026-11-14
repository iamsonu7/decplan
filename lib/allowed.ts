// The one account allowed to use the app, from the ALLOWED_EMAIL environment variable.
export function isAllowedEmail(email: string | null | undefined, allowed = process.env.ALLOWED_EMAIL): boolean {
  if (!email || !allowed) return false; // no ALLOWED_EMAIL set means nobody gets in
  return email.trim().toLowerCase() === allowed.trim().toLowerCase();
}
