import { expect, test } from "vitest";
import { emptyData } from "../seed";
import type { AppData } from "../types";
import { parseBackup, serializeBackup } from "../backup";
import { nextRoutineDay } from "@/lib/training/next-day";
import type { SessionDraft } from "@/lib/training/types";
import {
  activeRoutine, addDay, addDayExercise, addRoutine, deleteDay, deleteRoutine, finishSession, lastSessionDayId, lastSets,
  moveDay, recentSessions, removeDayExercise, renameDay, renameRoutine, sessionsOn, setActiveRoutine, setDraft,
} from "./training";

function setup(): AppData {
  let d = addRoutine(emptyData(), "PPL");
  const r = d.routines[0].id;
  d = addDay(d, r, "Día A");
  d = addDay(d, r, "Día B");
  d = addDayExercise(d, r, d.routines[0].days[0].id, { newName: "Press banca", measure: "reps_weight", targetSets: 3, targetReps: 10, targetWeight: 50 });
  return d;
}
const draftFor = (d: AppData, over: Partial<SessionDraft> = {}): SessionDraft => ({
  clientId: "c1", routineId: d.routines[0].id, routineDayId: d.routines[0].days[0].id, date: "2026-11-17",
  exercises: [{ exerciseId: d.exercises[0].id, name: "Press banca", measure: "reps_weight",
    sets: [{ reps: 10, weightKg: 22.5, durationSec: null, distanceM: null }] }],
  ...over,
});

test("first routine is active, second is not; setActiveRoutine leaves exactly one", () => {
  let d = addRoutine(emptyData(), "A");
  d = addRoutine(d, "B");
  expect(d.routines.map((r) => r.isActive)).toEqual([true, false]);
  d = setActiveRoutine(d, d.routines[1].id);
  expect(d.routines.map((r) => r.isActive)).toEqual([false, true]);
  expect(activeRoutine(d)?.name).toBe("B");
  d = renameRoutine(d, d.routines[1].id, "C");
  expect(activeRoutine(d)?.name).toBe("C");
});

test("days: add, rename, move, delete", () => {
  let d = setup();
  const r = d.routines[0].id;
  d = renameDay(d, r, d.routines[0].days[1].id, "Día B – Espalda");
  d = moveDay(d, r, d.routines[0].days[1].id, -1);
  expect(d.routines[0].days.map((x) => x.name)).toEqual(["Día B – Espalda", "Día A"]);
  expect(d.routines[0].days.map((x) => x.position)).toEqual([0, 1]);
  expect(moveDay(d, r, d.routines[0].days[0].id, -1)).toBe(d);
});

test("addDayExercise with newName creates the exercise; removeDayExercise keeps the library", () => {
  let d = setup();
  const r = d.routines[0].id;
  const day = d.routines[0].days[0];
  expect(d.exercises).toHaveLength(1);
  expect(d.exercises[0]).toMatchObject({ name: "Press banca", measure: "reps_weight" });
  expect(day.exercises[0]).toMatchObject({ exerciseId: d.exercises[0].id, targetSets: 3, targetReps: 10, targetWeight: 50, position: 0 });
  d = addDayExercise(d, r, day.id, { exerciseId: d.exercises[0].id, targetSets: 2, targetReps: null, targetWeight: null });
  expect(d.routines[0].days[0].exercises.map((e) => e.position)).toEqual([0, 1]);
  d = removeDayExercise(d, r, day.id, d.routines[0].days[0].exercises[1].id);
  expect(d.routines[0].days[0].exercises).toHaveLength(1);
  expect(d.exercises).toHaveLength(1);
});

