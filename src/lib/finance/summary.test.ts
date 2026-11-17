import { expect, test } from "vitest";
import { monthlySummary, shiftMonth } from "./summary";
import type { Account, Movement } from "./types";

const accounts: Account[] = [
  { id: "cash", name: "Efectivo", currency: "ARS", type: "cash", initialBalanceCents: 0, archived: false },
  { id: "card", name: "Visa", currency: "ARS", type: "credit_card", initialBalanceCents: 0, archived: false },
  { id: "usd", name: "Dólares", currency: "USD", type: "cash", initialBalanceCents: 0, archived: false },
];
let n = 0;
const mv = (over: Partial<Movement>): Movement => ({
  id: `m${n++}`, kind: "expense", accountId: "cash", amountCents: 0, toAccountId: null,
  toAmountCents: null, categoryId: "food", date: "2026-11-10", note: null, ...over,
});

test("card expense counts, card payment does not", () => {
  const s = monthlySummary(accounts, [
    mv({ accountId: "card", amountCents: 30000 }),
    mv({ kind: "transfer", accountId: "cash", amountCents: 30000, toAccountId: "card", toAmountCents: 30000, categoryId: null }),
  ], "2026-11");
  expect(s.ARS.expenseCents).toBe(30000);
  expect(s.ARS.incomeCents).toBe(0);
});

test("transfers and adjustments never count", () => {
  const s = monthlySummary(accounts, [
    mv({ kind: "adjustment", amountCents: -500, categoryId: null }),
    mv({ kind: "transfer", accountId: "cash", amountCents: 100, toAccountId: "usd", toAmountCents: 1, categoryId: null }),
  ], "2026-11");
  expect(s.ARS).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0, byCategory: [] });
  expect(s.USD.incomeCents).toBe(0);
});

test("ignores movements outside the month", () => {
  const s = monthlySummary(accounts, [mv({ amountCents: 100, date: "2026-10-31" }), mv({ amountCents: 200, date: "2026-12-01" })], "2026-11");
  expect(s.ARS.expenseCents).toBe(0);
});

test("USD movements only in USD summary; income and balance", () => {
  const s = monthlySummary(accounts, [
    mv({ accountId: "usd", amountCents: 1000 }),
    mv({ kind: "income", amountCents: 500000, categoryId: "salary" }),
    mv({ amountCents: 100000 }),
  ], "2026-11");
  expect(s.USD.expenseCents).toBe(1000);
  expect(s.ARS).toMatchObject({ incomeCents: 500000, expenseCents: 100000, balanceCents: 400000 });
});

test("byCategory groups expenses sorted descending", () => {
  const s = monthlySummary(accounts, [
    mv({ amountCents: 100, categoryId: "food" }),
    mv({ amountCents: 900, categoryId: "rent" }),
    mv({ amountCents: 200, categoryId: "food" }),
    mv({ amountCents: 50, categoryId: null }),
  ], "2026-11");
  expect(s.ARS.byCategory).toEqual([
    { categoryId: "rent", cents: 900 },
    { categoryId: "food", cents: 300 },
    { categoryId: "", cents: 50 },
  ]);
});

test("shiftMonth crosses years", () => {
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftMonth("2026-05", 0)).toBe("2026-05");
});
