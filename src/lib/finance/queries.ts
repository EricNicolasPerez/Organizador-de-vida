import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rowToAccount, rowToCategory, rowToMovement } from "./mappers";
import type { Account, Category, Movement } from "./types";

export interface FinanceData {
  accounts: Account[];
  categories: Category[];
  movements: Movement[];
}

export async function getAccountsAndCategories(): Promise<Pick<FinanceData, "accounts" | "categories">> {
  const supabase = await createClient();
  await supabase.rpc("seed_default_categories");
  const [acc, cat] = await Promise.all([
    supabase.from("accounts").select("id,name,currency,type,initial_balance,archived").order("created_at"),
    supabase.from("categories").select("id,name,kind,archived").order("name"),
  ]);
  if (acc.error) throw acc.error;
  if (cat.error) throw cat.error;
  return { accounts: acc.data.map(rowToAccount), categories: cat.data.map(rowToCategory) };
}

export async function getFinanceData(): Promise<FinanceData> {
  const supabase = await createClient();
  const [base, mov] = await Promise.all([
    getAccountsAndCategories(),
    supabase
      .from("movements")
      .select("id,kind,account_id,amount,to_account_id,to_amount,category_id,date,note")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (mov.error) throw mov.error;
  return { ...base, movements: mov.data.map(rowToMovement) };
}
