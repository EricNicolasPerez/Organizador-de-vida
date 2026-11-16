import type { Account, Currency, Movement } from "./types";

/** Signed effect of one movement on one account's balance, in cents. */
export function movementEffect(accountId: string, m: Movement): number {
  let effect = 0;
  if (m.accountId === accountId) {
    switch (m.kind) {
      case "income":
      case "adjustment":
        effect += m.amountCents;
        break;
      case "expense":
      case "transfer":
        effect -= m.amountCents;
        break;
    }
  }
  if (m.kind === "transfer" && m.toAccountId === accountId) {
    effect += m.toAmountCents ?? 0;
  }
  return effect;
}

export function accountBalance(account: Account, movements: Movement[]): number {
  return movements.reduce((sum, m) => sum + movementEffect(account.id, m), account.initialBalanceCents);
}

export function availableByCurrency(accounts: Account[], movements: Movement[]): Record<Currency, number> {
  const out: Record<Currency, number> = { ARS: 0, USD: 0 };
  for (const a of accounts) {
    if (a.type !== "cash" || a.archived) continue;
    out[a.currency] += accountBalance(a, movements);
  }
  return out;
}

export function cardDebt(accounts: Account[], movements: Movement[]): number {
  return accounts
    .filter((a) => a.type === "credit_card")
    .reduce((sum, a) => sum + Math.max(0, -accountBalance(a, movements)), 0);
}

export function adjustmentAmount(currentCents: number, realCents: number): number {
  return realCents - currentCents;
}
