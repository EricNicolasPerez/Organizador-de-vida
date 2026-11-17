import type { Account, Category, Movement } from "./types";

type Num = string | number;

/** Postgres numeric (string or number) → integer cents, without float drift. */
export function toCents(v: Num): number {
  return Math.round(Number(v) * 100);
}

/** Integer cents → decimal string for a numeric column. */
export function toDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export interface MovementRow {
  id: string; kind: Movement["kind"]; account_id: string; amount: Num; to_account_id: string | null;
  to_amount: Num | null; category_id: string | null; date: string; note: string | null;
}
export interface AccountRow {
  id: string; name: string; currency: Account["currency"]; type: Account["type"]; initial_balance: Num; archived: boolean;
}
export interface CategoryRow { id: string; name: string; kind: Category["kind"]; archived: boolean }

export function rowToMovement(r: MovementRow): Movement {
  return {
    id: r.id, kind: r.kind, accountId: r.account_id, amountCents: toCents(r.amount),
    toAccountId: r.to_account_id, toAmountCents: r.to_amount == null ? null : toCents(r.to_amount),
    categoryId: r.category_id, date: r.date, note: r.note,
  };
}

export function rowToAccount(r: AccountRow): Account {
  return { id: r.id, name: r.name, currency: r.currency, type: r.type, initialBalanceCents: toCents(r.initial_balance), archived: r.archived };
}

export function rowToCategory(r: CategoryRow): Category {
  return { id: r.id, name: r.name, kind: r.kind, archived: r.archived };
}
