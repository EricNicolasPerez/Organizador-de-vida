import Link from "next/link";
import { getAccountsAndCategories } from "@/lib/finance/queries";
import { renameCategory, setCategoryArchived } from "../actions";
import { NewCategoryForm } from "./new-category-form";

export default async function CategoriasPage() {
  const { categories } = await getAccountsAndCategories();
  const groups = [
    { kind: "expense", title: "Gastos" },
    { kind: "income", title: "Ingresos" },
  ] as const;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/finanzas" className="text-sm text-accent">‹ Finanzas</Link>
      <h1 className="text-2xl font-bold">Categorías</h1>
      {groups.map((g) => (
        <section key={g.kind} className="flex flex-col gap-2">
          <h2 className="font-semibold">{g.title}</h2>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
            {categories.filter((c) => c.kind === g.kind).map((c) => (
              <li key={c.id} className={`flex items-center gap-2 px-3 py-2 ${c.archived ? "opacity-50" : ""}`}>
                <form action={renameCategory.bind(null, c.id)} className="flex flex-1 gap-2">
                  <input name="name" defaultValue={c.name} aria-label="Nombre" className="flex-1 bg-transparent py-1 outline-none" />
                  <button className="text-sm text-accent">Guardar</button>
                </form>
                <form action={setCategoryArchived.bind(null, c.id, !c.archived)}>
                  <button className="text-sm text-muted">{c.archived ? "Reactivar" : "Archivar"}</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="card">
        <h2 className="mb-3 font-semibold">Nueva categoría</h2>
        <NewCategoryForm />
      </section>
    </div>
  );
}
