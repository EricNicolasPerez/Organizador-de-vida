import { expect, test } from "vitest";
import { createPersistence, StaleWriteError } from "./persist";
import { emptyData } from "./seed";

function fakeKv() {
  const store = new Map<string, unknown>();
  return {
    async get(k: string) { return store.get(k); },
    async set(k: string, v: unknown) { store.set(k, v); },
    async del(k: string) { store.delete(k); },
  };
}

test("load returns null when nothing stored, then what was saved with its revision", async () => {
  const p = createPersistence(fakeKv());
  expect(await p.load()).toBeNull();
  const d = emptyData();
  expect(await p.save(d, 0)).toBe(1);
  expect(await p.load()).toEqual({ data: d, rev: 1 });
});

test("a write based on a stale revision is refused and the stored data is kept", async () => {
  const kv = fakeKv();
  const tabA = createPersistence(kv);
  const tabB = createPersistence(kv);
  const a = { ...emptyData(), settings: { lastAccountId: "a", lastCategoryId: { expense: null, income: null } } };
  const b = { ...a, settings: { ...a.settings, lastAccountId: "b" } };
  await tabA.save(a, 0);
  await expect(tabB.save(b, 0)).rejects.toBeInstanceOf(StaleWriteError);
  expect((await tabB.load())?.data.settings.lastAccountId).toBe("a");
  expect(await tabB.save(b, 1)).toBe(2);
});

test("a legacy plain document loads as revision 0", async () => {
  const kv = fakeKv();
  await kv.set("organizador.data", emptyData());
  expect((await createPersistence(kv).load())?.rev).toBe(0);
});

test("clearAll removes the data", async () => {
  const p = createPersistence(fakeKv());
  await p.save(emptyData(), 0);
  await p.clearAll();
  expect(await p.load()).toBeNull();
});
