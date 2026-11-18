import { useState, type FormEvent } from "react";
import { href, navigate } from "@/router";
import { update, useData } from "@/store/store";
import type { Exercise } from "@/store/types";
import type { Measure } from "@/lib/training/types";
import {
  addDay, addDayExercise, deleteDay, deleteRoutine, moveDay, removeDayExercise, renameDay, renameRoutine, setActiveRoutine,
} from "@/store/ops/training";
import { RenameForm } from "./cuentas";
import { formatSetValue } from "@/lib/training/set-input";

const MEASURE_LABEL: Record<Measure, string> = { reps_weight: "reps × kg", time: "tiempo", distance: "distancia" };

export function RutinaScreen({ id }: { id: string }) {
  const data = useData();
  const routine = data.routines.find((r) => r.id === id);
  const [newDay, setNewDay] = useState("");
  if (!routine) {
    return <div className="flex flex-col gap-4"><a href={href("/entrenamiento/rutinas")} className="text-sm text-accent">‹ Rutinas</a><p className="text-muted">Rutina no encontrada.</p></div>;
  }
  const exerciseById = new Map(data.exercises.map((e) => [e.id, e]));

  return (
    <div className="flex flex-col gap-4">
      <a href={href("/entrenamiento/rutinas")} className="text-sm text-accent">‹ Rutinas</a>
      <RenameForm initial={routine.name} onSave={(name) => update((d) => renameRoutine(d, routine.id, name))} />
      {!routine.isActive && (
        <button type="button" className="btn-ghost w-full" onClick={() => update((d) => setActiveRoutine(d, routine.id))}>Usar esta rutina</button>
      )}

      {routine.days.map((day, i) => (
        <section key={day.id} className="card flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex-1"><RenameForm initial={day.name} onSave={(name) => update((d) => renameDay(d, routine.id, day.id, name))} /></div>
            <button type="button" disabled={i === 0} aria-label="Subir" className="px-1 disabled:opacity-30" onClick={() => update((d) => moveDay(d, routine.id, day.id, -1))}>↑</button>
            <button type="button" disabled={i === routine.days.length - 1} aria-label="Bajar" className="px-1 disabled:opacity-30" onClick={() => update((d) => moveDay(d, routine.id, day.id, 1))}>↓</button>
          </div>
          <ul className="flex flex-col gap-1 text-sm">
            {day.exercises.map((e) => {
              const ex = exerciseById.get(e.exerciseId);
              const measure = ex?.measure ?? "reps_weight";
              return (
                <li key={e.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
                  <span>
                    {ex?.name ?? "Ejercicio borrado"}{" "}
                    <span className="text-muted">
                      {e.targetSets} series{measure === "reps_weight" && e.targetReps ? ` × ${e.targetReps}` : ""}
                      {e.targetWeight ? ` · ${formatSetValue(e.targetWeight)} kg` : ""}
                      {measure !== "reps_weight" ? ` · ${MEASURE_LABEL[measure]}` : ""}
                    </span>
                  </span>
                  <button type="button" aria-label={`Quitar ${ex?.name ?? "ejercicio"}`} className="text-muted" onClick={() => update((d) => removeDayExercise(d, routine.id, day.id, e.id))}>✕</button>
                </li>
              );
            })}
          </ul>
          <details className="text-sm">
            <summary className="cursor-pointer text-accent">+ Agregar ejercicio</summary>
            <div className="mt-3"><AddExerciseForm routineId={routine.id} dayId={day.id} exercises={data.exercises} /></div>
          </details>
          <button type="button" className="self-start text-xs text-muted" onClick={() => { if (confirm(`¿Borrar ${day.name}? Las sesiones ya hechas se conservan.`)) update((d) => deleteDay(d, routine.id, day.id)); }}>Borrar día</button>
        </section>
      ))}

      <form onSubmit={(e) => { e.preventDefault(); update((d) => addDay(d, routine.id, newDay)); setNewDay(""); }} className="card flex gap-2">
        <input value={newDay} onChange={(e) => setNewDay(e.target.value)} required placeholder={`Día ${String.fromCharCode(65 + routine.days.length)} – Pecho/Tríceps`} className="input" />
        <button className="btn-primary whitespace-nowrap">Agregar día</button>
      </form>

      <button type="button" className="w-full py-2 text-sm text-danger"
        onClick={() => { if (confirm("¿Borrar esta rutina? Las sesiones ya hechas se conservan.")) { update((d) => deleteRoutine(d, routine.id)); navigate("/entrenamiento/rutinas"); } }}>
        Borrar rutina
      </button>
    </div>
  );
}

function AddExerciseForm({ routineId, dayId, exercises }: { routineId: string; dayId: string; exercises: Exercise[] }) {
  const [exerciseId, setExerciseId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const optInt = (v: string) => (v === "" ? null : /^\d+$/.test(v) && Number(v) > 0 ? Number(v) : NaN);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const newName = String(f.get("newName") ?? "").trim();
    if (!exerciseId && !newName) { setError("Elegí un ejercicio o escribí uno nuevo"); return; }
    const targetSets = optInt(String(f.get("targetSets") ?? "").trim()) ?? 3;
    const targetReps = optInt(String(f.get("targetReps") ?? "").trim());
    const rawWeight = String(f.get("targetWeight") ?? "").trim().replace(",", ".");
    const targetWeight = rawWeight === "" ? null : Number(rawWeight);
    if (Number.isNaN(targetSets) || targetSets > 20 || Number.isNaN(targetReps) || (targetWeight != null && !(targetWeight >= 0))) {
      setError("Revisá series, repeticiones y peso"); return;
    }
    const measure = String(f.get("measure") ?? "reps_weight") as Measure;
    update((d) => addDayExercise(d, routineId, dayId, {
      exerciseId: exerciseId || undefined, newName: exerciseId ? undefined : newName, measure, targetSets, targetReps, targetWeight,
    }));
    setError(null);
    form.reset();
    setExerciseId("");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} className="input" aria-label="Ejercicio">
        <option value="">Nuevo ejercicio…</option>
        {exercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      {!exerciseId && (
        <div className="grid grid-cols-2 gap-2">
          <input name="newName" placeholder="Nombre (ej. Sentadilla)" className="input" />
          <select name="measure" defaultValue="reps_weight" className="input" aria-label="Se mide en">
            <option value="reps_weight">Reps y peso</option>
            <option value="time">Tiempo</option>
            <option value="distance">Distancia</option>
          </select>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <input name="targetSets" inputMode="numeric" placeholder="Series (3)" className="input" />
        <input name="targetReps" inputMode="numeric" placeholder="Reps" className="input" />
        <input name="targetWeight" inputMode="decimal" placeholder="Kg" className="input" />
      </div>
      {error && <p className="text-danger">{error}</p>}
      <button className="btn-primary">Agregar</button>
    </form>
  );
}
