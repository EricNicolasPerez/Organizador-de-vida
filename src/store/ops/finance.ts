import { accountBalance, adjustmentAmount } from "@/lib/finance/balances";
import { parseMovementForm } from "@/lib/finance/movement-form";
import type { Account, AccountType, Category, Currency, Movement } from "@/lib/finance/types";
import { uuid } from "@/lib/training/draft-from-day";
import type { AppData } from "../types";

export interface MovementInsertCents {
  kind: "expense" | "income" | "transfer";
  accountId: string;
  amountCents: number;
  toAccountId: string | null;
  toAmountCents: number | null;
  categoryId: string | null;
  date: string;
  note: string | null;
}

function rememberLastUsed(data: AppData, row: MovementInsertCents): AppData["settings"] {
  const settings = { ...data.settings, lastAccountId: row.accountId, lastCategoryId: { ...data.settings.lastCategoryId } };
  if (row.kind !== "transfer" && row.categoryId) settings.lastCategoryId[row.kind] = row.categoryId;
  return settings;
}

export function addMovement(data: AppData, row: MovementInsertCents): AppData {
  const movement: Movement = { id: uuid(), ...row };
  return { ...data, movements: [movement, ...data.movements], settings: rememberLastUsed(data, row) };
}

export function updateMovement(data: AppData, id: string, row: MovementInsertCents): AppData {
  return { ...data, movements: data.movements.map((m) => (m.id === id ? { id, ...row } : m)) };
}

export function deleteMovement(data: AppData, id: string): AppData {
  return { ...data, movements: data.movements.filter((m) => m.id !== id) };
}

export function addAccount(
  data: AppData,
  input: { name: string; currency: Currency; type: AccountType; initialBalanceCents: number },
): AppData {
  const isCard = input.type === "credit_card";
  const account: Account = {
    id: uuid(),
    name: input.name.trim(),
    type: input.type,
    currency: isCard ? "ARS" : input.currency,
    initialBalanceCents: isCard && input.initialBalanceCents > 0 ? -input.initialBalanceCents : input.initialBalanceCents,
    archived: false,
  };
  return { ...data, accounts: [...data.accounts, account] };
}

export function renameAccount(data: AppData, id: string, name: string): AppData {
  const clean = name.trim();
  if (!clean) return data;
  return { ...data, accounts: data.accounts.map((a) => (a.id === id ? { ...a, name: clean } : a)) };
}

export function setAccountArchived(data: AppData, id: string, archived: boolean): AppData {
  return { ...data, accounts: data.accounts.map((a) => (a.id === id ? { ...a, archived } : a)) };
}

export function adjustBalance(data: AppData, accountId: string, realCents: number): AppData {
  const account = data.accounts.find((a) => a.id === accountId);
  if (!account) return data;
  const diff = adjustmentAmount(accountBalance(account, data.movements), realCents);
  if (diff === 0) return data;
  const movement: Movement = {
    id: uuid(), kind: "adjustment", accountId, amountCents: diff, toAccountId: null, toAmountCents: null,
    categoryId: null, date: localDate(), note: "Ajuste de saldo",
  };
  return { ...data, movements: [movement, ...data.movements] };
}

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addCategory(data: AppData, input: { name: string; kind: Category["kind"] }): AppData {
  const clean = input.name.trim();
  if (!clean) return data;
  return { ...data, categories: [...data.categories, { id: uuid(), name: clean, kind: input.kind, archived: false }] };
}

export function renameCategory(data: AppData, id: string, name: string): AppData {
  const clean = name.trim();
  if (!clean) return data;
  return { ...data, categories: data.categories.map((c) => (c.id === id ? { ...c, name: clean } : c)) };
}

export function setCategoryArchived(data: AppData, id: string, archived: boolean): AppData {
  return { ...data, categories: data.categories.map((c) => (c.id === id ? { ...c, archived } : c)) };
}

const toCents = (s: string) => Math.round(Number(s) * 100);

export function parseMovementFormCents(
  form: FormData,
  accounts: Account[],
): { ok: true; row: MovementInsertCents } | { ok: false; error: string } {
  const r = parseMovementForm(form, accounts);
  if (!r.ok) return r;
  const { row } = r;
  return {
    ok: true,
    row: {
      kind: row.kind, accountId: row.account_id, amountCents: toCents(row.amount),
      toAccountId: row.to_account_id, toAmountCents: row.to_amount == null ? null : toCents(row.to_amount),
      categoryId: row.category_id, date: row.date, note: row.note,
    },
  };
}
