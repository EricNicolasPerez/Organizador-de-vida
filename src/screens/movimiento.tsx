import { href, navigate } from "@/router";
import { update, useData } from "@/store/store";
import { deleteMovement } from "@/store/ops/finance";
import { MovementForm } from "@/components/movement-form";
import { Money } from "@/components/money";

export function MovimientoScreen({ id }: { id: string }) {
  const { accounts, categories, movements } = useData();
  const movement = movements.find((m) => m.id === id);
  if (!movement) {
    return <div className="flex flex-col gap-4"><a href={href("/finanzas")} className="text-sm text-accent">‹ Finanzas</a><p className="text-muted">Movimiento no encontrado.</p></div>;
  }
  const account = accounts.find((a) => a.id === movement.accountId);
  return (
    <div className="flex flex-col gap-4">
      <a href={href("/finanzas")} className="text-sm text-accent">‹ Finanzas</a>
      <h1 className="text-2xl font-bold">{movement.kind === "adjustment" ? "Ajuste de saldo" : "Editar movimiento"}</h1>
      {movement.kind === "adjustment" ? (
        <p className="card">{account?.name}: <Money cents={movement.amountCents} currency={account?.currency ?? "ARS"} className="font-semibold" /></p>
      ) : (
        <div className="card"><MovementForm accounts={accounts} categories={categories} movement={movement} onSaved={() => navigate("/finanzas")} /></div>
      )}
      <button type="button" className="btn-ghost w-full text-danger"
        onClick={() => { if (confirm("¿Borrar este movimiento?")) { update((d) => deleteMovement(d, movement.id)); navigate("/finanzas"); } }}>
        Borrar movimiento
      </button>
    </div>
  );
}
