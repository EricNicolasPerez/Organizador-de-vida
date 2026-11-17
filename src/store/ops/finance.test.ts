import { expect, test } from "vitest";
import { emptyData } from "../seed";
import type { AppData } from "../types";
import {
  addAccount, addCategory, addMovement, adjustBalance, deleteMovement, parseMovementFormCents,
  renameAccount, renameCategory, setAccountArchived, setCategoryArchived, updateMovement,
} from "./finance";

function withAccounts(): AppData {
  let d = emptyData();
  d = addAccount(d, { name: "Efectivo", currency: "ARS", type: "cash", initialBalanceCents: 100000 });
  d = addAccount(d, { name: "Dólares", currency: "USD", type: "cash", initialBalanceCents: 0 });
  return d;
}
const row = (d: AppData, over: Partial<Parameters<typeof addMovement>[1]> = {}) => ({
  kind: "expense" as const, accountId: d.accounts[0].id, amountCents: 25050, toAccountId: null, toAmountCents: null,
  categoryId: d.categories[0].id, date: "2026-11-17", note: null, ...over,
});

test("addMovement stores the row and remembers last account/category", () => {
  const d0 = withAccounts();
  const d = addMovement(d0, row(d0));
  expect(d.movements).toHaveLength(1);
  expect(d.movements[0]).toMatchObject({ kind: "expense", amountCents: 25050, categoryId: d0.categories[0].id });
  expect(d.settings.lastAccountId).toBe(d0.accounts[0].id);
  expect(d.settings.lastCategoryId.expense).toBe(d0.categories[0].id);
  expect(d.settings.lastCategoryId.income).toBeNull();
});

test("transfer does not touch lastCategoryId", () => {
  const d0 = withAccounts();
  const d = addMovement(d0, row(d0, { kind: "transfer", toAccountId: d0.accounts[1].id, toAmountCents: 100, categoryId: null }));
  expect(d.settings.lastCategoryId).toEqual({ expense: null, income: null });
});

test("updateMovement replaces fields; deleteMovement removes", () => {
  const d0 = withAccounts();
  let d = addMovement(d0, row(d0));
  const id = d.movements[0].id;
  d = updateMovement(d, id, row(d0, { amountCents: 100, note: "x" }));
  expect(d.movements[0]).toMatchObject({ id, amountCents: 100, note: "x" });
  d = deleteMovement(d, id);
  expect(d.movements).toEqual([]);
});

test("credit card is forced to ARS and its debt is stored negative", () => {
  const d = addAccount(emptyData(), { name: "Visa", currency: "USD", type: "credit_card", initialBalanceCents: 30000 });
  expect(d.accounts[0]).toMatchObject({ currency: "ARS", type: "credit_card", initialBalanceCents: -30000 });
});

test("adjustBalance adds a signed adjustment and is a no-op when equal", () => {
  const d0 = withAccounts();
  const d = adjustBalance(d0, d0.accounts[0].id, 95000);
  expect(d.movements[0]).toMatchObject({ kind: "adjustment", amountCents: -5000, note: "Ajuste de saldo" });
  expect(adjustBalance(d, d0.accounts[0].id, 95000)).toBe(d);
});

test("rename and archive accounts and categories; archive never deletes", () => {
  const d0 = withAccounts();
  let d = addMovement(d0, row(d0));
  d = renameAccount(d, d0.accounts[0].id, "Billetera");
  d = setAccountArchived(d, d0.accounts[0].id, true);
  d = renameCategory(d, d0.categories[0].id, "Comidas");
  d = setCategoryArchived(d, d0.categories[0].id, true);
  expect(d.accounts[0]).toMatchObject({ name: "Billetera", archived: true });
  expect(d.categories[0]).toMatchObject({ name: "Comidas", archived: true });
  expect(d.movements[0].categoryId).toBe(d0.categories[0].id);
  d = addCategory(d, { name: "Mascotas", kind: "expense" });
  expect(d.categories.at(-1)).toMatchObject({ name: "Mascotas", kind: "expense", archived: false });
});

test("parseMovementFormCents converts the form to cents", () => {
  const d0 = withAccounts();
  const f = new FormData();
  f.set("kind", "transfer"); f.set("accountId", d0.accounts[0].id); f.set("toAccountId", d0.accounts[1].id);
  f.set("amount", "1.234,50"); f.set("toAmount", "1"); f.set("date", "2026-11-17");
  const r = parseMovementFormCents(f, d0.accounts);
  expect(r).toEqual({ ok: true, row: { kind: "transfer", accountId: d0.accounts[0].id, amountCents: 123450, toAccountId: d0.accounts[1].id, toAmountCents: 100, categoryId: null, date: "2026-11-17", note: null } });
  f.set("amount", "abc");
  expect(parseMovementFormCents(f, d0.accounts)).toEqual({ ok: false, error: "Ingresá un monto válido" });
});
