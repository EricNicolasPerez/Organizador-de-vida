import Link from "next/link";
import { getFinanceData } from "@/lib/finance/queries";
import { accountBalance } from "@/lib/finance/balances";
import { Money } from "@/components/money";
import { NewAccountForm, AdjustForm } from "./forms";
import { renameAccount, setAccountArchived } from "../actions";

export default async function CuentasPage() {
  const { accounts, movements } = await getFinanceData();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/finanzas" className="text-sm text-accent">‹ Finanzas</Link>
      <h1 className="text-2xl font-bold">Cuentas</h1>
      <ul className="flex flex-col gap-3">
        {accounts.map((a) => {
          const balance = accountBalance(a, movements);
          return (
            <li key={a.id} className={`card flex flex-col gap-3 ${a.archived ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-muted">{a.type === "credit_card" ? "Tarjeta de crédito" : "Disponible"} · {a.currency}</p>
                </div>
                <div className="text-right">
                  {a.type === "credit_card" ? (
                    <><p className="label">Debés</p><Money cents={Math.max(0, -balance)} currency={a.currency} className="font-bold text-danger" /></>
                  ) : (
                    <Money cents={balance} currency={a.currency} className="font-bold" />
                  )}
                </div>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-accent">Editar</summary>
                <div className="mt-3 flex flex-col gap-3">
                  <form action={renameAccount.bind(null, a.id)} className="flex gap-2">
                    <input name="name" defaultValue={a.name} className="input" aria-label="Nombre" />
                    <button className="btn-ghost">Guardar</button>
                  </form>
                  {a.type === "cash" && <AdjustForm accountId={a.id} />}
                  <form action={setAccountArchived.bind(null, a.id, !a.archived)}>
                    <button className="text-muted">{a.archived ? "Reactivar cuenta" : "Archivar cuenta"}</button>
                  </form>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      <section className="card">
        <h2 className="mb-3 font-semibold">Nueva cuenta</h2>
        <NewAccountForm />
      </section>
    </div>
  );
}
