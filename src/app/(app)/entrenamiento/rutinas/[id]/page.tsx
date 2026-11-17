import Link from "next/link";
import { notFound } from "next/navigation";
import { getExercises, getRoutine } from "@/lib/training/queries";
import { addDay, deleteDay, deleteRoutine, moveDay, removeDayExercise, renameDay, renameRoutine, setActiveRoutine } from "../../actions";
import { AddExerciseForm } from "./add-exercise-form";

const MEASURE_LABEL = { reps_weight: "reps × kg", time: "tiempo", distance: "distancia" };

export default async function RoutinePage({ params }: PageProps<"/entrenamiento/rutinas/[id]">) {
  const { id } = await params;
  const [routine, exercises] = await Promise.all([getRoutine(id), getExercises()]);
  if (!routine) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/entrenamiento/rutinas" className="text-sm text-accent">‹ Rutinas</Link>
      <form action={renameRoutine.bind(null, routine.id)} className="flex gap-2">
        <input name="name" defaultValue={routine.name} aria-label="Nombre de la rutina" className="input text-xl font-bold" />
        <button className="btn-ghost">Guardar</button>
      </form>
      {!routine.isActive && (
        <form action={setActiveRoutine.bind(null, routine.id)}><button className="btn-ghost w-full">Usar esta rutina</button></form>
      )}

      {routine.days.map((day, i) => (
        <section key={day.id} className="card flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <form action={renameDay.bind(null, day.id)} className="flex flex-1 gap-2">
              <input name="name" defaultValue={day.name} aria-label="Nombre del día" className="flex-1 bg-transparent font-semibold outline-none" />
              <button className="text-sm text-accent">Guardar</button>
            </form>
            <form action={moveDay.bind(null, routine.id, day.id, -1)}><button disabled={i === 0} aria-label="Subir" className="px-1 disabled:opacity-30">↑</button></form>
            <form action={moveDay.bind(null, routine.id, day.id, 1)}><button disabled={i === routine.days.length - 1} aria-label="Bajar" className="px-1 disabled:opacity-30">↓</button></form>
          </div>
          <ul className="flex flex-col gap-1 text-sm">
            {day.exercises.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
                <span>
                  {e.name}{" "}
                  <span className="text-muted">
                    {e.targetSets} series{e.measure === "reps_weight" && e.targetReps ? ` × ${e.targetReps}` : ""}
                    {e.targetWeight ? ` · ${e.targetWeight} kg` : ""}
                    {e.measure !== "reps_weight" ? ` · ${MEASURE_LABEL[e.measure]}` : ""}
                  </span>
                </span>
                <form action={removeDayExercise.bind(null, e.id)}><button aria-label={`Quitar ${e.name}`} className="text-muted">✕</button></form>
              </li>
            ))}
          </ul>
          <details className="text-sm">
            <summary className="cursor-pointer text-accent">+ Agregar ejercicio</summary>
            <div className="mt-3"><AddExerciseForm dayId={day.id} exercises={exercises} /></div>
          </details>
          <form action={deleteDay.bind(null, day.id)}><button className="text-xs text-muted">Borrar día</button></form>
        </section>
      ))}

      <form action={addDay.bind(null, routine.id)} className="card flex gap-2">
        <input name="name" required placeholder={`Día ${String.fromCharCode(65 + routine.days.length)} – Pecho/Tríceps`} className="input" />
        <button className="btn-primary whitespace-nowrap">Agregar día</button>
      </form>

      <form action={deleteRoutine.bind(null, routine.id)}>
        <button className="w-full py-2 text-sm text-danger">Borrar rutina</button>
      </form>
    </div>
  );
}
