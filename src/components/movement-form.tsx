import { useMemo, useState, type FormEvent } from "react";
import type { Account, Category, Movement } from "@/lib/finance/types";
import { centsToInput } from "@/lib/money";
import { localToday } from "@/lib/dates";
import { addMovement, parseMovementFormCents, updateMovement } from "@/store/ops/finance";
import { getData, update } from "@/store/store";

type Kind = "expense" | "income" | "transfer";
const KINDS: { value: Kind; label: string }[] = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
  { value: "transfer", label: "Transferencia" },
];

export function MovementForm({
  accounts, categories, movement, onSaved,
}: {
  accounts: Account[];
  categories: Category[];
  movement?: Movement;
  onSaved: () => void;
}) {
  const settings = getData().settings;
  const active = accounts.filter((a) => !a.archived || a.id === movement?.accountId || a.id === movement?.toAccountId);
  const [kind, setKind] = useState<Kind>((movement?.kind as Kind) ?? "expense");
  const [accountId, setAccountId] = useState(() => {
    if (movement) return movement.accountId;
    const last = settings.lastAccountId;
    return last && active.some((a) => a.id === last) ? last : active[0]?.id ?? "";
  });
  const [toAccountId, setToAccountId] = useState(movement?.toAccountId ?? "");
  const [pickedCategory, setCategoryId] = useState(movement?.categoryId ?? "");
  const [date, setDate] = useState(() => movement?.date ?? localToday());
  const [error, setError] = useState<string | null>(null);

  const kindCategories = useMemo(
    () => categories.filter((c) => c.kind === (kind === "income" ? "income" : "expense") && (!c.archived || c.id === pickedCategory)),
    [categories, kind, pickedCategory],
  );
  const categoryId = kindCategories.some((c) => c.id === pickedCategory)
    ? pickedCategory
    : (() => {
        const last = kind === "transfer" ? null : settings.lastCategoryId[kind];
        return last && kindCategories.some((c) => c.id === last) ? last : kindCategories[0]?.id ?? "";
      })();

  const from = active.find((a) => a.id === accountId);
  const to = active.find((a) => a.id === toAccountId);
  const crossCurrency = kind === "transfer" && from && to && from.currency !== to.currency;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("kind", kind);
    form.set("accountId", accountId);
    form.set("toAccountId", toAccountId);
    form.set("categoryId", categoryId);
    const parsed = parseMovementFormCents(form, active);
    if (!parsed.ok) { setError(parsed.error); return; }
    update((d) => (movement ? updateMovement(d, movement.id, parsed.row) : addMovement(d, parsed.row)));
    onSaved();
  }

  if (active.length === 0) {
    return <p className="text-sm text-muted">Primero creá una cuenta en Finanzas → Cuentas.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {KINDS.map((k) => (
          <button key={k.value} type="button" onClick={() => setKind(k.value)}
            className={`rounded-lg py-2 text-sm font-medium ${kind === k.value ? "bg-accent text-white" : "text-muted"}`}>
            {k.label}
          </button>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="amount">{crossCurrency ? "Sale" : "Monto"}{from ? ` (${from.currency})` : ""}</label>
        <input autoFocus={!movement} id="amount" name="amount" inputMode="decimal" autoComplete="off" required
          defaultValue={movement ? centsToInput(movement.amountCents) : ""} placeholder="0,00"
          className="input text-2xl font-semibold tabular-nums" />
      </div>

      <div>
        <label className="label" htmlFor="accountId">{kind === "transfer" ? "Desde" : "Cuenta"}</label>
        <select id="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
          {active.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}{a.type === "credit_card" ? " · tarjeta" : ""}</option>)}
        </select>
      </div>

      {kind === "transfer" ? (
        <>
          <div>
            <label className="label" htmlFor="toAccountId">Hacia</label>
            <select id="toAccountId" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="input" required>
              <option value="">Elegí una cuenta</option>
              {active.filter((a) => a.id !== accountId).map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.currency}{a.type === "credit_card" ? " · pagar tarjeta" : ""}</option>
              ))}
            </select>
          </div>
          {crossCurrency && (
            <div>
              <label className="label" htmlFor="toAmount">Recibís ({to?.currency})</label>
              <input id="toAmount" name="toAmount" inputMode="decimal" autoComplete="off" required placeholder="0,00"
                defaultValue={movement?.toAmountCents != null ? centsToInput(movement.toAmountCents) : ""} className="input tabular-nums" />
            </div>
          )}
        </>
      ) : (
        <div>
          <label className="label" htmlFor="categoryId">Categoría</label>
          <select id="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
            {kindCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="date">Fecha</label>
          <input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="note">Nota</label>
          <input id="note" name="note" defaultValue={movement?.note ?? ""} placeholder="Opcional" className="input" />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" className="btn-primary">Guardar</button>
    </form>
  );
}
