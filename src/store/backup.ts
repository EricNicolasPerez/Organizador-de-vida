import type { AppData } from "./types";

const ARRAYS = ["accounts", "categories", "movements", "exercises", "routines", "sessions"] as const;
const ERROR = "El archivo no es una copia válida del Organizador";

export function serializeBackup(data: AppData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
}

export function parseBackup(text: string): { ok: true; data: AppData } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: ERROR };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: ERROR };
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return { ok: false, error: ERROR };
  if (!ARRAYS.every((k) => Array.isArray(o[k]))) return { ok: false, error: ERROR };
  const settings = (o.settings ?? {}) as Partial<AppData["settings"]>;
  const data: AppData = {
    version: 1,
    accounts: o.accounts as AppData["accounts"],
    categories: o.categories as AppData["categories"],
    movements: o.movements as AppData["movements"],
    exercises: o.exercises as AppData["exercises"],
    routines: o.routines as AppData["routines"],
    sessions: o.sessions as AppData["sessions"],
    draft: (o.draft as AppData["draft"]) ?? null,
    settings: {
      lastAccountId: settings.lastAccountId ?? null,
      lastCategoryId: { expense: settings.lastCategoryId?.expense ?? null, income: settings.lastCategoryId?.income ?? null },
      defaultRoutinesAdded: settings.defaultRoutinesAdded ?? false,
    },
  };
  return { ok: true, data };
}

export function backupFileName(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `organizador-${y}-${m}-${d}.json`;
}
