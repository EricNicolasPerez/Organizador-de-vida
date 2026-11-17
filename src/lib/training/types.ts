export type Measure = "reps_weight" | "time" | "distance";

export interface RoutineDay {
  id: string;
  position: number;
  name: string;
}

export interface DraftSet {
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  distanceM: number | null;
}

export interface DraftExercise {
  exerciseId: string;
  name: string;
  measure: Measure;
  sets: DraftSet[];
}

export interface SessionDraft {
  clientId: string;
  routineId: string | null;
  routineDayId: string | null;
  /** YYYY-MM-DD */
  date: string;
  exercises: DraftExercise[];
}
