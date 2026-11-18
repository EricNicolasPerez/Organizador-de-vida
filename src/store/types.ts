import type { Account, Category, Currency, Movement } from "@/lib/finance/types";
import type { DraftExercise, Measure, SessionDraft } from "@/lib/training/types";

export type { Account, Category, Currency, Movement, DraftExercise, Measure, SessionDraft };

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  measure: Measure;
}

export interface RoutineDayExercise {
  id: string;
  exerciseId: string;
  position: number;
  targetSets: number;
  targetReps: number | null;
  targetWeight: number | null;
}

export interface RoutineDay {
  id: string;
  position: number;
  name: string;
  exercises: RoutineDayExercise[];
}

export interface Routine {
  id: string;
  name: string;
  isActive: boolean;
  days: RoutineDay[];
}

export interface Session {
  id: string;
  clientId: string;
  routineId: string | null;
  routineDayId: string | null;
  dayName: string | null;
  /** YYYY-MM-DD */
  date: string;
  /** ISO timestamp */
  createdAt: string;
  exercises: DraftExercise[];
}

export interface Settings {
  lastAccountId: string | null;
  lastCategoryId: Record<"expense" | "income", string | null>;
  /** The built-in gym routines were added once (never re-added after the user deletes them). */
  defaultRoutinesAdded?: boolean;
}

export interface AppData {
  version: 1;
  accounts: Account[];
  categories: Category[];
  movements: Movement[];
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
  draft: SessionDraft | null;
  settings: Settings;
}
