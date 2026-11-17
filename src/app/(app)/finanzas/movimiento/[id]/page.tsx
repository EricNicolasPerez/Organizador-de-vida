import Link from "next/link";
import { notFound } from "next/navigation";
import { getFinanceData } from "@/lib/finance/queries";
import { MovementForm } from "@/components/movement-form";
import { Money } from "@/components/money";
import { deleteMovement } from "../../actions";

export default async function MovementPage({ params }: PageProps<"/finanzas/movimiento/[id]">) {
  const { id } = await params;
  const { accounts, categories, movements } = await getFinanceData();
  const movement = movements.find((m) => m.id === id);
  if (!movement) notFound();
  const account = accounts.find((a) => a.id === movement.accountId);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/finanzas" className="text-sm text-accent">‹ Finanzas</Link>
      <h1 className="text-2xl font-bold">{movement.kind === "adjustment" ? "Ajuste de saldo" : "Editar movimiento"}</h1>
      {movement.kind === "adjustment" ? (
        <p className="card">
          {account?.name}: <Money cents={movement.amountCents} currency={account?.currency ?? "ARS"} className="font-semibold" />
        </p>
      ) : (
        <div className="card"><MovementForm accounts={accounts} categories={categories} movement={movement} /></div>
      )}
      <form action={deleteMovement.bind(null, movement.id)}>
        <button type="submit" className="btn-ghost w-full text-danger">Borrar movimiento</button>
      </form>
    </div>
  );
}
