import type { DraftSet, SessionDraft } from "./session-draft";
import type { Measure } from "./types";

export interface DayExercise {
  exerciseId: string;
  name: string;
  measure: Measure;
  targetSets: number;
  targetReps: number | null;
  targetWeight: number | null;
}

export function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID only exists in secure contexts; fall back for plain-http LAN testing.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const emptySet = (): DraftSet => ({ reps: null, weightKg: null, durationSec: null, distanceM: null });

/** Builds a new session draft for a routine day, prefilled from the last session (or the day's targets). */
export function draftFromDay(
  dayExercises: DayExercise[],
  lastSets: Record<string, DraftSet[]>,
  routineId: string | null,
  routineDayId: string | null,
  date: string,
): SessionDraft {
  return {
    clientId: uuid(),
    routineId,
    routineDayId,
    date,
    exercises: dayExercises.map((e) => {
      const previous = lastSets[e.exerciseId] ?? [];
      const target: DraftSet = e.measure === "reps_weight"
        ? { ...emptySet(), reps: e.targetReps, weightKg: e.targetWeight }
        : emptySet();
      const count = Math.max(1, e.targetSets);
      const sets = Array.from({ length: count }, (_, i) => ({ ...(previous[i] ?? previous.at(-1) ?? target) }));
      return { exerciseId: e.exerciseId, name: e.name, measure: e.measure, sets };
    }),
  };
}
