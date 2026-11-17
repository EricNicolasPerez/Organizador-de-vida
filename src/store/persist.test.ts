import { expect, test } from "vitest";
import { createPersistence } from "./persist";
import { emptyData } from "./seed";

function fakeKv() {
  const store = new Map<string, unknown>();
  let inFlight = 0;
  let maxInFlight = 0;
  let sets = 0;
  return {
    kv: {
      async get(k: string) { return store.get(k); },
      async set(k: string, v: unknown) {
        inFlight++; sets++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        store.set(k, v);
        inFlight--;
      },
      async del(k: string) { store.delete(k); },
    },
    store, stats: () => ({ maxInFlight, sets }),
  };
}

test("load returns null when nothing stored, then what was saved", async () => {
  const { kv } = fakeKv();
  const p = createPersistence(kv);
  expect(await p.load()).toBeNull();
  const d = emptyData();
  await p.save(d);
  expect(await p.load()).toEqual(d);
});

test("rapid saves are serialized and coalesced; last one wins", async () => {
  const { kv, stats } = fakeKv();
  const p = createPersistence(kv);
  const a = { ...emptyData(), settings: { lastAccountId: "a", lastCategoryId: { expense: null, income: null } } };
  const b = { ...a, settings: { ...a.settings, lastAccountId: "b" } };
  const c = { ...a, settings: { ...a.settings, lastAccountId: "c" } };
  void p.save(a); void p.save(b);
  await p.save(c);
  expect((await p.load())?.settings.lastAccountId).toBe("c");
  expect(stats().maxInFlight).toBe(1);
  expect(stats().sets).toBeLessThanOrEqual(2);
});

test("clearAll removes the data", async () => {
  const { kv } = fakeKv();
  const p = createPersistence(kv);
  await p.save(emptyData());
  await p.clearAll();
  expect(await p.load()).toBeNull();
});
