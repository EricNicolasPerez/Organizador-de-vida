import type { Measure } from "./types";

export interface DraftSet {
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  distanceM: number | null;
}

export interface DraftExercise {
  exerciseId: string;
  name: string;
  measure: Measure;
  sets: DraftSet[];
}

export interface SessionDraft {
  clientId: string;
  routineId: string | null;
  routineDayId: string | null;
  /** YYYY-MM-DD */
  date: string;
  exercises: DraftExercise[];
}

/** localStorage-compatible key/value store. */
export interface KeyValueStore {
  get(k: string): string | null;
  set(k: string, v: string): void;
  remove(k: string): void;
}

const DRAFT_KEY = "atlas.sessionDraft";
const PENDING_KEY = "atlas.pendingSessions";

function readJson<T>(store: KeyValueStore, key: string, fallback: T): T {
  const raw = store.get(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveDraft(store: KeyValueStore, draft: SessionDraft): void {
  store.set(DRAFT_KEY, JSON.stringify(draft));
}

export function loadDraft(store: KeyValueStore): SessionDraft | null {
  const d = readJson<SessionDraft | null>(store, DRAFT_KEY, null);
  return d && typeof d === "object" && typeof d.clientId === "string" ? d : null;
}

export function clearDraft(store: KeyValueStore): void {
  store.remove(DRAFT_KEY);
}

export function listPending(store: KeyValueStore): SessionDraft[] {
  const list = readJson<unknown>(store, PENDING_KEY, []);
  return Array.isArray(list) ? (list as SessionDraft[]) : [];
}

export function enqueuePending(store: KeyValueStore, draft: SessionDraft): void {
  const list = listPending(store).filter((d) => d.clientId !== draft.clientId);
  store.set(PENDING_KEY, JSON.stringify([...list, draft]));
}

function removePending(store: KeyValueStore, clientId: string): void {
  store.set(PENDING_KEY, JSON.stringify(listPending(store).filter((d) => d.clientId !== clientId)));
}

const FAILED_KEY = "atlas.failedSessions";

export function listFailed(store: KeyValueStore): SessionDraft[] {
  const list = readJson<unknown>(store, FAILED_KEY, []);
  return Array.isArray(list) ? (list as SessionDraft[]) : [];
}

export function dismissFailed(store: KeyValueStore, clientId: string): void {
  store.set(FAILED_KEY, JSON.stringify(listFailed(store).filter((d) => d.clientId !== clientId)));
}

export type FlushOutcome = "uploaded" | "failed" | "rejected";

/**
 * Uploads each pending session; removes it only after its upload resolves.
 * Errors for which `isPermanent` returns true (the server refused the data) move the
 * session to a failed list so it stops blocking the queue; other errors keep it pending.
 */
export async function flushPending(
  store: KeyValueStore,
  upload: (d: SessionDraft) => Promise<void>,
  isPermanent: (error: unknown) => boolean = () => false,
): Promise<{ uploaded: number; failed: number; rejected: number; results: Record<string, FlushOutcome> }> {
  const results: Record<string, FlushOutcome> = {};
  for (const d of listPending(store)) {
    try {
      await upload(d);
      removePending(store, d.clientId);
      results[d.clientId] = "uploaded";
    } catch (e) {
      if (isPermanent(e)) {
        removePending(store, d.clientId);
        store.set(FAILED_KEY, JSON.stringify([...listFailed(store).filter((x) => x.clientId !== d.clientId), d]));
        results[d.clientId] = "rejected";
      } else {
        results[d.clientId] = "failed";
      }
    }
  }
  const count = (o: FlushOutcome) => Object.values(results).filter((r) => r === o).length;
  return { uploaded: count("uploaded"), failed: count("failed"), rejected: count("rejected"), results };
}

/** Adapter over window.localStorage that never throws (private mode, quota). */
export function browserStore(): KeyValueStore {
  return {
    get(k) {
      try { return window.localStorage.getItem(k); } catch { return null; }
    },
    set(k, v) {
      try { window.localStorage.setItem(k, v); } catch { /* ignore */ }
    },
    remove(k) {
      try { window.localStorage.removeItem(k); } catch { /* ignore */ }
    },
  };
}