test("finishSession stores dayName, clears draft, drops empty exercises and is idempotent", () => {
  let d = setup();
  const draft = draftFor(d, { exercises: [...draftFor(d).exercises, { exerciseId: "x", name: "Vacío", measure: "time", sets: [] }] });
  d = setDraft(d, draft);
  d = finishSession(d, draft, "2026-11-17T10:00:00Z");
  d = finishSession(d, draft, "2026-11-17T10:00:01Z");
  expect(d.sessions).toHaveLength(1);
  expect(d.sessions[0]).toMatchObject({ clientId: "c1", dayName: "Día A", date: "2026-11-17", createdAt: "2026-11-17T10:00:00Z" });
  expect(d.sessions[0].exercises).toHaveLength(1);
  expect(d.draft).toBeNull();
});

test("free session has null dayName", () => {
  const d0 = setup();
  const d = finishSession(d0, draftFor(d0, { routineId: null, routineDayId: null }), "2026-11-17T10:00:00Z");
  expect(d.sessions[0].dayName).toBeNull();
});

test("deleteDay keeps sessions, nulls routineDayId, and hoy-te-toca falls back to first day", () => {
  let d = setup();
  const r = d.routines[0].id;
  const dayA = d.routines[0].days[0].id;
  d = finishSession(d, draftFor(d), "2026-11-17T10:00:00Z");
  d = deleteDay(d, r, dayA);
  expect(d.sessions[0]).toMatchObject({ routineDayId: null, dayName: "Día A" });
  expect(nextRoutineDay(d.routines[0].days, lastSessionDayId(d, r))?.name).toBe("Día B");
});

test("lastSessionDayId picks the latest by date then createdAt; rotation goes A → B", () => {
  let d = setup();
  const r = d.routines[0].id;
  const [a, b] = d.routines[0].days;
  d = finishSession(d, draftFor(d, { clientId: "1", routineDayId: b.id, date: "2026-11-10" }), "2026-11-10T10:00:00Z");
  d = finishSession(d, draftFor(d, { clientId: "2", routineDayId: a.id, date: "2026-11-12" }), "2026-11-12T10:00:00Z");
  expect(lastSessionDayId(d, r)).toBe(a.id);
  expect(nextRoutineDay(d.routines[0].days, lastSessionDayId(d, r))?.id).toBe(b.id);
});

test("lastSets returns the most recent session's sets per exercise", () => {
  let d = setup();
  const ex = d.exercises[0].id;
  d = finishSession(d, draftFor(d, { clientId: "1", date: "2026-11-10" }), "2026-11-10T10:00:00Z");
  const newer = draftFor(d, { clientId: "2", date: "2026-11-12" });
  newer.exercises[0].sets = [{ reps: 8, weightKg: 60, durationSec: null, distanceM: null }, { reps: 7, weightKg: 60, durationSec: null, distanceM: null }];
  d = finishSession(d, newer, "2026-11-12T10:00:00Z");
  expect(lastSets(d, [ex])[ex].map((s) => s.reps)).toEqual([8, 7]);
  expect(lastSets(d, ["nope"])).toEqual({});
});

test("sessionsOn and recentSessions", () => {
  let d = setup();
  d = finishSession(d, draftFor(d, { clientId: "1", date: "2026-11-10" }), "2026-11-10T10:00:00Z");
  d = finishSession(d, draftFor(d, { clientId: "2", date: "2026-11-12" }), "2026-11-12T10:00:00Z");
  expect(sessionsOn(d, "2026-11-10").map((s) => s.clientId)).toEqual(["1"]);
  expect(recentSessions(d, 1).map((s) => s.clientId)).toEqual(["2"]);
});

test("deleteRoutine keeps sessions; draft survives backup round trip", () => {
  let d = setup();
  d = finishSession(d, draftFor(d), "2026-11-17T10:00:00Z");
  d = setDraft(d, draftFor(d, { clientId: "c2" }));
  d = deleteRoutine(d, d.routines[0].id);
  expect(d.routines).toEqual([]);
  expect(d.sessions).toHaveLength(1);
  const r = parseBackup(serializeBackup(d));
  expect(r.ok && r.data.draft?.clientId).toBe("c2");
});
