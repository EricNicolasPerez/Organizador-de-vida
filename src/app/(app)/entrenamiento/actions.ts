"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Measure } from "@/lib/training/types";

export type FormState = { error: string | null; ok?: number };

const MEASURES: Measure[] = ["reps_weight", "time", "distance"];
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optInt = (v: string) => (v === "" ? null : Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : NaN);

function refresh() {
  revalidatePath("/", "layout");
}

export async function createRoutine(form: FormData) {
  const name = str(form, "name");
  if (!name) return;
  const supabase = await createClient();
  const { count } = await supabase.from("routines").select("id", { count: "exact", head: true }).eq("is_active", true);
  const { data, error } = await supabase.from("routines").insert({ name, is_active: !count }).select("id").single();
  if (error) throw error;
  refresh();
  redirect(`/entrenamiento/rutinas/${data.id}`);
}

export async function renameRoutine(id: string, form: FormData) {
  const name = str(form, "name");
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("routines").update({ name }).eq("id", id);
  refresh();
}

export async function setActiveRoutine(id: string) {
  const supabase = await createClient();
  await supabase.from("routines").update({ is_active: false }).eq("is_active", true);
  await supabase.from("routines").update({ is_active: true }).eq("id", id);
  refresh();
}

export async function deleteRoutine(id: string) {
  const supabase = await createClient();
  await supabase.from("routines").delete().eq("id", id);
  refresh();
  redirect("/entrenamiento/rutinas");
}

export async function addDay(routineId: string, form: FormData) {
  const name = str(form, "name");
  if (!name) return;
  const supabase = await createClient();
  const { data: last } = await supabase.from("routine_days").select("position").eq("routine_id", routineId)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  await supabase.from("routine_days").insert({ routine_id: routineId, name, position: (last?.position ?? -1) + 1 });
  refresh();
}

export async function renameDay(dayId: string, form: FormData) {
  const name = str(form, "name");
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("routine_days").update({ name }).eq("id", dayId);
  refresh();
}

export async function deleteDay(dayId: string) {
  const supabase = await createClient();
  await supabase.from("routine_days").delete().eq("id", dayId);
  refresh();
}

/** Swaps a day with its neighbour (direction -1 = up, 1 = down). */
export async function moveDay(routineId: string, dayId: string, direction: -1 | 1) {
  const supabase = await createClient();
  const { data } = await supabase.from("routine_days").select("id,position").eq("routine_id", routineId).order("position");
  if (!data) return;
  const i = data.findIndex((d) => d.id === dayId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= data.length) return;
  // Normalize positions to the list order, then swap the two.
  const order = data.map((d) => d.id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((id, position) => supabase.from("routine_days").update({ position }).eq("id", id)));
  refresh();
}

export async function addDayExercise(dayId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  let exerciseId = str(form, "exerciseId");
  const newName = str(form, "newName");
  if (!exerciseId && !newName) return { error: "Elegí un ejercicio o escribí uno nuevo" };

  const targetSets = optInt(str(form, "targetSets")) ?? 3;
  const targetReps = optInt(str(form, "targetReps"));
  const rawWeight = str(form, "targetWeight").replace(",", ".");
  const targetWeight = rawWeight === "" ? null : Number(rawWeight);
  if (Number.isNaN(targetSets) || targetSets > 20 || Number.isNaN(targetReps) || (targetWeight != null && !(targetWeight >= 0))) {
    return { error: "Revisá series, repeticiones y peso" };
  }

  if (!exerciseId) {
    const measure = MEASURES.includes(str(form, "measure") as Measure) ? str(form, "measure") : "reps_weight";
    const { data, error } = await supabase.from("exercises")
      .insert({ name: newName, measure, muscle_group: str(form, "muscleGroup") || null }).select("id").single();
    if (error) return { error: "No se pudo crear el ejercicio" };
    exerciseId = data.id;
  }

  const { data: last } = await supabase.from("routine_day_exercises").select("position").eq("routine_day_id", dayId)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("routine_day_exercises").insert({
    routine_day_id: dayId, exercise_id: exerciseId, position: (last?.position ?? -1) + 1,
    target_sets: targetSets, target_reps: targetReps, target_weight: targetWeight,
  });
  if (error) return { error: "No se pudo agregar" };
  refresh();
  return { error: null, ok: Date.now() };
}

export async function removeDayExercise(id: string) {
  const supabase = await createClient();
  await supabase.from("routine_day_exercises").delete().eq("id", id);
  refresh();
}

/** Creates an exercise from the session logger and returns it. */
export async function createExercise(name: string, measure: Measure) {
  const clean = name.trim();
  if (!clean || !MEASURES.includes(measure)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").insert({ name: clean, measure }).select("id,name,measure").single();
  if (error) return null;
  return { id: data.id as string, name: data.name as string, measure: data.measure as Measure };
}
