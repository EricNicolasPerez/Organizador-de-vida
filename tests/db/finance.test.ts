import { beforeEach, describe, expect, test } from "vitest";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { asUser, bootDb, createUser, USER_A, USER_B } from "./helpers";

let db: PGlite;
beforeEach(async () => {
  db = await bootDb();
  await createUser(db, USER_A);
  await createUser(db, USER_B);
});

const newAccount = (tx: Transaction, over: Record<string, unknown> = {}) => {
  const a = { name: "Efectivo", currency: "ARS", type: "cash", initial_balance: 1000, ...over };
  return tx.query<{ id: string }>(
    "insert into accounts (name, currency, type, initial_balance) values ($1,$2,$3,$4) returning id",
    [a.name, a.currency, a.type, a.initial_balance],
  ).then((r) => r.rows[0].id);
};

describe("RLS", () => {
  test("user B cannot see user A's accounts", async () => {
    await asUser(db, USER_A, (tx) => newAccount(tx));
    const rows = await asUser(db, USER_B, (tx) => tx.query("select * from accounts"));
    expect(rows.rows).toHaveLength(0);
    const own = await asUser(db, USER_A, (tx) => tx.query<{ user_id: string }>("select user_id from accounts"));
    expect(own.rows[0].user_id).toBe(USER_A);
  });

  test("user B cannot update user A's movement", async () => {
    const mid = await asUser(db, USER_A, async (tx) => {
      const acc = await newAccount(tx);
      const r = await tx.query<{ id: string }>(
        "insert into movements (kind, account_id, amount) values ('expense',$1,100) returning id", [acc]);
      return r.rows[0].id;
    });
    const res = await asUser(db, USER_B, (tx) => tx.query("update movements set amount = 1 where id = $1", [mid]));
    expect(res.affectedRows).toBe(0);
  });

  test("user B cannot attach a movement to user A's account", async () => {
    const acc = await asUser(db, USER_A, (tx) => newAccount(tx));
    await expect(asUser(db, USER_B, (tx) =>
      tx.query("insert into movements (kind, account_id, amount) values ('expense',$1,100)", [acc]),
    )).rejects.toThrow();
  });
});

describe("constraints", () => {
  test("credit card must be ARS", async () => {
    await expect(asUser(db, USER_A, (tx) => newAccount(tx, { type: "credit_card", currency: "USD" }))).rejects.toThrow();
  });

  test("expense amount must be > 0", async () => {
    await expect(asUser(db, USER_A, async (tx) => {
      const acc = await newAccount(tx);
      await tx.query("insert into movements (kind, account_id, amount) values ('expense',$1,0)", [acc]);
    })).rejects.toThrow();
  });

  test("negative adjustment is allowed", async () => {
    await asUser(db, USER_A, async (tx) => {
      const acc = await newAccount(tx);
      await tx.query("insert into movements (kind, account_id, amount) values ('adjustment',$1,-50)", [acc]);
    });
  });

  test("transfer requires destination and to_amount", async () => {
    await expect(asUser(db, USER_A, async (tx) => {
      const a = await newAccount(tx);
      const b = await newAccount(tx, { name: "Banco" });
      await tx.query("insert into movements (kind, account_id, amount, to_account_id) values ('transfer',$1,100,$2)", [a, b]);
    })).rejects.toThrow();
  });

  test("non-transfer cannot have a destination", async () => {
    await expect(asUser(db, USER_A, async (tx) => {
      const a = await newAccount(tx);
      const b = await newAccount(tx, { name: "Banco" });
      await tx.query("insert into movements (kind, account_id, amount, to_account_id, to_amount) values ('expense',$1,100,$2,100)", [a, b]);
    })).rejects.toThrow();
  });
});

test("seed_default_categories is idempotent and per user", async () => {
  await asUser(db, USER_A, (tx) => tx.query("select seed_default_categories()"));
  await asUser(db, USER_A, (tx) => tx.query("select seed_default_categories()"));
  const a = await asUser(db, USER_A, (tx) => tx.query<{ name: string; kind: string }>("select name, kind from categories order by kind, name"));
  expect(a.rows).toHaveLength(10);
  expect(a.rows.filter((r) => r.kind === "income").map((r) => r.name)).toEqual(["Otros", "Sueldo"]);
  const b = await asUser(db, USER_B, (tx) => tx.query("select * from categories"));
  expect(b.rows).toHaveLength(0);
});
