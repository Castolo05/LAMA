/** CSV para Excel en español: separador ";", coma decimal y BOM UTF-8. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = typeof v === "number" ? String(v).replace(".", ",") : v == null ? "" : String(v);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [headers.join(";"), ...rows.map((r) => headers.map((h) => cell(r[h])).join(";"))].join("\r\n");
}
