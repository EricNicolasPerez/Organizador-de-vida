import Link from "next/link";
import { getFinanceData } from "@/lib/finance/queries";
import { currentMonth, monthlySummary, shiftMonth, type CurrencySummary } from "@/lib/finance/summary";
import { availableByCurrency, cardDebt } from "@/lib/finance/balances";
import type { Category, Currency } from "@/lib/finance/types";
import { Money } from "@/components/money";
import { dayLabel, monthLabel } from "@/lib/dates";

const KIND_LABEL = { expense: "Gasto", income: "Ingreso", transfer: "Transferencia", adjustment: "Ajuste" };

export default async function FinanzasPage({ searchParams }: PageProps<"/finanzas">) {
  const sp = await searchParams;
  const month = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : currentMonth();
  const accountFilter = typeof sp.cuenta === "string" ? sp.cuenta : "";
  const { accounts, categories, movements } = await getFinanceData();

  const summary = monthlySummary(accounts, movements, month);
  const available = availableByCurrency(accounts, movements);
  const debt = cardDebt(accounts, movements);
  const hasUsd = accounts.some((a) => a.currency === "USD");
  const accountName = new Map(accounts.map((a) => [a.id, a]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const monthMovements = movements.filter(
    (m) => m.date.startsWith(month + "-") && (!accountFilter || m.accountId === accountFilter || m.toAccountId === accountFilter),
  );
  const q = (o: Record<string, string>) => "?" + new URLSearchParams({ mes: month, ...(accountFilter ? { cuenta: accountFilter } : {}), ...o }).toString();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <div className="flex gap-3 text-sm text-accent">
          <Link href="/finanzas/cuentas">Cuentas</Link>
          <Link href="/finanzas/categorias">Categorías</Link>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="card text-sm">
          <p className="mb-3">Para empezar, creá tus cuentas: Efectivo, Banco, Mercado Pago, Dólares, tu tarjeta…</p>
          <Link href="/finanzas/cuentas" className="btn-primary inline-block">Crear cuentas</Link>
        </div>
      ) : (
        <div className="card grid grid-cols-2 gap-3">
          <div>
            <p className="label">Disponible</p>
            <Money cents={available.ARS} currency="ARS" className="text-xl font-bold" />
            {hasUsd && <div><Money cents={available.USD} currency="USD" className="text-sm text-muted" /></div>}
          </div>
          {debt > 0 && (
            <div>
              <p className="label">Debés en tarjetas</p>
              <Money cents={debt} currency="ARS" className="text-xl font-bold text-danger" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href={q({ mes: shiftMonth(month, -1) })} className="px-3 py-1 text-xl" aria-label="Mes anterior">‹</Link>
        <span className="font-semibold capitalize">{monthLabel(month)}</span>
        <Link href={q({ mes: shiftMonth(month, 1) })} className="px-3 py-1 text-xl" aria-label="Mes siguiente">›</Link>
      </div>

      <SummaryBlock currency="ARS" s={summary.ARS} categories={categories} />
      {hasUsd && <SummaryBlock currency="USD" s={summary.USD} categories={categories} />}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Movimientos</h2>
          <form className="text-sm">
            <input type="hidden" name="mes" value={month} />
            <select name="cuenta" defaultValue={accountFilter} className="rounded-lg border border-border bg-surface-2 px-2 py-1">
              <option value="">Todas las cuentas</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button type="submit" className="ml-2 text-accent">Filtrar</button>
          </form>
        </div>
        {monthMovements.length === 0 && <p className="text-sm text-muted">Sin movimientos este mes. Tocá + para registrar uno.</p>}
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
          {monthMovements.map((m) => {
            const acc = accountName.get(m.accountId);
            const cur: Currency = acc?.currency ?? "ARS";
            const sign = m.kind === "income" || (m.kind === "adjustment" && m.amountCents > 0) ? "+" : m.kind === "transfer" ? "" : "−";
            const color = m.kind === "income" ? "text-success" : m.kind === "transfer" ? "text-muted" : "";
            const title = m.kind === "transfer"
              ? `${acc?.name ?? "?"} → ${accountName.get(m.toAccountId ?? "")?.name ?? "?"}`
              : m.categoryId ? catName.get(m.categoryId) ?? "Sin categoría" : KIND_LABEL[m.kind];
            return (
              <li key={m.id}>
                <Link href={`/finanzas/movimiento/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{title}</p>
                    <p className="truncate text-xs text-muted">{dayLabel(m.date)} · {m.kind === "transfer" ? "Transferencia" : acc?.name}{m.note ? ` · ${m.note}` : ""}</p>
                  </div>
                  <span className={`shrink-0 font-semibold ${color}`}>
                    {sign}<Money cents={Math.abs(m.amountCents)} currency={cur} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function SummaryBlock({ currency, s, categories }: { currency: Currency; s: CurrencySummary; categories: Category[] }) {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const max = s.byCategory[0]?.cents ?? 0;
  return (
    <section className="card flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="label">Ingresos</p><Money cents={s.incomeCents} currency={currency} className="font-semibold text-success" /></div>
        <div><p className="label">Gastos</p><Money cents={s.expenseCents} currency={currency} className="font-semibold" /></div>
        <div><p className="label">Balance</p><Money cents={s.balanceCents} currency={currency} className={`font-semibold ${s.balanceCents < 0 ? "text-danger" : ""}`} /></div>
      </div>
      {s.byCategory.length > 0 && (
        <ul className="flex flex-col gap-2">
          {s.byCategory.map((c) => (
            <li key={c.categoryId} className="text-sm">
              <div className="mb-1 flex justify-between">
                <span>{names.get(c.categoryId) ?? "Sin categoría"}</span>
                <Money cents={c.cents} currency={currency} className="text-muted" />
              </div>
              <div className="h-2 rounded-full bg-surface-2">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(4, (c.cents / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
