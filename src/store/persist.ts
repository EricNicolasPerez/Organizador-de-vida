import { del, get, set } from "idb-keyval";
import type { AppData } from "./types";

export const KEY = "organizador.data";

export interface KeyValue {
  get(k: string): Promise<unknown>;
  set(k: string, v: unknown): Promise<void>;
  del(k: string): Promise<void>;
}

/** Thrown when another tab wrote a newer revision since this tab last loaded. */
export class StaleWriteError extends Error {
  constructor() { super("stale write"); this.name = "StaleWriteError"; }
}

interface Envelope { rev: number; data: AppData }

function unwrap(v: unknown): Envelope | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.rev === "number" && o.data && (o.data as AppData).version === 1) return { rev: o.rev, data: o.data as AppData };
  if ((o as unknown as AppData).version === 1) return { rev: 0, data: o as unknown as AppData }; // legacy plain document
  return null;
}

/** Revisioned storage: every write must be based on the revision currently stored, otherwise it is refused. */
export function createPersistence(kv: KeyValue) {
  return {
    async load(): Promise<Envelope | null> {
      return unwrap(await kv.get(KEY));
    },
    /** Writes `data` if the stored revision is still `baseRev`; returns the new revision. */
    async save(data: AppData, baseRev: number): Promise<number> {
      const current = unwrap(await kv.get(KEY));
      if ((current?.rev ?? 0) !== baseRev) throw new StaleWriteError();
      const rev = baseRev + 1;
      await kv.set(KEY, { rev, data } satisfies Envelope);
      return rev;
    },
    async clearAll(): Promise<void> {
      await kv.del(KEY);
    },
  };
}

export const persistence = createPersistence({ get, set, del });
