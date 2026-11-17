import { expect, test, vi } from "vitest";
import { createStore } from "./store";
import { StaleWriteError } from "./persist";
import { emptyData } from "./seed";
import type { AppData } from "./types";

const withAcc = (d: AppData, id: string): AppData => ({ ...d, settings: { ...d.settings, lastAccountId: id } });
const tick = () => new Promise((r) => setTimeout(r, 0));

test("update notifies subscribers and saves with the current revision", async () => {
  const save = vi.fn(async () => 1);
  const s = createStore(emptyData(), { save, load: async () => null });
  const seen: string[] = [];
  s.subscribe(() => seen.push(s.getData().settings.lastAccountId ?? ""));
  s.update((d) => withAcc(d, "x"));
  expect(seen).toEqual(["x"]);
  await tick();
  expect(save).toHaveBeenCalledWith(s.getData(), 0);
  s.update((d) => withAcc(d, "y"));
  await tick();
  expect(save).toHaveBeenLastCalledWith(s.getData(), 1);
});

test("rapid updates are written one at a time, last one wins", async () => {
  let inFlight = 0, max = 0, rev = 0;
  const save = vi.fn(async (_d: AppData, _r: number) => { inFlight++; max = Math.max(max, inFlight); await tick(); inFlight--; return ++rev; });
  const s = createStore(emptyData(), { save, load: async () => null });
  s.update((d) => withAcc(d, "a")); s.update((d) => withAcc(d, "b")); s.update((d) => withAcc(d, "c"));
  await s.flush();
  expect(max).toBe(1);
  expect(save.mock.calls.length).toBeLessThanOrEqual(2);
  expect((save.mock.calls.at(-1)![0] as AppData).settings.lastAccountId).toBe("c");
});

test("a stale write reloads the newer document and reports the conflict", async () => {
  const fresh = withAcc(emptyData(), "other-tab");
  const save = vi.fn(async () => { throw new StaleWriteError(); });
  const s = createStore(emptyData(), { save, load: async () => ({ data: fresh, rev: 5 }) });
  s.update((d) => withAcc(d, "mine"));
  await s.flush();
  expect(s.getData().settings.lastAccountId).toBe("other-tab");
  expect(s.getStatus().conflict).toBe(true);
  expect(s.getStatus().rev).toBe(5);
});

test("a failed save is reported, not swallowed", async () => {
  const save = vi.fn(async () => { throw new Error("quota"); });
  const s = createStore(emptyData(), { save, load: async () => null });
  s.update((d) => withAcc(d, "x"));
  await s.flush();
  expect(s.getStatus().saveFailed).toBe(true);
});

test("replaceAll swaps the whole document and saves", async () => {
  const save = vi.fn(async () => 1);
  const s = createStore(emptyData(), { save, load: async () => null });
  const next = withAcc(emptyData(), "n");
  s.replaceAll(next);
  expect(s.getData()).toBe(next);
  await tick();
  expect(save).toHaveBeenLastCalledWith(next, 0);
});

test("refresh hydrates from storage when nothing is pending", async () => {
  const fresh = withAcc(emptyData(), "other-tab");
  const s = createStore(emptyData(), { save: async () => 1, load: async () => ({ data: fresh, rev: 3 }) });
  await s.refresh();
  expect(s.getData()).toBe(fresh);
  expect(s.getStatus().rev).toBe(3);
});
