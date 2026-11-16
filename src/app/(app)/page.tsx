import Link from "next/link";
import { getFinanceData } from "@/lib/finance/queries";
import { availableByCurrency, cardDebt } from "@/lib/finance/balances";
import { currentMonth, monthlySummary } from "@/lib/finance/summary";
import { Money } from "@/components/money";

export default async function HomePage() {
  const { accounts, movements } = await getFinanceData();
  const available = availableByCurrency(accounts, movements);
  const debt = cardDebt(accounts, movements);
  const month = monthlySummary(accounts, movements, currentMonth()).ARS;
  const hasUsd = accounts.some((a) => a.currency === "USD");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Hoy</h1>
      <Link href="/finanzas" className="card flex flex-col gap-3">
        <p className="label">Disponible</p>
        <div className="flex flex-wrap items-baseline gap-x-4">
          <Money cents={available.ARS} currency="ARS" className="text-3xl font-bold" />
          {hasUsd && <Money cents={available.USD} currency="USD" className="text-lg text-muted" />}
        </div>
        {debt > 0 && <p className="text-sm">Debés en tarjetas: <Money cents={debt} currency="ARS" className="font-semibold text-danger" /></p>}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p>Ingresos del mes <Money cents={month.incomeCents} currency="ARS" className="block font-semibold text-success" /></p>
          <p>Gastos del mes <Money cents={month.expenseCents} currency="ARS" className="block font-semibold" /></p>
        </div>
      </Link>
    </div>
  );
}
