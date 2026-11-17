import { uuid } from "@/lib/training/draft-from-day";
import type { DraftSet, Measure, SessionDraft } from "@/lib/training/types";
import type { AppData, Exercise, Routine, RoutineDay, Session } from "../types";

const mapRoutine = (data: AppData, id: string, fn: (r: Routine) => Routine): AppData =>
  ({ ...data, routines: data.routines.map((r) => (r.id === id ? fn(r) : r)) });

const mapDay = (data: AppData, routineId: string, dayId: string, fn: (d: RoutineDay) => RoutineDay): AppData =>
  mapRoutine(data, routineId, (r) => ({ ...r, days: r.days.map((d) => (d.id === dayId ? fn(d) : d)) }));

const renumber = <T extends { position: number }>(items: T[]): T[] => items.map((x, position) => ({ ...x, position }));

// ---- Routines -------------------------------------------------------------

export function addRoutine(data: AppData, name: string): AppData {
  const clean = name.trim();
  if (!clean) return data;
  const isActive = !data.routines.some((r) => r.isActive);
  return { ...data, routines: [...data.routines, { id: uuid(), name: clean, isActive, days: [] }] };
}

export function renameRoutine(data: AppData, id: string, name: string): AppData {
  const clean = name.trim();
  return clean ? mapRoutine(data, id, (r) => ({ ...r, name: clean })) : data;
}

export function setActiveRoutine(data: AppData, id: string): AppData {
  if (!data.routines.some((r) => r.id === id)) return data;
  return { ...data, routines: data.routines.map((r) => ({ ...r, isActive: r.id === id })) };
}

export function deleteRoutine(data: AppData, id: string): AppData {
  return { ...data, routines: data.routines.filter((r) => r.id !== id) };
}

export const activeRoutine = (data: AppData): Routine | null => data.routines.find((r) => r.isActive) ?? null;

// ---- Days -----------------------------------------------------------------

export function addDay(data: AppData, routineId: string, name: string): AppData {
  const clean = name.trim();
  if (!clean) return data;
  return mapRoutine(data, routineId, (r) => ({ ...r, days: [...r.days, { id: uuid(), position: r.days.length, name: clean, exercises: [] }] }));
}

export function renameDay(data: AppData, routineId: string, dayId: string, name: string): AppData {
  const clean = name.trim();
  return clean ? mapDay(data, routineId, dayId, (d) => ({ ...d, name: clean })) : data;
}

export function moveDay(data: AppData, routineId: string, dayId: string, direction: -1 | 1): AppData {
  const routine = data.routines.find((r) => r.id === routineId);
  if (!routine) return data;
  const days = [...routine.days].sort((a, b) => a.position - b.position);
  const i = days.findIndex((d) => d.id === dayId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= days.length) return data;
  [days[i], days[j]] = [days[j], days[i]];
  return mapRoutine(data, routineId, (r) => ({ ...r, days: renumber(days) }));
}

export function deleteDay(data: AppData, routineId: string, dayId: string): AppData {
  const next = mapRoutine(data, routineId, (r) => ({ ...r, days: renumber(r.days.filter((d) => d.id !== dayId)) }));
  return { ...next, sessions: next.sessions.map((s) => (s.routineDayId === dayId ? { ...s, routineDayId: null } : s)) };
}

// ---- Exercises ------------------------------------------------------------

export function addExercise(data: AppData, name: string, measure: Measure, muscleGroup: string | null = null): AppData {
  const clean = name.trim();
  if (!clean) return data;
  return { ...data, exercises: [...data.exercises, { id: uuid(), name: clean, measure, muscleGroup }] };
}

export interface DayExerciseInput {
  exerciseId?: string;
  newName?: string;
  measure?: Measure;
  muscleGroup?: string | null;
  targetSets: number;
  targetReps: number | null;
  targetWeight: number | null;
}

export function addDayExercise(data: AppData, routineId: string, dayId: string, input: DayExerciseInput): AppData {
  let next = data;
  let exerciseId = input.exerciseId;
  if (!exerciseId) {
    if (!input.newName?.trim()) return data;
    next = addExercise(data, input.newName, input.measure ?? "reps_weight", input.muscleGroup ?? null);
    exerciseId = next.exercises.at(-1)!.id;
  } else if (!data.exercises.some((e) => e.id === exerciseId)) return data;
  const targetSets = Math.min(20, Math.max(1, Math.round(input.targetSets || 3)));
  return mapDay(next, routineId, dayId, (d) => ({
    ...d,
    exercises: [...d.exercises, { id: uuid(), exerciseId: exerciseId!, position: d.exercises.length, targetSets, targetReps: input.targetReps, targetWeight: input.targetWeight }],
  }));
}

export function removeDayExercise(data: AppData, routineId: string, dayId: string, id: string): AppData {
  return mapDay(data, routineId, dayId, (d) => ({ ...d, exercises: renumber(d.exercises.filter((e) => e.id !== id)) }));
}

export const exerciseById = (data: AppData, id: string): Exercise | undefined => data.exercises.find((e) => e.id === id);

// ---- Sessions -------------------------------------------------------------

const byRecency = (a: Session, b: Session) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

export function lastSessionDayId(data: AppData, routineId: string): string | null {
  const last = data.sessions.filter((s) => s.routineId === routineId).sort(byRecency)[0];
  return last?.routineDayId ?? null;
}

export function lastSets(data: AppData, exerciseIds: string[]): Record<string, DraftSet[]> {
  const out: Record<string, DraftSet[]> = {};
  const sorted = [...data.sessions].sort(byRecency);
  for (const id of exerciseIds) {
    for (const s of sorted) {
      const ex = s.exercises.find((e) => e.exerciseId === id);
      if (ex && ex.sets.length > 0) { out[id] = ex.sets.map((x) => ({ ...x })); break; }
    }
  }
  return out;
}

export function setDraft(data: AppData, draft: SessionDraft | null): AppData {
  return { ...data, draft };
}

export function finishSession(data: AppData, draft: SessionDraft, now: string): AppData {
  if (data.sessions.some((s) => s.clientId === draft.clientId)) return { ...data, draft: null };
  const routine = data.routines.find((r) => r.id === draft.routineId);
  const day = routine?.days.find((d) => d.id === draft.routineDayId);
  const session: Session = {
    id: uuid(),
    clientId: draft.clientId,
    routineId: draft.routineId,
    routineDayId: draft.routineDayId,
    dayName: day?.name ?? null,
    date: draft.date,
    createdAt: now,
    exercises: draft.exercises.filter((e) => e.sets.length > 0).map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })),
  };
  return { ...data, sessions: [...data.sessions, session], draft: null };
}

export const sessionsOn = (data: AppData, date: string): Session[] =>
  data.sessions.filter((s) => s.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const recentSessions = (data: AppData, limit: number): Session[] => [...data.sessions].sort(byRecency).slice(0, limit);
