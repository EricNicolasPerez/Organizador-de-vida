export type Currency = "ARS" | "USD";
export const CURRENCIES: Currency[] = ["ARS", "USD"];
export type AccountType = "cash" | "credit_card";

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  type: AccountType;
  initialBalanceCents: number;
  archived: boolean;
}

export type MovementKind = "expense" | "income" | "transfer" | "adjustment";

export interface Movement {
  id: string;
  kind: MovementKind;
  accountId: string;
  /** > 0, except for `adjustment`, which is signed. */
  amountCents: number;
  toAccountId: string | null;
  toAmountCents: number | null;
  categoryId: string | null;
  /** YYYY-MM-DD */
  date: string;
  note: string | null;
}

export type CategoryKind = "expense" | "income";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  archived: boolean;
}
