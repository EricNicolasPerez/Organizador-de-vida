import { useSyncExternalStore } from "react";
import { emptyData } from "./seed";
import { persistence } from "./persist";
import type { AppData } from "./types";

export function createStore(initial: AppData, save: (d: AppData) => Promise<void>) {
  let data = initial;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  return {
    getData: () => data,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
    update(fn: (d: AppData) => AppData) {
      data = fn(data);
      notify();
      void save(data).catch(() => {});
    },
    replaceAll(next: AppData) {
      data = next;
      notify();
      void save(data).catch(() => {});
    },
    /** Replace the in-memory document without saving (used on initial load). */
    hydrate(next: AppData) {
      data = next;
      notify();
    },
  };
}

const store = createStore(emptyData(), (d) => persistence.save(d));

export const getData = store.getData;
export const subscribe = store.subscribe;
export const update = store.update;
export const replaceAll = store.replaceAll;

export function useData(): AppData {
  return useSyncExternalStore(store.subscribe, store.getData, store.getData);
}

export async function initStore(): Promise<void> {
  const loaded = await persistence.load();
  if (loaded) store.hydrate(loaded);
  else await persistence.save(store.getData());
}
