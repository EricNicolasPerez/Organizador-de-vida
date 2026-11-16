import { parseAmount } from "../money";
import { toDecimal } from "./mappers";
import type { Account } from "./types";

export interface MovementInsert {
  kind: "expense" | "income" | "transfer";
  account_id: string;
  amount: string;
  to_account_id: string | null;
  to_amount: string | null;
  category_id: string | null;
  date: string;
  note: string | null;
}

export type ParseResult = { ok: true; row: MovementInsert } | { ok: false; error: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Validates the quick-add / edit form into a movements row (user-entered kinds only). */
export function parseMovementForm(form: FormData, accounts: Account[]): ParseResult {
  const kind = str(form, "kind");
  if (kind !== "expense" && kind !== "income" && kind !== "transfer") return { ok: false, error: "Tipo inválido" };

  const amount = parseAmount(str(form, "amount"));
  if (amount == null) return { ok: false, error: "Ingresá un monto válido" };

  const account = accounts.find((a) => a.id === str(form, "accountId"));
  if (!account) return { ok: false, error: "Elegí una cuenta" };

  const date = str(form, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { ok: false, error: "Fecha inválida" };

  const note = str(form, "note") || null;
  const row: MovementInsert = {
    kind, account_id: account.id, amount: toDecimal(amount), to_account_id: null, to_amount: null,
    category_id: null, date, note,
  };

  if (kind === "transfer") {
    const to = accounts.find((a) => a.id === str(form, "toAccountId"));
    if (!to) return { ok: false, error: "Elegí la cuenta de destino" };
    if (to.id === account.id) return { ok: false, error: "Elegí una cuenta de destino distinta" };
    let toAmount = amount;
    if (to.currency !== account.currency) {
      const parsed = parseAmount(str(form, "toAmount"));
      if (parsed == null) return { ok: false, error: "Ingresá cuánto recibís en la otra cuenta" };
      toAmount = parsed;
    }
    row.to_account_id = to.id;
    row.to_amount = toDecimal(toAmount);
  } else {
    row.category_id = str(form, "categoryId") || null;
  }
  return { ok: true, row };
}
