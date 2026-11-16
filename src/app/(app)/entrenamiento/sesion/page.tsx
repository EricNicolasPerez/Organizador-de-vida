import Link from "next/link";
import { getActiveRoutine, getExercises, getLastSets, getRoutine } from "@/lib/training/queries";
import { createClient } from "@/lib/supabase/server";
import { SessionLogger } from "./session-logger";
import type { DayExercise } from "@/lib/training/draft-from-day";

export default async function SesionPage({ searchParams }: PageProps<"/entrenamiento/sesion">) {
  const sp = await searchParams;
  const dayId = typeof sp.dia === "string" ? sp.dia : null;
  const exercises = await getExercises();

  let routineId: string | null = null;
  let dayName = "Entrenamiento libre";
  let dayExercises: DayExercise[] = [];

  if (dayId) {
    const supabase = await createClient();
    const { data } = await supabase.from("routine_days").select("routine_id").eq("id", dayId).maybeSingle();
    const routine = data ? await getRoutine(data.routine_id) : await getActiveRoutine();
    const day = routine?.days.find((d) => d.id === dayId);
    if (routine && day) {
      routineId = routine.id;
      dayName = day.name;
      dayExercises = day.exercises;
    }
  }
  const lastSets = await getLastSets(dayExercises.map((e) => e.exerciseId));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/entrenamiento" className="text-sm text-accent">‹ Entrenamiento</Link>
      <SessionLogger
        dayName={dayName}
        routineId={routineId}
        routineDayId={routineId ? dayId : null}
        dayExercises={dayExercises}
        lastSets={lastSets}
        library={exercises}
      />
    </div>
  );
}
