import { useSyncExternalStore } from "react";
import { emptyData } from "./seed";
import { persistence, StaleWriteError } from "./persist";
import type { AppData } from "./types";

export interface Backend {
  save(data: AppData, baseRev: number): Promise<number>;
  load(): Promise<{ data: AppData; rev: number } | null>;
}

export interface StoreStatus {
  rev: number;
  /** Another tab wrote newer data; this tab reloaded it and the last change was dropped. */
  conflict: boolean;
  /** The last save failed (storage unavailable or full). */
  saveFailed: boolean;
  /** The initial load failed: storage is unusable. */
  loadFailed: boolean;
}

export function createStore(initial: AppData, backend: Backend) {
  let data = initial;
  let status: StoreStatus = { rev: 0, conflict: false, saveFailed: false, loadFailed: false };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const setStatus = (patch: Partial<StoreStatus>) => { status = { ...status, ...patch }; notify(); };

  let pending: AppData | null = null;
  let draining: Promise<void> | null = null;

  async function drain(): Promise<void> {
    while (pending) {
      const next = pending;
      pending = null;
      try {
        const rev = await backend.save(next, status.rev);
        setStatus({ rev, saveFailed: false });
      } catch (e) {
        if (e instanceof StaleWriteError) {
          pending = null;
          await hydrateFromStorage();
          setStatus({ conflict: true });
        } else {
          setStatus({ saveFailed: true });
        }
      }
    }
    draining = null;
  }

  function schedule(next: AppData) {
    data = next;
    notify();
    pending = next;
    if (!draining) draining = drain();
  }

  async function hydrateFromStorage(): Promise<void> {
    const loaded = await backend.load();
    if (loaded) {
      data = loaded.data;
      status = { ...status, rev: loaded.rev };
      notify();
    }
  }

  return {
    getData: () => data,
    getStatus: () => status,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
    update(fn: (d: AppData) => AppData) {
      schedule(fn(data));
    },
    replaceAll(next: AppData) {
      schedule(next);
    },
    /** Reload from storage (another tab may have written) unless this tab has unsaved changes. */
    async refresh(): Promise<void> {
      if (pending || draining) return;
      await hydrateFromStorage();
    },
    clearConflict() { setStatus({ conflict: false }); },
    markLoadFailed() { setStatus({ loadFailed: true }); },
    flush: async () => { while (draining) await draining; },
  };
}

const store = createStore(emptyData(), persistence);

export const getData = store.getData;
export const getStatus = store.getStatus;
export const subscribe = store.subscribe;
export const update = store.update;
export const replaceAll = store.replaceAll;
export const refresh = store.refresh;
export const clearConflict = store.clearConflict;

export function useData(): AppData {
  return useSyncExternalStore(store.subscribe, store.getData, store.getData);
}

export function useStatus(): StoreStatus {
  return useSyncExternalStore(store.subscribe, store.getStatus, store.getStatus);
}

/** Loads the saved document (or seeds a fresh one) and wires cross-tab sync. */
export async function initStore(): Promise<void> {
  try {
    const loaded = await persistence.load();
    if (!loaded) await persistence.save(store.getData(), 0);
    await store.refresh();
  } catch {
    store.markLoadFailed();
    return;
  }
  try { void navigator.storage?.persist?.(); } catch { /* unsupported */ }
  const onWake = () => { if (document.visibilityState === "visible") void store.refresh(); };
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("focus", onWake);
}
