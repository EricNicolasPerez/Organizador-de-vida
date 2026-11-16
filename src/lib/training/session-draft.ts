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

/** Uploads each pending session; removes it only after its upload resolves. */
export async function flushPending(
  store: KeyValueStore,
  upload: (d: SessionDraft) => Promise<void>,
): Promise<{ uploaded: number; failed: number }> {
  let uploaded = 0;
  let failed = 0;
  for (const d of listPending(store)) {
    try {
      await upload(d);
      removePending(store, d.clientId);
      uploaded++;
    } catch {
      failed++;
    }
  }
  return { uploaded, failed };
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
