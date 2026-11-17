import { useMemo, useState } from "react";
import { href, navigate } from "@/router";
import { getData, update, useData } from "@/store/store";
import type { Exercise } from "@/store/types";
import type { Measure, DraftSet, SessionDraft } from "@/lib/training/types";
import { draftFromDay, emptySet, type DayExercise } from "@/lib/training/draft-from-day";
import { addExercise, finishSession, lastSets, setDraft } from "@/store/ops/training";
import { localToday } from "@/lib/dates";
import { SetField } from "@/components/set-field";

const FIELDS: Record<Measure, { key: keyof DraftSet; label: string; mode: "numeric" | "decimal" }[]> = {
  reps_weight: [{ key: "reps", label: "Reps", mode: "numeric" }, { key: "weightKg", label: "Kg", mode: "decimal" }],
  time: [{ key: "durationSec", label: "Segundos", mode: "numeric" }],
  distance: [{ key: "distanceM", label: "Metros", mode: "decimal" }],
};

function newDraft(dayId: string | null): { draft: SessionDraft; dayName: string } {
  const data = getData();
  const routine = dayId ? data.routines.find((r) => r.days.some((d) => d.id === dayId)) : undefined;
  const day = routine?.days.find((d) => d.id === dayId);
  const exerciseById = new Map(data.exercises.map((e) => [e.id, e]));
  const dayExercises: DayExercise[] = (day?.exercises ?? []).flatMap((e) => {
    const ex = exerciseById.get(e.exerciseId);
    return ex ? [{ exerciseId: ex.id, name: ex.name, measure: ex.measure, targetSets: e.targetSets, targetReps: e.targetReps, targetWeight: e.targetWeight }] : [];
  });
  const draft = draftFromDay(dayExercises, lastSets(data, dayExercises.map((e) => e.exerciseId)), routine?.id ?? null, day?.id ?? null, localToday());
  return { draft, dayName: day?.name ?? "Entrenamiento libre" };
}

export function SesionScreen({ query }: { query: Record<string, string> }) {
  const data = useData();
  const dayId = query.dia || null;
  const [adding, setAdding] = useState(false);

  // The draft lives in the store so it is persisted on every change and included in backups.
  const resumed = data.draft != null;
  const draft = useMemo(() => {
    if (data.draft) return data.draft;
    const fresh = newDraft(dayId);
    queueMicrotask(() => update((d) => (d.draft ? d : setDraft(d, fresh.draft))));
    return fresh.draft;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.draft, dayId]);

  const dayName = useMemo(() => {
    const day = data.routines.flatMap((r) => r.days).find((d) => d.id === draft.routineDayId);
    return day?.name ?? "Entrenamiento libre";
  }, [data.routines, draft.routineDayId]);

  const edit = (fn: (d: SessionDraft) => SessionDraft) => update((d) => setDraft(d, fn(structuredClone(d.draft ?? draft))));

  function discard() {
    const fresh = newDraft(dayId);
    update((d) => setDraft(d, fresh.draft));
  }

  function finish() {
    const current = getData().draft ?? draft;
    update((d) => finishSession(d, current, new Date().toISOString()));
    navigate(`/entrenamiento/historial/${current.date}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <a href={href("/entrenamiento")} className="text-sm text-accent">‹ Entrenamiento</a>
      <div>
        <h1 className="text-2xl font-bold">{dayName}</h1>
        <input type="date" value={draft.date} aria-label="Fecha" onChange={(e) => e.target.value && edit((d) => ({ ...d, date: e.target.value }))}
          className="mt-1 bg-transparent text-sm text-muted" />
      </div>
      {resumed && (
        <div className="card flex items-center justify-between gap-2 text-sm">
          <span>Sesión en curso: podés seguir cargando.</span>
          <button type="button" onClick={() => { if (confirm("¿Descartar lo cargado y empezar de nuevo?")) discard(); }} className="text-danger">Descartar</button>
        </div>
      )}

      {draft.exercises.map((ex, ei) => (
        <section key={`${draft.clientId}-${ex.exerciseId}-${ei}-${draft.exercises.length}`} className="card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{ex.name}</h2>
            <button type="button" aria-label={`Quitar ${ex.name}`} className="text-muted" onClick={() => edit((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== ei) }))}>✕</button>
          </div>
          {ex.sets.map((set, si) => (
            <div key={`${si}-${ex.sets.length}`} className="flex items-center gap-2">
              <span className="w-6 text-center text-sm text-muted">{si + 1}</span>
              {FIELDS[ex.measure].map((f) => (
                <SetField key={f.key} label={f.label} ariaLabel={`${f.label} serie ${si + 1}`} mode={f.mode} value={set[f.key]}
                  onValue={(v) => edit((d) => { d.exercises[ei].sets[si][f.key] = v; return d; })} />
              ))}
              <button type="button" aria-label={`Quitar serie ${si + 1}`} className="px-1 text-muted" onClick={() => edit((d) => { d.exercises[ei].sets.splice(si, 1); return d; })}>−</button>
            </div>
          ))}
          <button type="button" className="self-start text-sm text-accent" onClick={() => edit((d) => { const s = d.exercises[ei].sets; s.push({ ...(s.at(-1) ?? emptySet()) }); return d; })}>+ Serie</button>
        </section>
      ))}

      {adding ? (
        <AddExercise library={data.exercises} onCancel={() => setAdding(false)}
          onAdd={(e) => { edit((d) => ({ ...d, exercises: [...d.exercises, { exerciseId: e.id, name: e.name, measure: e.measure, sets: [emptySet()] }] })); setAdding(false); }} />
      ) : (
        <button type="button" className="btn-ghost" onClick={() => setAdding(true)}>+ Agregar ejercicio</button>
      )}

      <button type="button" className="btn-primary" disabled={draft.exercises.length === 0} onClick={finish}>Terminar</button>
    </div>
  );
}

function AddExercise({ library, onAdd, onCancel }: { library: Exercise[]; onAdd: (e: Exercise) => void; onCancel: () => void }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [measure, setMeasure] = useState<Measure>("reps_weight");
  return (
    <div className="card flex flex-col gap-2">
      <select value={id} onChange={(e) => setId(e.target.value)} className="input" aria-label="Ejercicio">
        <option value="">Nuevo ejercicio…</option>
        {library.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      {!id && (
        <div className="grid grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="input" />
          <select value={measure} onChange={(e) => setMeasure(e.target.value as Measure)} className="input" aria-label="Se mide en">
            <option value="reps_weight">Reps y peso</option>
            <option value="time">Tiempo</option>
            <option value="distance">Distancia</option>
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn-primary flex-1" onClick={() => {
          if (id) { const e = library.find((x) => x.id === id); if (e) onAdd(e); return; }
          if (!name.trim()) return;
          update((d) => addExercise(d, name, measure));
          const created = getData().exercises.at(-1);
          if (created) onAdd(created);
        }}>Agregar</button>
      </div>
    </div>
  );
}
