// Minimal CSV builder - quotes any field containing a comma, quote, or
// newline, doubling internal quotes per the CSV spec (RFC 4180). Good enough
// for a data export; no library needed.
export function toCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields
    .map((f) => {
      const s = f == null ? "" : String(f);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(",");
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  // Leading BOM so Excel (which guesses encoding from the first bytes)
  // opens the file as UTF-8 instead of mangling non-ASCII names.
  const BOM = "﻿";
  return BOM + [toCsvRow(header), ...rows.map(toCsvRow)].join("\r\n") + "\r\n";
}
