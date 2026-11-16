import Link from "next/link";
import { getFinanceData } from "@/lib/finance/queries";
import { availableByCurrency, cardDebt } from "@/lib/finance/balances";
import { currentMonth, monthlySummary } from "@/lib/finance/summary";
import { Money } from "@/components/money";
import { getActiveRoutine, getLastSessionDayId } from "@/lib/training/queries";
import { nextRoutineDay } from "@/lib/training/next-day";

export default async function HomePage() {
  const [{ accounts, movements }, routine] = await Promise.all([getFinanceData(), getActiveRoutine()]);
  const today = routine ? nextRoutineDay(routine.days, await getLastSessionDayId(routine.id)) : null;
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
      <div className="card flex flex-col gap-2">
        <p className="label">Hoy te toca</p>
        {today ? (
          <>
            <p className="text-2xl font-bold">{today.name}</p>
            <p className="text-sm text-muted">{routine?.name}</p>
            <Link href={`/entrenamiento/sesion?dia=${today.id}`} className="btn-primary mt-1 text-center">Empezar</Link>
          </>
        ) : (
          <Link href="/entrenamiento/rutinas" className="text-accent">Armá tu rutina de entrenamiento ›</Link>
        )}
      </div>
    </div>
  );
}
