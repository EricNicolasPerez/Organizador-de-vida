import { expect, test } from "vitest";
import { emptyData } from "./seed";
import { DEFAULT_ROUTINES, withDefaultRoutines } from "./default-routines";
import { deleteRoutine } from "./ops/training";
import { addAccount } from "./ops/finance";
import { parseBackup, serializeBackup } from "./backup";

test("default routines are valid and contain the three gym days", () => {
  expect(DEFAULT_ROUTINES[0].days.map((d) => d.name)).toEqual(["Espalda y brazo", "Pecho", "Piernas (sin flexión profunda)"]);
  expect(DEFAULT_ROUTINES[0].days.map((d) => d.exercises.length)).toEqual([9, 6, 8]);
});

test("withDefaultRoutines adds them once, active, and marks the flag", () => {
  const d = withDefaultRoutines(emptyData());
  expect(d.routines).toHaveLength(1);
  expect(d.routines[0]).toMatchObject({ name: "Gym", isActive: true });
  expect(d.settings.defaultRoutinesAdded).toBe(true);
  expect(withDefaultRoutines(d)).toBe(d);
});

test("deleting the default routine does not bring it back", () => {
  let d = withDefaultRoutines(emptyData());
  d = deleteRoutine(d, d.routines[0].id);
  expect(withDefaultRoutines(d).routines).toEqual([]);
});

test("existing data without the flag gets the routines and keeps everything else", () => {
  const base = addAccount(emptyData(), { name: "Efectivo", currency: "ARS", type: "cash", initialBalanceCents: 100 });
  const legacy = { ...base, settings: { lastAccountId: null, lastCategoryId: { expense: null, income: null } } };
  const d = withDefaultRoutines(legacy as typeof base);
  expect(d.accounts).toEqual(base.accounts);
  expect(d.routines[0].name).toBe("Gym");
});

test("the flag survives a backup round trip", () => {
  const r = parseBackup(serializeBackup(withDefaultRoutines(emptyData())));
  expect(r.ok && r.data.settings.defaultRoutinesAdded).toBe(true);
});
