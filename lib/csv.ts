// Turns rows into CSV text that opens correctly in Excel and Google Sheets.
function cell(v: unknown): string {
  if (v == null) return "";
  let s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  // Stop spreadsheet apps from treating text as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\r\n");
}
