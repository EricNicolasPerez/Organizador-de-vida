import { useState } from "react";
import { MovementForm } from "./movement-form";
import type { Account, Category } from "@/lib/finance/types";

export function QuickAdd({ accounts, categories }: { accounts: Account[]; categories: Category[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label="Registrar movimiento" onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl text-white shadow-lg shadow-black/40 sm:right-[calc(50%-15rem)]">
        +
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="Nuevo movimiento"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuevo movimiento</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-muted" aria-label="Cerrar">✕</button>
            </div>
            <MovementForm accounts={accounts} categories={categories} onSaved={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
