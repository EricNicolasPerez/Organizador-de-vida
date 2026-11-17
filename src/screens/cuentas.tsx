import { useState, type FormEvent } from "react";
import { href } from "@/router";
import { update, useData } from "@/store/store";
import { accountBalance } from "@/lib/finance/balances";
import { parseAmount } from "@/lib/money";
import { addAccount, adjustBalance, renameAccount, setAccountArchived } from "@/store/ops/finance";
import { Money } from "@/components/money";

/** "1.234,50" → cents, "-500" → negative cents, "0" / "0,00" → 0, invalid → null. */
function parseSigned(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  if (/^-?[0.,]+$/.test(s)) return 0;
  const negative = s.startsWith("-");
  const parsed = parseAmount(negative ? s.slice(1) : s);
  return parsed == null ? null : negative ? -parsed : parsed;
}

export function CuentasScreen() {
  const { accounts, movements } = useData();
  return (
    <div className="flex flex-col gap-4">
      <a href={href("/finanzas")} className="text-sm text-accent">‹ Finanzas</a>
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
                  {a.type === "credit_card"
                    ? <><p className="label">Debés</p><Money cents={Math.max(0, -balance)} currency={a.currency} className="font-bold text-danger" /></>
                    : <Money cents={balance} currency={a.currency} className="font-bold" />}
                </div>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-accent">Editar</summary>
                <div className="mt-3 flex flex-col gap-3">
                  <RenameForm initial={a.name} onSave={(name) => update((d) => renameAccount(d, a.id, name))} />
                  {a.type === "cash" && <AdjustForm accountId={a.id} />}
                  <button type="button" className="self-start text-muted" onClick={() => update((d) => setAccountArchived(d, a.id, !a.archived))}>
                    {a.archived ? "Reactivar cuenta" : "Archivar cuenta"}
                  </button>
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

export function RenameForm({ initial, onSave }: { initial: string; onSave: (name: string) => void }) {
  const [name, setName] = useState(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(name); }} className="flex gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} className="input" aria-label="Nombre" />
      <button className="btn-ghost">Guardar</button>
    </form>
  );
}

function NewAccountForm() {
  const [type, setType] = useState<"cash" | "credit_card">("cash");
  const [error, setError] = useState<string | null>(null);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const name = String(f.get("name") ?? "").trim();
    if (!name) { setError("Poné un nombre"); return; }
    const raw = String(f.get("initialBalance") ?? "").trim();
    const initial = raw === "" ? 0 : parseSigned(raw);
    if (initial == null) { setError("Saldo inicial inválido"); return; }
    const currency = f.get("currency") === "USD" ? "USD" : "ARS";
    update((d) => addAccount(d, { name, type, currency, initialBalanceCents: initial }));
    setError(null);
    form.reset();
    setType("cash");
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input name="name" placeholder="Nombre (ej. Mercado Pago)" required className="input" />
      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as "cash" | "credit_card")} className="input" aria-label="Tipo">
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn-primary">Crear cuenta</button>
    </form>
  );
}

function AdjustForm({ accountId }: { accountId: string }) {
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const real = parseSigned(value);
      if (real == null) { setMsg({ ok: false, text: "Ingresá el saldo real" }); return; }
      update((d) => adjustBalance(d, accountId, real));
      setMsg({ ok: true, text: "Saldo ajustado" });
      setValue("");
    }} className="flex flex-col gap-2">
      <label className="label" htmlFor={`real-${accountId}`}>Ajustar saldo: ¿cuánto tenés realmente?</label>
      <div className="flex gap-2">
        <input id={`real-${accountId}`} value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="0,00" className="input" />
        <button className="btn-ghost">Ajustar</button>
      </div>
      {msg && <p className={msg.ok ? "text-success" : "text-danger"}>{msg.text}</p>}
    </form>
  );
}
