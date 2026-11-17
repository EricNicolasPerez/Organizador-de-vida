"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { adjustBalance, createAccount, type FormState } from "../actions";

export function NewAccountForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createAccount, { error: null });
  const [type, setType] = useState("cash");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ok]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <input name="name" placeholder="Nombre (ej. Mercado Pago)" required className="input" />
      <div className="grid grid-cols-2 gap-2">
        <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="input" aria-label="Tipo">
          <option value="cash">Disponible</option>
          <option value="credit_card">Tarjeta de crédito</option>
        </select>
        <select name="currency" defaultValue="ARS" disabled={type === "credit_card"} className="input" aria-label="Moneda">
          <option value="ARS">Pesos (ARS)</option>
          <option value="USD">Dólares (USD)</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="initialBalance">{type === "credit_card" ? "Lo que debés hoy" : "Saldo actual"}</label>
        <input id="initialBalance" name="initialBalance" inputMode="decimal" placeholder="0,00" className="input" />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="btn-primary">{pending ? "Creando…" : "Crear cuenta"}</button>
    </form>
  );
}

export function AdjustForm({ accountId }: { accountId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(adjustBalance.bind(null, accountId), { error: null });
  return (
    <form action={action} className="flex flex-col gap-2">
      <label className="label" htmlFor={`real-${accountId}`}>Ajustar saldo: ¿cuánto tenés realmente?</label>
      <div className="flex gap-2">
        <input id={`real-${accountId}`} name="real" inputMode="decimal" placeholder="0,00" className="input" />
        <button disabled={pending} className="btn-ghost">Ajustar</button>
      </div>
      {state.error && <p className="text-danger">{state.error}</p>}
      {state.ok && !state.error && <p className="text-success">Saldo ajustado</p>}
    </form>
  );
}
