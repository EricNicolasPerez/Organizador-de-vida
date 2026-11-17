import { expect, test } from "vitest";
import { rowToAccount, rowToCategory, rowToMovement, toDecimal } from "./mappers";

test("rowToMovement converts numeric strings to cents", () => {
  const m = rowToMovement({
    id: "m1", kind: "transfer", account_id: "a", amount: "1234.50", to_account_id: "b", to_amount: "1.05",
    category_id: null, date: "2026-11-16", note: null,
  });
  expect(m).toEqual({ id: "m1", kind: "transfer", accountId: "a", amountCents: 123450, toAccountId: "b",
    toAmountCents: 105, categoryId: null, date: "2026-11-16", note: null });
});

test("rowToMovement handles numbers, negatives and null to_amount", () => {
  const m = rowToMovement({ id: "m", kind: "adjustment", account_id: "a", amount: -0.1, to_account_id: null,
    to_amount: null, category_id: null, date: "2026-11-16", note: "x" });
  expect(m.amountCents).toBe(-10);
  expect(m.toAmountCents).toBeNull();
});

test("rowToAccount maps initial_balance", () => {
  expect(rowToAccount({ id: "a", name: "Banco", currency: "USD", type: "cash", initial_balance: "99.99", archived: false }))
    .toEqual({ id: "a", name: "Banco", currency: "USD", type: "cash", initialBalanceCents: 9999, archived: false });
});

test("rowToCategory", () => {
  expect(rowToCategory({ id: "c", name: "Comida", kind: "expense", archived: false }))
    .toEqual({ id: "c", name: "Comida", kind: "expense", archived: false });
});

test("toDecimal renders cents for numeric columns", () => {
  expect(toDecimal(123450)).toBe("1234.50");
  expect(toDecimal(-5)).toBe("-0.05");
});
