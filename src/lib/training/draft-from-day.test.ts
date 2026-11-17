import { expect, test } from "vitest";
import { draftFromDay } from "./draft-from-day";

const dayExercises = [
  { exerciseId: "bench", name: "Press banca", measure: "reps_weight" as const, targetSets: 3, targetReps: 10, targetWeight: 50 },
  { exerciseId: "plank", name: "Plancha", measure: "time" as const, targetSets: 2, targetReps: null, targetWeight: null },
];

test("one exercise per day exercise with targetSets sets", () => {
  const d = draftFromDay(dayExercises, {}, "r1", "d1", "2026-11-16");
  expect(d).toMatchObject({ routineId: "r1", routineDayId: "d1", date: "2026-11-16" });
  expect(d.exercises.map((e) => e.sets.length)).toEqual([3, 2]);
});

test("without history, sets prefill from targets", () => {
  const d = draftFromDay(dayExercises, {}, "r1", "d1", "2026-11-16");
  expect(d.exercises[0].sets[0]).toEqual({ reps: 10, weightKg: 50, durationSec: null, distanceM: null });
  expect(d.exercises[1].sets[0]).toEqual({ reps: null, weightKg: null, durationSec: null, distanceM: null });
});

test("copies values from the last session when present", () => {
  const last = { bench: [
    { reps: 8, weightKg: 60, durationSec: null, distanceM: null },
    { reps: 7, weightKg: 62.5, durationSec: null, distanceM: null },
  ] };
  const d = draftFromDay(dayExercises, last, "r1", "d1", "2026-11-16");
  expect(d.exercises[0].sets).toEqual([
    { reps: 8, weightKg: 60, durationSec: null, distanceM: null },
    { reps: 7, weightKg: 62.5, durationSec: null, distanceM: null },
    { reps: 7, weightKg: 62.5, durationSec: null, distanceM: null },
  ]);
});

test("new uuid clientId each call", () => {
  const a = draftFromDay(dayExercises, {}, null, null, "2026-11-16").clientId;
  const b = draftFromDay(dayExercises, {}, null, null, "2026-11-16").clientId;
  expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(a).not.toBe(b);
});
