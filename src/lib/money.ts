import type { Currency } from "./finance/types";

const INT_GROUPED = /^\d{1,3}(\.\d{3})+$/;
const INT_PLAIN = /^\d+$/;

/**
 * Parses an amount typed by a user into integer cents.
 * Accepts Argentine format ("1.234,50"), plain decimals ("1234.5") and
 * dot-grouped thousands ("25.000"). Returns null for empty, invalid or ≤ 0.
 */
export function parseAmount(input: string): number | null {
  const s = input.trim().replace(/\s/g, "");
  if (!s) return null;

  let intPart: string;
  let decPart = "";

  if (s.includes(",")) {
    const parts = s.split(",");
    if (parts.length !== 2) return null;
    [intPart, decPart] = parts;
    if (!(INT_PLAIN.test(intPart) || INT_GROUPED.test(intPart))) return null;
    intPart = intPart.replace(/\./g, "");
  } else if (INT_GROUPED.test(s)) {
    intPart = s.replace(/\./g, "");
  } else {
    const parts = s.split(".");
    if (parts.length > 2) return null;
    [intPart, decPart = ""] = parts;
    if (!INT_PLAIN.test(intPart)) return null;
  }

  if (decPart && !/^\d{1,2}$/.test(decPart)) return null;
  const cents = Number(intPart) * 100 + Number(decPart.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

const formatters = new Map<Currency, Intl.NumberFormat>();

export function formatMoney(cents: number, currency: Currency): string {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("es-AR", { style: "currency", currency, minimumFractionDigits: 2 });
    formatters.set(currency, f);
  }
  return f.format(cents / 100);
}

/** Cents → editable string in Argentine format without grouping ("1234,50"). */
export function centsToInput(cents: number): string {
  const abs = Math.abs(cents);
  const s = `${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
  return cents < 0 ? `-${s}` : s;
}

/** Integer cents → decimal string ("1234.50"). */
export function toDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
