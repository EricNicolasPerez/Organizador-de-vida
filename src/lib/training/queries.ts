import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DayExercise } from "./draft-from-day";
import type { DraftSet } from "./session-draft";
import type { Measure, RoutineDay } from "./types";

export interface Exercise { id: string; name: string; muscleGroup: string | null; measure: Measure }
export interface Routine { id: string; name: string; isActive: boolean }
export interface RoutineDetail extends Routine {
  days: (RoutineDay & { exercises: (DayExercise & { id: string })[] })[];
}
export interface SessionSummary { id: string; date: string; dayName: string | null; routineDayId: string | null }
export interface SessionSetRow { exerciseName: string; measure: Measure; setNumber: number; position: number; set: DraftSet }

const num = (v: unknown) => (v == null ? null : Number(v));

export async function getExercises(): Promise<Exercise[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").select("id,name,muscle_group,measure").order("name");
  if (error) throw error;
  return data.map((e) => ({ id: e.id, name: e.name, muscleGroup: e.muscle_group, measure: e.measure }));
}

export async function getRoutines(): Promise<Routine[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("routines").select("id,name,is_active").order("created_at");
  if (error) throw error;
  return data.map((r) => ({ id: r.id, name: r.name, isActive: r.is_active }));
}

export async function getRoutine(id: string): Promise<RoutineDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select("id,name,is_active, routine_days(id,position,name, routine_day_exercises(id,position,target_sets,target_reps,target_weight, exercises(id,name,measure)))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  type DayRow = { id: string; position: number; name: string; routine_day_exercises: { id: string; position: number; target_sets: number; target_reps: number | null; target_weight: string | number | null; exercises: { id: string; name: string; measure: Measure } | null }[] };
  const days = (data.routine_days as unknown as DayRow[])
    .sort((a, b) => a.position - b.position)
    .map((d) => ({
      id: d.id,
      position: d.position,
      name: d.name,
      exercises: d.routine_day_exercises
        .filter((x) => x.exercises)
        .sort((a, b) => a.position - b.position)
        .map((x) => ({
          id: x.id,
          exerciseId: x.exercises!.id,
          name: x.exercises!.name,
          measure: x.exercises!.measure,
          targetSets: x.target_sets,
          targetReps: x.target_reps,
          targetWeight: num(x.target_weight),
        })),
    }));
  return { id: data.id, name: data.name, isActive: data.is_active, days };
}

export async function getActiveRoutine(): Promise<RoutineDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("routines").select("id").eq("is_active", true).maybeSingle();
  return data ? getRoutine(data.id) : null;
}

/** Day id of the last session logged for a routine (for "hoy te toca"). */
export async function getLastSessionDayId(routineId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select("routine_day_id")
    .eq("routine_id", routineId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.routine_day_id ?? null;
}

export async function getRecentSessions(limit = 30): Promise<SessionSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id,date,day_name,routine_day_id")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((s) => ({ id: s.id, date: s.date, dayName: s.day_name, routineDayId: s.routine_day_id }));
}

/** Most recent sets per exercise (from the last 60 sessions), used to prefill a new session. */
export async function getLastSets(exerciseIds: string[]): Promise<Record<string, DraftSet[]>> {
  if (exerciseIds.length === 0) return {};
  const supabase = await createClient();
  const { data: sessions, error: e1 } = await supabase
    .from("workout_sessions")
    .select("id")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);
  if (e1) throw e1;
  if (sessions.length === 0) return {};
  const rank = new Map(sessions.map((s, i) => [s.id as string, i]));
  const { data, error } = await supabase
    .from("session_sets")
    .select("exercise_id,session_id,set_number,reps,weight_kg,duration_sec,distance_m")
    .in("exercise_id", exerciseIds)
    .in("session_id", [...rank.keys()]);
  if (error) throw error;
  const rows = [...data].sort((a, b) => rank.get(a.session_id)! - rank.get(b.session_id)! || a.set_number - b.set_number);
  const out: Record<string, DraftSet[]> = {};
  const sessionFor: Record<string, string> = {};
  for (const r of rows) {
    sessionFor[r.exercise_id] ??= r.session_id;
    if (sessionFor[r.exercise_id] !== r.session_id) continue;
    (out[r.exercise_id] ??= []).push({ reps: r.reps, weightKg: num(r.weight_kg), durationSec: r.duration_sec, distanceM: num(r.distance_m) });
  }
  return out;
}

export async function getSessionsOn(date: string): Promise<(SessionSummary & { sets: SessionSetRow[] })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id,date,day_name,routine_day_id, session_sets(position,set_number,reps,weight_kg,duration_sec,distance_m, exercises(name,measure))")
    .eq("date", date)
    .order("created_at");
  if (error) throw error;
  type SetRow = { position: number; set_number: number; reps: number | null; weight_kg: string | number | null; duration_sec: number | null; distance_m: string | number | null; exercises: { name: string; measure: Measure } | null };
  return data.map((s) => ({
    id: s.id,
    date: s.date,
    dayName: s.day_name,
    routineDayId: s.routine_day_id,
    sets: (s.session_sets as unknown as SetRow[])
      .sort((a, b) => a.position - b.position || a.set_number - b.set_number)
      .map((x) => ({
        exerciseName: x.exercises?.name ?? "Ejercicio borrado",
        measure: x.exercises?.measure ?? "reps_weight",
        position: x.position,
        setNumber: x.set_number,
        set: { reps: x.reps, weightKg: num(x.weight_kg), durationSec: x.duration_sec, distanceM: num(x.distance_m) },
      })),
  }));
}
