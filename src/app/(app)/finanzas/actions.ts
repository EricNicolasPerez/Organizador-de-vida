"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccountsAndCategories } from "@/lib/finance/queries";
import { parseMovementForm } from "@/lib/finance/movement-form";
import { accountBalance, adjustmentAmount } from "@/lib/finance/balances";
import { rowToMovement, toDecimal } from "@/lib/finance/mappers";
import { parseAmount } from "@/lib/money";

export type FormState = { error: string | null; ok?: number };

function refresh() {
  revalidatePath("/", "layout");
}

export async function saveMovement(_prev: FormState, form: FormData): Promise<FormState> {
  const { accounts } = await getAccountsAndCategories();
  const parsed = parseMovementForm(form, accounts);
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const id = String(form.get("id") ?? "");
  const { error } = id
    ? await supabase.from("movements").update(parsed.row).eq("id", id)
    : await supabase.from("movements").insert(parsed.row);
  if (error) return { error: "No se pudo guardar. Probá de nuevo." };
  refresh();
  if (id) redirect("/finanzas");
  return { error: null, ok: Date.now() };
}

export async function deleteMovement(id: string) {
  const supabase = await createClient();
  await supabase.from("movements").delete().eq("id", id);
  refresh();
  redirect("/finanzas");
}

export async function createAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const type = form.get("type") === "credit_card" ? "credit_card" : "cash";
  const currency = type === "credit_card" ? "ARS" : form.get("currency") === "USD" ? "USD" : "ARS";
  const raw = String(form.get("initialBalance") ?? "").trim();
  if (!name) return { error: "Poné un nombre" };
  let initial = 0;
  if (raw) {
    const negative = raw.startsWith("-");
    const parsed = parseAmount(negative ? raw.slice(1) : raw);
    if (parsed == null) return { error: "Saldo inicial inválido" };
    initial = negative ? -parsed : parsed;
  }
  // Una tarjeta arranca con lo que se debe: se guarda como saldo negativo.
  if (type === "credit_card" && initial > 0) initial = -initial;
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").insert({ name, type, currency, initial_balance: toDecimal(initial) });
  if (error) return { error: "No se pudo crear la cuenta" };
  refresh();
  return { error: null, ok: Date.now() };
}

export async function renameAccount(id: string, form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("accounts").update({ name }).eq("id", id);
  refresh();
}

export async function setAccountArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  await supabase.from("accounts").update({ archived }).eq("id", id);
  refresh();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function adjustBalance(accountId: string, _prev: FormState, form: FormData): Promise<FormState> {
  if (!UUID.test(accountId)) return { error: "Cuenta no encontrada" };
  const raw = String(form.get("real") ?? "").trim();
  const negative = raw.startsWith("-");
  const parsed = raw === "0" ? 0 : parseAmount(negative ? raw.slice(1) : raw);
  if (parsed == null) return { error: "Ingresá el saldo real" };
  const real = negative ? -parsed : parsed;

  const supabase = await createClient();
  const [{ accounts }, mov] = await Promise.all([
    getAccountsAndCategories(),
    supabase.from("movements").select("id,kind,account_id,amount,to_account_id,to_amount,category_id,date,note")
      .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`),
  ]);
  const account = accounts.find((a) => a.id === accountId);
  if (!account || mov.error) return { error: "Cuenta no encontrada" };
  const diff = adjustmentAmount(accountBalance(account, mov.data.map(rowToMovement)), real);
  if (diff === 0) return { error: null, ok: Date.now() };
  const { error } = await supabase.from("movements").insert({
    kind: "adjustment", account_id: accountId, amount: toDecimal(diff), note: "Ajuste de saldo",
  });
  if (error) return { error: "No se pudo ajustar" };
  refresh();
  return { error: null, ok: Date.now() };
}

export async function createCategory(_prev: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const kind = form.get("kind") === "income" ? "income" : "expense";
  if (!name) return { error: "Poné un nombre" };
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ name, kind });
  if (error) return { error: "No se pudo crear" };
  refresh();
  return { error: null, ok: Date.now() };
}

export async function renameCategory(id: string, form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("categories").update({ name }).eq("id", id);
  refresh();
}

export async function setCategoryArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  await supabase.from("categories").update({ archived }).eq("id", id);
  refresh();
}
