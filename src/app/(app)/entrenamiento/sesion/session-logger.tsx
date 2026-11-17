"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { draftFromDay, emptySet, type DayExercise } from "@/lib/training/draft-from-day";
import {
  browserStore, clearDraft, enqueuePending, flushPending, loadDraft, saveDraft,
  type DraftSet, type SessionDraft,
} from "@/lib/training/session-draft";
import type { Exercise } from "@/lib/training/queries";
import type { Measure } from "@/lib/training/types";
import { localToday } from "@/lib/dates";
import { createExercise } from "../actions";
import { formatSetValue, parseSetInput } from "@/lib/training/set-input";

export async function uploadSession(d: SessionDraft) {
  const { error } = await createClient().rpc("save_workout_session", { payload: d });
  // SQLSTATE class 22 (bad data) and 23 (integrity, e.g. a deleted exercise) will never succeed on retry.
  if (error) throw Object.assign(new Error(error.message), { permanent: /^2[23]/.test(error.code ?? "") });
}

export const isPermanentUploadError = (e: unknown) => (e as { permanent?: boolean })?.permanent === true;

const FIELDS: Record<Measure, { key: keyof DraftSet; label: string; mode: "numeric" | "decimal" }[]> = {
  reps_weight: [{ key: "reps", label: "Reps", mode: "numeric" }, { key: "weightKg", label: "Kg", mode: "decimal" }],
  time: [{ key: "durationSec", label: "Segundos", mode: "numeric" }],
  distance: [{ key: "distanceM", label: "Metros", mode: "decimal" }],
};

