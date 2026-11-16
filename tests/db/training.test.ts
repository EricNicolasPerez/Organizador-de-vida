import { beforeEach, expect, test } from "vitest";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { asUser, bootDb, createUser, USER_A, USER_B } from "./helpers";

let db: PGlite;
beforeEach(async () => {
  db = await bootDb();
  await createUser(db, USER_A);
  await createUser(db, USER_B);
});

async function setupRoutine(tx: Transaction) {
  const ex = (await tx.query<{ id: string }>("insert into exercises (name, measure) values ('Press banca','reps_weight') returning id")).rows[0].id;
  const plank = (await tx.query<{ id: string }>("insert into exercises (name, measure) values ('Plancha','time') returning id")).rows[0].id;
  const routine = (await tx.query<{ id: string }>("insert into routines (name, is_active) values ('PPL', true) returning id")).rows[0].id;
  const day = (await tx.query<{ id: string }>("insert into routine_days (routine_id, position, name) values ($1, 0, 'Día A') returning id", [routine])).rows[0].id;
  return { ex, plank, routine, day };
}

const payload = (ids: { ex: string; plank: string; routine: string; day: string }) => ({
  clientId: "11111111-1111-4111-8111-111111111111",
  routineId: ids.routine,
  routineDayId: ids.day,
  date: "2026-11-16",
  exercises: [
    { exerciseId: ids.ex, name: "Press banca", measure: "reps_weight", sets: [
      { reps: 10, weightKg: 60, durationSec: null, distanceM: null },
      { reps: 8, weightKg: 62.5, durationSec: null, distanceM: null },
    ] },
    { exerciseId: ids.plank, name: "Plancha", measure: "time", sets: [
      { reps: null, weightKg: null, durationSec: 60, distanceM: null },
    ] },
  ],
});

test("save_workout_session stores session and sets; repeated call is idempotent", async () => {
  await asUser(db, USER_A, async (tx) => {
    const ids = await setupRoutine(tx);
    const p = JSON.stringify(payload(ids));
    const first = (await tx.query<{ id: string }>("select save_workout_session($1::jsonb) as id", [p])).rows[0].id;
    const second = (await tx.query<{ id: string }>("select save_workout_session($1::jsonb) as id", [p])).rows[0].id;
    expect(second).toBe(first);
    const sessions = await tx.query("select * from workout_sessions");
    expect(sessions.rows).toHaveLength(1);
    const sets = await tx.query<{ position: number; set_number: number; reps: number | null; weight_kg: string | null; duration_sec: number | null }>(
      "select position, set_number, reps, weight_kg::text, duration_sec from session_sets order by position, set_number");
    expect(sets.rows).toEqual([
      { position: 0, set_number: 1, reps: 10, weight_kg: "60.00", duration_sec: null },
      { position: 0, set_number: 2, reps: 8, weight_kg: "62.50", duration_sec: null },
      { position: 1, set_number: 1, reps: null, weight_kg: null, duration_sec: 60 },
    ]);
  });
});

test("user B cannot see user A's sessions", async () => {
  await asUser(db, USER_A, async (tx) => {
    const ids = await setupRoutine(tx);
    await tx.query("select save_workout_session($1::jsonb)", [JSON.stringify(payload(ids))]);
  });
  const b = await asUser(db, USER_B, async (tx) => ({
    s: (await tx.query("select * from workout_sessions")).rows.length,
    sets: (await tx.query("select * from session_sets")).rows.length,
    ex: (await tx.query("select * from exercises")).rows.length,
  }));
  expect(b).toEqual({ s: 0, sets: 0, ex: 0 });
});

test("user B cannot save a session using user A's exercises", async () => {
  const ids = await asUser(db, USER_A, (tx) => setupRoutine(tx));
  await expect(asUser(db, USER_B, (tx) => tx.query("select save_workout_session($1::jsonb)", [JSON.stringify(payload(ids))]))).rejects.toThrow();
});

test("only one active routine per user", async () => {
  await expect(asUser(db, USER_A, async (tx) => {
    await tx.query("insert into routines (name, is_active) values ('A', true)");
    await tx.query("insert into routines (name, is_active) values ('B', true)");
  })).rejects.toThrow();
  await asUser(db, USER_B, (tx) => tx.query("insert into routines (name, is_active) values ('A', true)"));
});

test("deleting a routine day keeps session history", async () => {
  await asUser(db, USER_A, async (tx) => {
    const ids = await setupRoutine(tx);
    await tx.query("select save_workout_session($1::jsonb)", [JSON.stringify(payload(ids))]);
    await tx.query("delete from routine_days where id = $1", [ids.day]);
    const s = await tx.query<{ routine_day_id: string | null; day_name: string }>("select routine_day_id, day_name from workout_sessions");
    expect(s.rows).toEqual([{ routine_day_id: null, day_name: "Día A" }]);
    expect((await tx.query("select * from session_sets")).rows).toHaveLength(3);
  });
});
