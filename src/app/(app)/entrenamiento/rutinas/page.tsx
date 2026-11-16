import Link from "next/link";
import { getRoutines } from "@/lib/training/queries";
import { createRoutine, setActiveRoutine } from "../actions";

export default async function RutinasPage() {
  const routines = await getRoutines();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/entrenamiento" className="text-sm text-accent">‹ Entrenamiento</Link>
      <h1 className="text-2xl font-bold">Rutinas</h1>
      <ul className="flex flex-col gap-2">
        {routines.map((r) => (
          <li key={r.id} className="card flex items-center justify-between gap-2">
            <Link href={`/entrenamiento/rutinas/${r.id}`} className="font-semibold">{r.name}</Link>
            {r.isActive ? (
              <span className="rounded-full bg-accent/20 px-3 py-1 text-xs text-accent">Activa</span>
            ) : (
              <form action={setActiveRoutine.bind(null, r.id)}><button className="text-sm text-muted">Activar</button></form>
            )}
          </li>
        ))}
      </ul>
      <form action={createRoutine} className="card flex flex-col gap-2">
        <h2 className="font-semibold">Nueva rutina</h2>
        <input name="name" required placeholder="Ej. Fuerza 3 días" className="input" />
        <button className="btn-primary">Crear</button>
      </form>
    </div>
  );
}
