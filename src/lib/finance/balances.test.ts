import { describe, expect, test } from "vitest";
import { accountBalance, adjustmentAmount, availableByCurrency, cardDebt } from "./balances";
import type { Account, Movement } from "./types";

const acc = (id: string, over: Partial<Account> = {}): Account => ({
  id, name: id, currency: "ARS", type: "cash", initialBalanceCents: 0, archived: false, ...over,
});
let n = 0;
const mv = (over: Partial<Movement>): Movement => ({
  id: `m${n++}`, kind: "expense", accountId: "a", amountCents: 0, toAccountId: null,
  toAmountCents: null, categoryId: null, date: "2026-11-01", note: null, ...over,
});

describe("accountBalance", () => {
  test("initial + income - expense", () => {
    const a = acc("a", { initialBalanceCents: 100000 });
    const ms = [mv({ kind: "income", amountCents: 50000 }), mv({ kind: "expense", amountCents: 20000 })];
    expect(accountBalance(a, ms)).toBe(130000);
  });

  test("ignores movements of other accounts", () => {
    expect(accountBalance(acc("a"), [mv({ accountId: "b", kind: "income", amountCents: 100 })])).toBe(0);
  });

  test("signed adjustment lowers balance", () => {
    const a = acc("a", { initialBalanceCents: 100000 });
    expect(accountBalance(a, [mv({ kind: "adjustment", amountCents: -5000 })])).toBe(95000);
  });
});

test("cross-currency transfer moves ARS out and USD in", () => {
  const ars = acc("ars", { initialBalanceCents: 20000000 });
  const usd = acc("usd", { currency: "USD", initialBalanceCents: 10000 });
  const before = availableByCurrency([ars, usd], []);
  const t = mv({ kind: "transfer", accountId: "ars", amountCents: 12000000, toAccountId: "usd", toAmountCents: 10000 });
  const after = availableByCurrency([ars, usd], [t]);
  expect(after.ARS).toBe(before.ARS - 12000000);
  expect(after.USD).toBe(before.USD + 10000);
});

describe("credit cards", () => {
  const cash = acc("cash", { initialBalanceCents: 100000 });
  const card = acc("card", { type: "credit_card" });

  test("card expense raises debt but keeps Disponible", () => {
    const ms = [mv({ accountId: "card", amountCents: 30000 })];
    expect(accountBalance(card, ms)).toBe(-30000);
    expect(cardDebt([cash, card], ms)).toBe(30000);
    expect(availableByCurrency([cash, card], ms).ARS).toBe(100000);
  });

  test("paying the card lowers Disponible and clears debt", () => {
    const ms = [
      mv({ accountId: "card", amountCents: 30000 }),
      mv({ kind: "transfer", accountId: "cash", amountCents: 30000, toAccountId: "card", toAmountCents: 30000 }),
    ];
    expect(availableByCurrency([cash, card], ms).ARS).toBe(70000);
    expect(cardDebt([cash, card], ms)).toBe(0);
  });

  test("overpaid card does not produce negative debt", () => {
    const ms = [mv({ kind: "transfer", accountId: "cash", amountCents: 500, toAccountId: "card", toAmountCents: 500 })];
    expect(cardDebt([cash, card], ms)).toBe(0);
  });
});

test("archived cash accounts are excluded from Disponible", () => {
  const ms: Movement[] = [];
  const res = availableByCurrency([acc("a", { initialBalanceCents: 100 }), acc("b", { initialBalanceCents: 900, archived: true })], ms);
  expect(res).toEqual({ ARS: 100, USD: 0 });
});

test("adjustmentAmount is real minus current", () => {
  expect(adjustmentAmount(100000, 95000)).toBe(-5000);
  expect(adjustmentAmount(0, 1200)).toBe(1200);
});
