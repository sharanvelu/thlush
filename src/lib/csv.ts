/**
 * Minimal RFC 4180 CSV reader and writer.
 *
 * Export protects against spreadsheet formula injection: a text cell that
 * starts with = + - @ tab or CR is prefixed with an apostrophe. Import removes
 * that single apostrophe again, so exported files round-trip.
 */

export type CsvCell = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" ? value : String(value);
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}

/** Reverses the formula-injection prefix added by `toCsv`. */
export function unescapeCell(value: string): string {
  return value.length > 1 && value.startsWith("'") && FORMULA_START.test(value.slice(1))
    ? value.slice(1)
    : value;
}

/** Parses CSV text into rows of strings. Handles quotes, escaped quotes, CRLF and a BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (inQuotes) throw new Error("The file has an unclosed quote.");
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // Drop fully blank lines.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