export function SessionLogger({
  dayName, routineId, routineDayId, dayExercises, lastSets, library,
}: {
  dayName: string;
  routineId: string | null;
  routineDayId: string | null;
  dayExercises: DayExercise[];
  lastSets: Record<string, DraftSet[]>;
  library: Exercise[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [resumed, setResumed] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "offline" | "rejected">("idle");
  const [adding, setAdding] = useState(false);

  // Load (or create) the draft once on the client; localStorage is not available on the server.
  useEffect(() => {
    const store = browserStore();
    const existing = loadDraft(store);
    const next = existing ?? draftFromDay(dayExercises, lastSets, routineId, routineDayId, localToday());
    if (!existing) saveDraft(store, next);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from device storage
    setDraft(next);
    setResumed(Boolean(existing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(fn: (d: SessionDraft) => SessionDraft) {
    setDraft((d) => {
      if (!d) return d;
      const next = fn(structuredClone(d));
      saveDraft(browserStore(), next);
      return next;
    });
  }

  function discard() {
    const store = browserStore();
    clearDraft(store);
    const fresh = draftFromDay(dayExercises, lastSets, routineId, routineDayId, localToday());
    saveDraft(store, fresh);
    setDraft(fresh);
    setResumed(false);
  }

  async function finish() {
    if (!draft) return;
    setStatus("saving");
    const store = browserStore();
    const cleaned = { ...draft, exercises: draft.exercises.filter((e) => e.sets.length > 0) };
    enqueuePending(store, cleaned);
    clearDraft(store);
    const { results } = await flushPending(store, uploadSession, isPermanentUploadError);
    const outcome = results[cleaned.clientId];
    if (outcome === "failed") {
      setStatus("offline");
      return;
    }
    if (outcome === "rejected") {
      setStatus("rejected");
      return;
    }
    router.push(`/entrenamiento/historial/${cleaned.date}`);
    router.refresh();
  }

  if (status === "offline") {
    return (
      <div className="card flex flex-col gap-3">
        <p className="text-lg font-semibold">Guardado en el celular</p>
        <p className="text-sm text-muted">No hay conexión. Tu sesión quedó guardada y se subirá sola cuando vuelva la señal.</p>
        <button className="btn-primary" onClick={() => { router.push("/entrenamiento"); }}>Listo</button>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="card flex flex-col gap-3">
        <p className="text-lg font-semibold">No se pudo guardar la sesión</p>
        <p className="text-sm text-muted">El servidor rechazó los datos (por ejemplo, un ejercicio que ya no existe). La sesión quedó guardada en el celular como &quot;no subida&quot;.</p>
        <button className="btn-primary" onClick={() => { router.push("/entrenamiento"); }}>Volver</button>
      </div>
    );
  }
  if (!draft) return <p className="text-muted">Cargando…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{resumed ? "Sesión en curso" : dayName}</h1>
        <input
          type="date" value={draft.date} aria-label="Fecha"
          onChange={(e) => e.target.value && update((d) => ({ ...d, date: e.target.value }))}
          className="mt-1 bg-transparent text-sm text-muted"
        />
      </div>
      {resumed && (
        <div className="card flex items-center justify-between gap-2 text-sm">
          <span>Retomamos la sesión que tenías sin terminar.</span>
          <button onClick={discard} className="text-danger">Descartar</button>
        </div>
      )}

      {draft.exercises.map((ex, ei) => (
        <section key={`${ex.exerciseId}-${ei}-${draft.exercises.length}`} className="card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{ex.name}</h2>
            <button aria-label={`Quitar ${ex.name}`} className="text-muted"
              onClick={() => update((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== ei) }))}>✕</button>
          </div>
          {ex.sets.map((set, si) => (
            <div key={`${si}-${ex.sets.length}`} className="flex items-center gap-2">
              <span className="w-6 text-center text-sm text-muted">{si + 1}</span>
              {FIELDS[ex.measure].map((f) => (
                <SetField
                  key={f.key}
                  label={f.label}
                  ariaLabel={`${f.label} serie ${si + 1}`}
                  mode={f.mode}
                  value={set[f.key]}
                  onValue={(v) => update((d) => { d.exercises[ei].sets[si][f.key] = v; return d; })}
                />
              ))}
              <button aria-label={`Quitar serie ${si + 1}`} className="px-1 text-muted"
                onClick={() => update((d) => { d.exercises[ei].sets.splice(si, 1); return d; })}>−</button>
            </div>
          ))}
          <button className="self-start text-sm text-accent"
            onClick={() => update((d) => { const s = d.exercises[ei].sets; s.push({ ...(s.at(-1) ?? emptySet()) }); return d; })}>
            + Serie
          </button>
        </section>
      ))}

      {adding ? (
        <AddExercise
          library={library}
          onCancel={() => setAdding(false)}
          onAdd={(e) => {
            update((d) => ({ ...d, exercises: [...d.exercises, { exerciseId: e.id, name: e.name, measure: e.measure, sets: [emptySet()] }] }));
            setAdding(false);
          }}
        />
      ) : (
        <button className="btn-ghost" onClick={() => setAdding(true)}>+ Agregar ejercicio</button>
      )}

      <button className="btn-primary" disabled={status === "saving" || draft.exercises.length === 0} onClick={finish}>
        {status === "saving" ? "Guardando…" : "Terminar"}
      </button>
    </div>
  );
}

function AddExercise({ library, onAdd, onCancel }: {
  library: Exercise[];
  onAdd: (e: { id: string; name: string; measure: Measure }) => void;
  onCancel: () => void;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [measure, setMeasure] = useState<Measure>("reps_weight");
  const [error, setError] = useState<string | null>(null);
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary flex-1" onClick={async () => {
          if (id) { const e = library.find((x) => x.id === id)!; onAdd(e); return; }
          const created = await createExercise(name, measure).catch(() => null);
          if (!created) { setError("No se pudo crear (¿sin conexión?). Elegí uno de la lista."); return; }
          onAdd(created);
        }}>Agregar</button>
      </div>
    </div>
  );
}

/** Keeps the raw text the user types ("22,") and reports the parsed number upward. */
function SetField({ label, ariaLabel, mode, value, onValue }: {
  label: string;
  ariaLabel: string;
  mode: "numeric" | "decimal";
  value: number | null;
  onValue: (v: number | null) => void;
}) {
  const kind = mode === "numeric" ? "integer" : "decimal";
  const [text, setText] = useState(() => formatSetValue(value));
  const parsed = parseSetInput(text, kind);
  return (
    <label className="flex flex-1 items-center gap-1">
      <input
        inputMode={mode}
        aria-label={ariaLabel}
        aria-invalid={parsed === undefined}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const v = parseSetInput(e.target.value, kind);
          if (v !== undefined) onValue(v);
        }}
        onBlur={() => { if (parsed !== undefined) setText(formatSetValue(parsed)); }}
        className={`input py-2 text-center tabular-nums ${parsed === undefined ? "border-danger" : ""}`}
      />
      <span className="text-xs text-muted">{label}</span>
    </label>
  );
}
