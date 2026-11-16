import { beforeEach, expect, test } from "vitest";
import {
  clearDraft, enqueuePending, flushPending, listPending, loadDraft, saveDraft,
  type KeyValueStore, type SessionDraft,
} from "./session-draft";

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  get(k: string) { return this.data.get(k) ?? null; }
  set(k: string, v: string) { this.data.set(k, v); }
  remove(k: string) { this.data.delete(k); }
}

const draft = (clientId = "11111111-1111-4111-8111-111111111111"): SessionDraft => ({
  clientId, routineId: "r1", routineDayId: "d1", date: "2026-11-16",
  exercises: [{ exerciseId: "e1", name: "Press banca", measure: "reps_weight",
    sets: [{ reps: 10, weightKg: 60, durationSec: null, distanceM: null }] }],
});

let store: MemoryStore;
beforeEach(() => { store = new MemoryStore(); });

test("save/load round trip and clear", () => {
  saveDraft(store, draft());
  expect(loadDraft(store)).toEqual(draft());
  clearDraft(store);
  expect(loadDraft(store)).toBeNull();
});

test("corrupted storage returns null instead of throwing", () => {
  store.set("atlas.sessionDraft", "{not json");
  store.set("atlas.pendingSessions", "garbage");
  expect(loadDraft(store)).toBeNull();
  expect(listPending(store)).toEqual([]);
});

test("enqueue is idempotent per clientId", () => {
  enqueuePending(store, draft());
  enqueuePending(store, draft());
  expect(listPending(store)).toHaveLength(1);
});

test("failed upload keeps the session; later success removes it", async () => {
  enqueuePending(store, draft());
  const failed = await flushPending(store, async () => { throw new Error("offline"); });
  expect(failed).toEqual({ uploaded: 0, failed: 1 });
  expect(listPending(store)).toHaveLength(1);

  const uploadedIds: string[] = [];
  const ok = await flushPending(store, async (d) => { uploadedIds.push(d.clientId); });
  expect(ok).toEqual({ uploaded: 1, failed: 0 });
  expect(listPending(store)).toEqual([]);
  expect(uploadedIds).toEqual([draft().clientId]);
});

test("one failure does not block the others", async () => {
  enqueuePending(store, draft("a"));
  enqueuePending(store, draft("b"));
  const res = await flushPending(store, async (d) => { if (d.clientId === "a") throw new Error("x"); });
  expect(res).toEqual({ uploaded: 1, failed: 1 });
  expect(listPending(store).map((d) => d.clientId)).toEqual(["a"]);
});
