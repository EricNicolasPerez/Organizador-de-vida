"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { saveMovement, type FormState } from "@/app/(app)/finanzas/actions";
import type { Account, Category, Movement } from "@/lib/finance/types";
import { centsToInput } from "@/lib/money";
import { localToday } from "@/lib/dates";

type Kind = "expense" | "income" | "transfer";
const KINDS: { value: Kind; label: string }[] = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
  { value: "transfer", label: "Transferencia" },
];

const LAST_ACCOUNT = "atlas.lastAccount";
const lastCategoryKey = (k: Kind) => `atlas.lastCategory.${k}`;
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export function MovementForm({
  accounts, categories, movement, onSaved,
}: {
  accounts: Account[];
  categories: Category[];
  movement?: Movement;
  onSaved?: () => void;
}) {
  const active = accounts.filter((a) => !a.archived || a.id === movement?.accountId || a.id === movement?.toAccountId);
  const [state, action, pending] = useActionState<FormState, FormData>(saveMovement, { error: null });
  const [kind, setKind] = useState<Kind>((movement?.kind as Kind) ?? "expense");
  // New movements are only rendered client-side (inside the quick-add sheet), so reading
  // localStorage in the initializers is safe; edits take their values from the movement.
  const [accountId, setAccountId] = useState(() => {
    if (movement) return movement.accountId;
    const last = read(LAST_ACCOUNT);
    return last && active.some((a) => a.id === last) ? last : active[0]?.id ?? "";
  });
  const [toAccountId, setToAccountId] = useState(movement?.toAccountId ?? "");
  const [pickedCategory, setCategoryId] = useState(movement?.categoryId ?? "");
  const [date, setDate] = useState(() => movement?.date ?? localToday());
  const formRef = useRef<HTMLFormElement>(null);

  const kindCategories = useMemo(
    () => categories.filter((c) => c.kind === (kind === "income" ? "income" : "expense") && (!c.archived || c.id === pickedCategory)),
    [categories, kind, pickedCategory],
  );
  // Effective category: the picked one if valid for this kind, else last used, else first.
  const categoryId = kindCategories.some((c) => c.id === pickedCategory)
    ? pickedCategory
    : (() => {
        const last = read(lastCategoryKey(kind));
        return last && kindCategories.some((c) => c.id === last) ? last : kindCategories[0]?.id ?? "";
      })();

  useEffect(() => {
    if (!state.ok) return;
    write(LAST_ACCOUNT, accountId);
    if (kind !== "transfer" && categoryId) write(lastCategoryKey(kind), categoryId);
    formRef.current?.reset();
    onSaved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  const from = active.find((a) => a.id === accountId);
  const to = active.find((a) => a.id === toAccountId);
  const crossCurrency = kind === "transfer" && from && to && from.currency !== to.currency;

  if (active.length === 0) {
    return <p className="text-sm text-muted">Primero creá una cuenta en Finanzas → Cuentas.</p>;
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      {movement && <input type="hidden" name="id" value={movement.id} />}
      <input type="hidden" name="kind" value={kind} />

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={`rounded-lg py-2 text-sm font-medium ${kind === k.value ? "bg-accent text-white" : "text-muted"}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="amount">{crossCurrency ? "Sale" : "Monto"}{from ? ` (${from.currency})` : ""}</label>
        <input
          autoFocus={!movement} id="amount" name="amount" inputMode="decimal" autoComplete="off" required
          defaultValue={movement ? centsToInput(movement.amountCents) : ""}
          placeholder="0,00" className="input text-2xl font-semibold tabular-nums"
        />
      </div>

      <div>
        <label className="label" htmlFor="accountId">{kind === "transfer" ? "Desde" : "Cuenta"}</label>
        <select id="accountId" name="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
          {active.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}{a.type === "credit_card" ? " · tarjeta" : ""}</option>)}
        </select>
      </div>

      {kind === "transfer" ? (
        <>
          <div>
            <label className="label" htmlFor="toAccountId">Hacia</label>
            <select id="toAccountId" name="toAccountId" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="input" required>
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
          <select id="categoryId" name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
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

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">{pending ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
