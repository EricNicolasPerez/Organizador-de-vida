import type { RoutineDay } from "./types";

/** The day after the last one trained, wrapping around; first day when unknown. */
export function nextRoutineDay<T extends RoutineDay>(days: T[], lastSessionDayId: string | null): T | null {
  if (days.length === 0) return null;
  const sorted = [...days].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex((d) => d.id === lastSessionDayId);
  if (idx === -1) return sorted[0];
  return sorted[(idx + 1) % sorted.length];
}
