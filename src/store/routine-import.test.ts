import { expect, test } from "vitest";
import { emptyData } from "./seed";
import { importRoutines, parseRoutineFile } from "./routine-import";
import { addAccount } from "./ops/finance";
import { addExercise, addRoutine } from "./ops/training";

const file = {
  type: "organizador.rutinas",
  version: 1,
  routines: [{
    name: "Gym",
    days: [
      { name: "Pecho", exercises: [
        { name: "Bici", measure: "time", targetSets: 1, targetReps: null, targetWeight: null },
        { name: "Banco plano", measure: "reps_weight", targetSets: 4, targetReps: 10, targetWeight: 20 },
      ] },
      { name: "Espalda", exercises: [
        { name: "bici", measure: "time", targetSets: 1, targetReps: null, targetWeight: null },
      ] },
    ],
  }],
};

test("parseRoutineFile accepts the routines format", () => {
  const r = parseRoutineFile(JSON.stringify(file));
  expect(r.ok && r.routines[0].days.map((d) => d.name)).toEqual(["Pecho", "Espalda"]);
});

test.each(["{bad", JSON.stringify({ version: 1 }), JSON.stringify({ ...file, type: "otra" }), JSON.stringify({ ...file, routines: [{ name: "X", days: [{ name: "D", exercises: [{ name: "", measure: "time", targetSets: 1 }] }] }] })])(
  "parseRoutineFile rejects %s", (text) => {
    expect(parseRoutineFile(text)).toEqual({ ok: false, error: "El archivo no es un archivo de rutinas válido" });
  },
);

test("importRoutines adds routines without touching finances, reusing exercises by name", () => {
  let d = addAccount(emptyData(), { name: "Efectivo", currency: "ARS", type: "cash", initialBalanceCents: 100 });
  d = addExercise(d, "Banco Plano", "reps_weight");
  const r = parseRoutineFile(JSON.stringify(file));
  if (!r.ok) throw new Error("parse");
  const out = importRoutines(d, r.routines);
  expect(out.accounts).toEqual(d.accounts);
  expect(out.categories).toEqual(d.categories);
  expect(out.exercises.map((e) => e.name)).toEqual(["Banco Plano", "Bici"]);
  const routine = out.routines[0];
  expect(routine).toMatchObject({ name: "Gym", isActive: true });
  expect(routine.days.map((x) => [x.name, x.position])).toEqual([["Pecho", 0], ["Espalda", 1]]);
  expect(routine.days[0].exercises.map((e) => [e.exerciseId, e.targetSets, e.targetReps, e.targetWeight, e.position])).toEqual([
    [out.exercises[1].id, 1, null, null, 0],
    [out.exercises[0].id, 4, 10, 20, 1],
  ]);
  expect(routine.days[1].exercises[0].exerciseId).toBe(out.exercises[1].id);
});

test("importing when a routine is already active keeps it active", () => {
  const d = addRoutine(emptyData(), "Vieja");
  const r = parseRoutineFile(JSON.stringify(file));
  if (!r.ok) throw new Error("parse");
  const out = importRoutines(d, r.routines);
  expect(out.routines.map((x) => [x.name, x.isActive])).toEqual([["Vieja", true], ["Gym", false]]);
});
