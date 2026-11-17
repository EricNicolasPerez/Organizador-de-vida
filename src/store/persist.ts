import { del, get, set } from "idb-keyval";
import type { AppData } from "./types";

export const KEY = "organizador.data";

export interface KeyValue {
  get(k: string): Promise<unknown>;
  set(k: string, v: unknown): Promise<void>;
  del(k: string): Promise<void>;
}

/** Persistence with serialized, coalesced writes: while one save is in flight, only the latest pending value is written next. */
export function createPersistence(kv: KeyValue) {
  let inFlight: Promise<void> | null = null;
  let pending: AppData | null = null;

  async function drain(): Promise<void> {
    while (pending) {
      const next = pending;
      pending = null;
      await kv.set(KEY, next);
    }
    inFlight = null;
  }

  return {
    async load(): Promise<AppData | null> {
      const v = await kv.get(KEY);
      return v && typeof v === "object" && (v as AppData).version === 1 ? (v as AppData) : null;
    },
    save(data: AppData): Promise<void> {
      pending = data;
      if (!inFlight) inFlight = drain();
      return inFlight;
    },
    async clearAll(): Promise<void> {
      if (inFlight) await inFlight;
      pending = null;
      await kv.del(KEY);
    },
  };
}

export const persistence = createPersistence({ get, set, del });
