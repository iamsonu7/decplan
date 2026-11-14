// Date helpers. Dates are plain "YYYY-MM-DD" strings in the app's timezone.
export const APP_TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";

export function todayStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(now);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// All days from start to end, both included.
export function dayRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

// "Tue 1 Dec"
export function formatDay(day: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

// The Monday of the week that contains this day.
export function weekStart(day: string): string {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

// Number of days in a row with at least one entry, ending today
// (or yesterday, so the streak is not lost before you log today).
export function streak(days: string[], today: string): number {
  const have = new Set(days);
  let d = have.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (have.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
