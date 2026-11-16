import { expect, test } from "vitest";
import { parseMovementForm } from "./movement-form";
import type { Account } from "./types";

const accounts: Account[] = [
  { id: "ars", name: "Efectivo", currency: "ARS", type: "cash", initialBalanceCents: 0, archived: false },
  { id: "bank", name: "Banco", currency: "ARS", type: "cash", initialBalanceCents: 0, archived: false },
  { id: "usd", name: "Dólares", currency: "USD", type: "cash", initialBalanceCents: 0, archived: false },
];
const fd = (o: Record<string, string>) => { const f = new FormData(); Object.entries(o).forEach(([k, v]) => f.set(k, v)); return f; };

test("valid expense", () => {
  expect(parseMovementForm(fd({ kind: "expense", accountId: "ars", amount: "1.234,50", categoryId: "c1", date: "2026-11-16", note: " súper " }), accounts))
    .toEqual({ ok: true, row: { kind: "expense", account_id: "ars", amount: "1234.50", to_account_id: null, to_amount: null, category_id: "c1", date: "2026-11-16", note: "súper" } });
});

test("invalid amount", () => {
  expect(parseMovementForm(fd({ kind: "expense", accountId: "ars", amount: "abc", date: "2026-11-16" }), accounts))
    .toEqual({ ok: false, error: "Ingresá un monto válido" });
});

test("unknown account", () => {
  expect(parseMovementForm(fd({ kind: "income", accountId: "zzz", amount: "10", date: "2026-11-16" }), accounts))
    .toEqual({ ok: false, error: "Elegí una cuenta" });
});

test("invalid date", () => {
  expect(parseMovementForm(fd({ kind: "income", accountId: "ars", amount: "10", date: "16/11/2026" }), accounts).ok).toBe(false);
});

test("same-currency transfer copies amount and drops category", () => {
  const r = parseMovementForm(fd({ kind: "transfer", accountId: "ars", toAccountId: "bank", amount: "500", categoryId: "c1", date: "2026-11-16" }), accounts);
  expect(r).toMatchObject({ ok: true, row: { to_account_id: "bank", to_amount: "500.00", category_id: null } });
});

test("cross-currency transfer requires received amount", () => {
  expect(parseMovementForm(fd({ kind: "transfer", accountId: "ars", toAccountId: "usd", amount: "120000", date: "2026-11-16" }), accounts))
    .toEqual({ ok: false, error: "Ingresá cuánto recibís en la otra cuenta" });
  expect(parseMovementForm(fd({ kind: "transfer", accountId: "ars", toAccountId: "usd", amount: "120000", toAmount: "100", date: "2026-11-16" }), accounts))
    .toMatchObject({ ok: true, row: { amount: "120000.00", to_amount: "100.00" } });
});

test("transfer to the same account is rejected", () => {
  expect(parseMovementForm(fd({ kind: "transfer", accountId: "ars", toAccountId: "ars", amount: "1", date: "2026-11-16" }), accounts))
    .toEqual({ ok: false, error: "Elegí una cuenta de destino distinta" });
});

test("unknown kind rejected", () => {
  expect(parseMovementForm(fd({ kind: "adjustment", accountId: "ars", amount: "1", date: "2026-11-16" }), accounts).ok).toBe(false);
});
