import { uuid } from "@/lib/training/draft-from-day";
import type { Measure } from "@/lib/training/types";
import type { AppData, Exercise, Routine } from "./types";

export interface RoutineTemplate {
  name: string;
  days: {
    name: string;
    exercises: { name: string; measure: Measure; targetSets: number; targetReps: number | null; targetWeight: number | null }[];
  }[];
}

const ERROR = "El archivo no es un archivo de rutinas válido";
const MEASURES: Measure[] = ["reps_weight", "time", "distance"];
const nonEmpty = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
const optNum = (v: unknown) => v === null || v === undefined || (typeof v === "number" && v >= 0);

/** Parses a routines file: { type: "organizador.rutinas", version: 1, routines: RoutineTemplate[] }. */
export function parseRoutineFile(text: string): { ok: true; routines: RoutineTemplate[] } | { ok: false; error: string } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: ERROR }; }
  const o = raw as Record<string, unknown> | null;
  if (!o || o.type !== "organizador.rutinas" || o.version !== 1 || !Array.isArray(o.routines)) return { ok: false, error: ERROR };
  const valid = (o.routines as RoutineTemplate[]).every((r) =>
    nonEmpty(r?.name) && Array.isArray(r.days) && r.days.every((d) =>
      nonEmpty(d?.name) && Array.isArray(d.exercises) && d.exercises.every((e) =>
        nonEmpty(e?.name) && MEASURES.includes(e.measure) && Number.isInteger(e.targetSets) && e.targetSets >= 1 && e.targetSets <= 20 &&
        optNum(e.targetReps) && optNum(e.targetWeight))));
  return valid ? { ok: true, routines: o.routines as RoutineTemplate[] } : { ok: false, error: ERROR };
}

/** Adds the routines (as new routines) and any missing exercises, matching existing exercises by name. Touches nothing else. */
export function importRoutines(data: AppData, templates: RoutineTemplate[]): AppData {
  const exercises: Exercise[] = [...data.exercises];
  const byName = new Map(exercises.map((e) => [e.name.trim().toLowerCase(), e]));
  const exerciseFor = (name: string, measure: Measure): Exercise => {
    const key = name.trim().toLowerCase();
    let ex = byName.get(key);
    if (!ex) {
      ex = { id: uuid(), name: name.trim(), measure, muscleGroup: null };
      exercises.push(ex);
      byName.set(key, ex);
    }
    return ex;
  };

  let hasActive = data.routines.some((r) => r.isActive);
  const routines: Routine[] = templates.map((t) => {
    const isActive = !hasActive;
    hasActive = true;
    return {
      id: uuid(),
      name: t.name.trim(),
      isActive,
      days: t.days.map((d, position) => ({
        id: uuid(),
        position,
        name: d.name.trim(),
        exercises: d.exercises.map((e, i) => ({
          id: uuid(),
          exerciseId: exerciseFor(e.name, e.measure).id,
          position: i,
          targetSets: e.targetSets,
          targetReps: e.targetReps ?? null,
          targetWeight: e.targetWeight ?? null,
        })),
      })),
    };
  });

  return { ...data, exercises, routines: [...data.routines, ...routines] };
}
