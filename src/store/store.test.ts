import { expect, test, vi } from "vitest";
import { createStore } from "./store";
import { emptyData } from "./seed";

test("update notifies subscribers and saves the new data", () => {
  const save = vi.fn(async () => {});
  const s = createStore(emptyData(), save);
  const seen: string[] = [];
  s.subscribe(() => seen.push(s.getData().settings.lastAccountId ?? ""));
  s.update((d) => ({ ...d, settings: { ...d.settings, lastAccountId: "x" } }));
  expect(seen).toEqual(["x"]);
  expect(save).toHaveBeenCalledWith(s.getData());
});

test("replaceAll swaps the whole document and saves", () => {
  const save = vi.fn(async () => {});
  const s = createStore(emptyData(), save);
  const next = { ...emptyData(), accounts: [{ id: "a", name: "Efectivo", currency: "ARS" as const, type: "cash" as const, initialBalanceCents: 0, archived: false }] };
  s.replaceAll(next);
  expect(s.getData()).toBe(next);
  expect(save).toHaveBeenLastCalledWith(next);
});
