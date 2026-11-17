/** Upper bounds that fit the DB columns (numeric(6,2), numeric(8,1), int). */
const MAX = { decimal: 9999, integer: 100000 };

/**
 * Parses what the user typed in a set field.
 * Returns a number, null for empty, or undefined when the text is invalid.
 * Accepts "," or "." as decimal separator and a trailing separator while typing ("22,").
 */
export function parseSetInput(text: string, kind: "decimal" | "integer"): number | null | undefined {
  const s = text.trim().replace(",", ".");
  if (s === "") return null;
  const re = kind === "integer" ? /^\d+$/ : /^\d+(\.\d*)?$/;
  if (!re.test(s)) return undefined;
  const n = Number(s.endsWith(".") ? s.slice(0, -1) : s);
  if (!Number.isFinite(n) || n > MAX[kind]) return undefined;
  return n;
}

export function formatSetValue(v: number | null): string {
  return v == null ? "" : String(v).replace(".", ",");
}
