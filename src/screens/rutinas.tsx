import { useState, type FormEvent } from "react";
import { href, navigate } from "@/router";
import { getData, update, useData } from "@/store/store";
import { addRoutine, setActiveRoutine } from "@/store/ops/training";

export function RutinasScreen() {
  const { routines } = useData();
  const [name, setName] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    update((d) => addRoutine(d, name));
    const created = getData().routines.at(-1);
    setName("");
    if (created) navigate(`/entrenamiento/rutinas/${created.id}`);
  }
  return (
    <div className="flex flex-col gap-4">
      <a href={href("/entrenamiento")} className="text-sm text-accent">‹ Entrenamiento</a>
      <h1 className="text-2xl font-bold">Rutinas</h1>
      <ul className="flex flex-col gap-2">
        {routines.map((r) => (
          <li key={r.id} className="card flex items-center justify-between gap-2">
            <a href={href(`/entrenamiento/rutinas/${r.id}`)} className="font-semibold">{r.name}</a>
            {r.isActive
              ? <span className="rounded-full bg-accent/20 px-3 py-1 text-xs text-accent">Activa</span>
              : <button type="button" className="text-sm text-muted" onClick={() => update((d) => setActiveRoutine(d, r.id))}>Activar</button>}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="card flex flex-col gap-2">
        <h2 className="font-semibold">Nueva rutina</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej. Fuerza 3 días" className="input" />
        <button className="btn-primary">Crear</button>
      </form>
    </div>
  );
}
