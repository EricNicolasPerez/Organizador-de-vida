import type { Account, Currency, Movement } from "./types";

export interface CurrencySummary {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  /** Expenses grouped by category, descending. Uncategorized uses "". */
  byCategory: { categoryId: string; cents: number }[];
}

const empty = (): CurrencySummary => ({ incomeCents: 0, expenseCents: 0, balanceCents: 0, byCategory: [] });

/** Income/expense per currency for a YYYY-MM month. Transfers (incl. card payments) and adjustments never count. */
export function monthlySummary(accounts: Account[], movements: Movement[], month: string): Record<Currency, CurrencySummary> {
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));
  const out: Record<Currency, CurrencySummary> = { ARS: empty(), USD: empty() };
  const cats: Record<Currency, Map<string, number>> = { ARS: new Map(), USD: new Map() };

  for (const m of movements) {
    if (!m.date.startsWith(month + "-")) continue;
    const cur = currencyOf.get(m.accountId);
    if (!cur) continue;
    if (m.kind === "income") out[cur].incomeCents += m.amountCents;
    else if (m.kind === "expense") {
      out[cur].expenseCents += m.amountCents;
      const key = m.categoryId ?? "";
      cats[cur].set(key, (cats[cur].get(key) ?? 0) + m.amountCents);
    }
  }

  for (const cur of ["ARS", "USD"] as Currency[]) {
    out[cur].balanceCents = out[cur].incomeCents - out[cur].expenseCents;
    out[cur].byCategory = [...cats[cur]].map(([categoryId, cents]) => ({ categoryId, cents })).sort((a, b) => b.cents - a.cents);
  }
  return out;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

export function currentMonth(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}
