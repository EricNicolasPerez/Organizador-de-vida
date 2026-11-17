import { useState, type FormEvent } from "react";
import { href } from "@/router";
import { update, useData } from "@/store/store";
import { addCategory, renameCategory, setCategoryArchived } from "@/store/ops/finance";
import { RenameForm } from "./cuentas";

export function CategoriasScreen() {
  const { categories } = useData();
  const groups = [{ kind: "expense", title: "Gastos" }, { kind: "income", title: "Ingresos" }] as const;
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const name = String(f.get("name") ?? "").trim();
    if (!name) { setError("Poné un nombre"); return; }
    update((d) => addCategory(d, { name, kind: f.get("kind") === "income" ? "income" : "expense" }));
    setError(null);
    form.reset();
  }

  return (
    <div className="flex flex-col gap-4">
      <a href={href("/finanzas")} className="text-sm text-accent">‹ Finanzas</a>
      <h1 className="text-2xl font-bold">Categorías</h1>
      {groups.map((g) => (
        <section key={g.kind} className="flex flex-col gap-2">
          <h2 className="font-semibold">{g.title}</h2>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
            {categories.filter((c) => c.kind === g.kind).map((c) => (
              <li key={c.id} className={`flex items-center gap-2 px-3 py-2 text-sm ${c.archived ? "opacity-50" : ""}`}>
                <div className="flex-1"><RenameForm initial={c.name} onSave={(name) => update((d) => renameCategory(d, c.id, name))} /></div>
                <button type="button" className="text-muted" onClick={() => update((d) => setCategoryArchived(d, c.id, !c.archived))}>
                  {c.archived ? "Reactivar" : "Archivar"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="card">
        <h2 className="mb-3 font-semibold">Nueva categoría</h2>
        <form onSubmit={submit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input name="name" placeholder="Nombre" required className="input" />
            <select name="kind" defaultValue="expense" className="input w-36" aria-label="Tipo">
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary">Agregar</button>
        </form>
      </section>
    </div>
  );
}
