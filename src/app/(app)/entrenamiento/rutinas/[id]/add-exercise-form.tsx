"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addDayExercise, type FormState } from "../../actions";
import type { Exercise } from "@/lib/training/queries";

export function AddExerciseForm({ dayId, exercises }: { dayId: string; exercises: Exercise[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addDayExercise.bind(null, dayId), { error: null });
  const [exerciseId, setExerciseId] = useState("");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <select name="exerciseId" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} className="input" aria-label="Ejercicio">
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
      {state.error && <p className="text-danger">{state.error}</p>}
      <button disabled={pending} className="btn-primary">Agregar</button>
    </form>
  );
}
