# Versión simple: un solo link (v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Next.js + Supabase v1 with a static, login-free PWA (Vite + React) that stores everything on the device, keeps 100 % of the Finance and Training features, and is published to GitHub Pages from `main`.

**Architecture:** One in-memory `AppData` document held in a tiny store (`useSyncExternalStore`), persisted to IndexedDB on every change via `idb-keyval`. Pure, already-tested logic in `src/lib/**` is reused untouched; all data mutations live in pure, tested functions under `src/store/ops/*.ts` (`(data, input) => data`), and screens are thin React components over hash routes. `vite-plugin-pwa` precaches the whole app; a GitHub Actions workflow deploys `dist/` to Pages.

**Tech Stack:** Vite 8, React 19, TypeScript, Tailwind CSS 4 (`@tailwindcss/vite`), `idb-keyval` 6, `vite-plugin-pwa` 2, Vitest 5, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-17-version-simple-un-solo-link-design.md` (functional scope: `docs/superpowers/specs/2026-11-16-finanzas-entrenamiento-design.md`)

## Global Constraints

- UI in Spanish (voseo). Identifiers in English. Dark theme as in v1 (`globals.css` tokens).
- Money in integer cents; `numeric` strings no longer exist — `Movement.amountCents` etc. as in `src/lib/finance/types.ts`.
- Currencies `'ARS' | 'USD'`; credit cards ARS only; one active routine.
- Routing by hash: `#/`, `#/finanzas`, `#/finanzas/cuentas`, `#/finanzas/categorias`, `#/finanzas/movimiento/:id`, `#/entrenamiento`, `#/entrenamiento/rutinas`, `#/entrenamiento/rutinas/:id`, `#/entrenamiento/sesion?dia=:id`, `#/entrenamiento/historial/:date`, `#/ajustes`.
- Vite `base: "/Organizador-de-vida/"`.
- Seed categories: Comida, Transporte, Casa, Servicios, Salud, Ocio, Compras, Otros (expense); Sueldo, Otros (income).
- Keep every existing pure module and its tests green; delete `src/lib/supabase`, `src/lib/**/queries.ts`, `src/lib/training/session-draft.*`, `src/lib/finance/mappers.*` (toDecimal no longer needed), `src/app`, `src/components`, `src/proxy.ts`, `supabase/`, `tests/db`, `public/sw.js`, Next config/deps.

## Review Focus

1. **Restore with a bad or old file** — a JSON that is not an `AppData` (wrong `version`, missing arrays) must be refused with a message, never wipe current data. Test in Task 2.
2. **Reload mid-session** — a draft with typed sets survives a full reload of `#/entrenamiento/sesion`, and "Descartar" starts fresh. Test in Task 5 (ops) + manual check in Task 6.
3. **Delete a category/account in use** — archiving keeps movements readable; a category id missing from the list renders "Sin categoría" rather than crashing. Test in Task 3.
4. **Deleting a routine day with sessions** — sessions keep `dayName`; `nextRoutineDay` falls back to first day. Test in Task 5.
5. **Two tabs / stale persistence** — writes are serialized (no interleaved saves losing data). Test in Task 2 (`persist` queue).

---

## File Structure

```
index.html, vite.config.ts, tsconfig.json, vitest.config.ts, .github/workflows/pages.yml
src/main.tsx                      mount + register SW
src/app.tsx                       hash router + layout (header, bottom nav, QuickAdd FAB)
src/router.ts                     useHashRoute(): { path, params, query }, navigate()
src/styles.css                    tokens + component classes (from v1 globals.css)
src/store/types.ts                AppData, Exercise, Routine, RoutineDay, RoutineDayExercise, Session, SessionDraft
src/store/store.ts                getData/subscribe/update(fn) + useData() hook; persistence hook-up
src/store/persist.ts              load(): Promise<AppData|null>, save(data) (serialized queue), clear()
src/store/backup.ts               serialize(data) -> string, parseBackup(text) -> AppData | Error
src/store/seed.ts                 emptyData(): AppData with seeded categories
src/store/ops/finance.ts          addMovement, updateMovement, deleteMovement, addAccount, renameAccount, setAccountArchived, adjustBalance, addCategory, renameCategory, setCategoryArchived
src/store/ops/training.ts         routines/days/exercises ops, setDraft/clearDraft, finishSession
src/screens/*.tsx                 one file per screen (Home, Finanzas, Cuentas, Categorias, Movimiento, Entrenamiento, Rutinas, Rutina, Sesion, Historial, Ajustes)
src/components/*.tsx              Money, BottomNav, QuickAdd, MovementForm, SetField
```

---

### Task 1: Scaffold Vite app, keep pure modules and tests green

**Files:**
- Delete: everything listed under Global Constraints (Next/Supabase).
- Create: `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/app.tsx` (placeholder "Organizador"), `src/styles.css` (tokens + `.card .input .btn-primary .btn-ghost .label` from v1), `.github/workflows/pages.yml`, `README.md` (rewrite), `.gitignore`.
- Modify: `package.json` (scripts: `dev`, `build`, `preview`, `test`, `lint` = `tsc --noEmit`).

**Interfaces:** Produces the build (`pnpm build` → `dist/`), `pnpm test` running `src/**/*.test.ts`.

- [ ] Step 1: `git rm` the deleted paths; `pnpm remove next react-dom @supabase/* server-only @electric-sql/pglite eslint*`; `pnpm add react react-dom idb-keyval`; `pnpm add -D vite @vitejs/plugin-react @tailwindcss/vite tailwindcss vite-plugin-pwa vitest typescript @types/react @types/react-dom`.
- [ ] Step 2: `vite.config.ts`: `base: "/Organizador-de-vida/"`, plugins react, tailwind, `VitePWA({ registerType: "autoUpdate", manifest: { name: "Organizador", short_name: "Organizador", lang: "es-AR", display: "standalone", start_url: "/Organizador-de-vida/", background_color: "#0b0b0f", theme_color: "#0b0b0f", icons: [192, 512 from public/icons, 512 maskable] }, workbox: { navigateFallback: "/Organizador-de-vida/index.html" } })`.
- [ ] Step 3: `pages.yml`: on push to `main` → `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`, `actions/upload-pages-artifact` (`dist`), `actions/deploy-pages`. Permissions `pages: write, id-token: write`.
- [ ] Step 4: Run `pnpm test` → all existing lib tests PASS (money, balances, summary, movement-form, next-day, draft-from-day, set-input). Run `pnpm build` → `dist/index.html` exists, `dist/manifest.webmanifest` has `"display":"standalone"`.
- [ ] Step 5: Commit `feat: scaffold static Vite PWA, drop Next/Supabase`.

### Task 2: Data model, persistence and backup

**Files:**
- Create: `src/store/types.ts`, `src/store/seed.ts`, `src/store/persist.ts`, `src/store/backup.ts`, `src/store/store.ts`
- Test: `src/store/backup.test.ts`, `src/store/persist.test.ts`, `src/store/store.test.ts`

**Interfaces (Produces):**
- `types.ts`: re-export `Account, Category, Movement, Currency` from `lib/finance/types`; `Exercise { id; name; muscleGroup: string|null; measure: Measure }`; `RoutineDayExercise { id; exerciseId; position; targetSets; targetReps: number|null; targetWeight: number|null }`; `RoutineDay { id; position; name; exercises: RoutineDayExercise[] }`; `Routine { id; name; isActive; days: RoutineDay[] }`; `SessionSet = DraftSet` (from `draft-from-day`'s `DraftSet` — move `DraftSet`, `DraftExercise`, `SessionDraft` type defs into `src/lib/training/types.ts` since `session-draft.ts` is deleted); `Session { id; clientId; routineId: string|null; routineDayId: string|null; dayName: string|null; date; createdAt: string; exercises: DraftExercise[] }`; `Settings { lastAccountId: string|null; lastCategoryId: Record<'expense'|'income', string|null> }`; `AppData { version: 1; accounts; categories; movements; exercises; routines; sessions; draft: SessionDraft|null; settings }`.
- `seed.ts`: `emptyData(): AppData` (10 seeded categories, `uuid()` from `draft-from-day`).
- `persist.ts`: `const KEY = "organizador.data"`; `load(): Promise<AppData|null>`; `save(data): Promise<void>` — serialized: a second call while one is in flight waits and saves the latest; `clearAll(): Promise<void>`. Uses `idb-keyval` `get/set/del`; accept an injectable `{get,set,del}` for tests.
- `backup.ts`: `serializeBackup(data): string` (pretty JSON with `exportedAt`); `parseBackup(text): { ok: true; data: AppData } | { ok: false; error: string }` — rejects non-JSON, `version !== 1`, or any missing array with `"El archivo no es una copia válida del Organizador"`; `backupFileName(date: Date): string` = `organizador-YYYY-MM-DD.json`.
- `store.ts`: `getData(): AppData`; `subscribe(cb)`; `update(fn: (d: AppData) => AppData): void` (sets, notifies, calls `save`); `replaceAll(data)`; `useData(): AppData` via `useSyncExternalStore`; `initStore(): Promise<void>` (load or `emptyData()`).

- [ ] Step 1: Failing tests:
  - backup: round trip `parseBackup(serializeBackup(emptyData()))` ok and equal (ignoring `exportedAt`); `parseBackup("{not json")` → error message above; `parseBackup(JSON.stringify({version: 2}))` → not ok; missing `movements` → not ok; `backupFileName(new Date(2026,10,17))` → `organizador-2026-11-17.json`.
  - persist (fake async store with a delay): `save(a); save(b); save(c)` → final stored value is `c`, and `set` was called at most twice (coalesced), never interleaved.
  - store: `update` notifies subscribers with new data and calls `save` with it; `replaceAll` likewise.
- [ ] Step 2: Run → FAIL. Step 3: implement. Step 4: PASS. Step 5: Commit `feat: local data store with IndexedDB persistence and backup`.

### Task 3: Finance operations (pure)

**Files:**
- Create: `src/store/ops/finance.ts`
- Test: `src/store/ops/finance.test.ts`

**Interfaces (Produces, all `(data: AppData, …) => AppData`, pure, new ids via `uuid()`):**
- `addMovement(data, row: MovementInsertCents)` where `MovementInsertCents = { kind: 'expense'|'income'|'transfer'; accountId; amountCents; toAccountId: string|null; toAmountCents: number|null; categoryId: string|null; date; note: string|null }`; also updates `settings.lastAccountId` and `settings.lastCategoryId[kind]` when not transfer.
- `updateMovement(data, id, row)`, `deleteMovement(data, id)`.
- `addAccount(data, { name, currency, type, initialBalanceCents })` — if `type === 'credit_card'`: currency forced `ARS`, positive initial stored negative. `renameAccount(data, id, name)`, `setAccountArchived(data, id, archived)`.
- `adjustBalance(data, accountId, realCents)` — inserts `adjustment` movement for `adjustmentAmount(accountBalance(...), realCents)` with note "Ajuste de saldo"; no-op when diff is 0.
- `addCategory(data, { name, kind })`, `renameCategory(data, id, name)`, `setCategoryArchived(data, id, archived)`.
- `parseMovementFormCents(form: FormData, accounts): { ok: true; row: MovementInsertCents } | { ok: false; error }` — wraps existing `parseMovementForm` and converts its decimal strings to cents (`Math.round(Number(s)*100)`).

- [ ] Step 1: Failing tests: addMovement stores row + updates last used; transfer does not touch lastCategoryId; updateMovement replaces fields; deleteMovement removes; addAccount credit card → `currency 'ARS'`, `initialBalanceCents -30000` when given `30000`; adjustBalance creates signed adjustment (current 1000_00, real 950_00 → `-5000`) and no-op when equal; rename/archive; archived category still referenced by movement stays in `categories` (archive never deletes); `parseMovementFormCents` yields `amountCents 123450` for "1.234,50".
- [ ] Step 2–5: FAIL → implement → PASS → Commit `feat: finance operations`.

### Task 4: Finance screens

**Files:**
- Create: `src/router.ts`, `src/app.tsx` (layout + routes), `src/components/{money,bottom-nav,quick-add,movement-form}.tsx`, `src/screens/{home,finanzas,cuentas,categorias,movimiento}.tsx`
- Test: `src/router.test.ts` (`parseHash("#/finanzas/movimiento/abc?x=1")` → `{ path: "/finanzas/movimiento/abc", query: { x: "1" } }`; `matchRoute("/finanzas/movimiento/:id", path)` → `{ id: "abc" }`; empty hash → `/`).

**Interfaces:** Consumes Tasks 2–3 and `lib/finance/*`, `lib/dates`, `lib/money`. Port v1 JSX from `v1-supabase` branch (`src/app/(app)/finanzas/**`, `src/components/*`), replacing server actions with `update(d => op(d, …))` and `navigate()`.

- [ ] Step 1: router tests → FAIL → implement `parseHash`, `matchRoute`, `useHashRoute`, `navigate(to)` → PASS.
- [ ] Step 2: Layout: header "Organizador" + link "Ajustes"; bottom nav Inicio/Finanzas/Entrenamiento; QuickAdd FAB on every screen.
- [ ] Step 3: Port screens: Home (Disponible ARS/USD, Debés en tarjetas, ingresos/gastos del mes; "Hoy te toca" card placeholder until Task 7), Finanzas (month switcher via `?mes=`, summary per currency, category bars, movements list with `?cuenta=` filter), Cuentas (list, new, rename, archive, adjust), Categorías, Movimiento (edit/delete; adjustment view-only). MovementForm: same behaviour as v1 (last used account/category from `settings`, cross-currency "Recibís", errors in Spanish).
- [ ] Step 4: `pnpm lint && pnpm build` → OK. Playwright at 390×844 against `pnpm preview`: create account "Efectivo" with 1000, add expense 250,50 via "+", home shows `$ 749,50`; screenshot. Commit `feat: finance screens`.

### Task 5: Training operations (pure)

**Files:**
- Create: `src/store/ops/training.ts`
- Test: `src/store/ops/training.test.ts`

**Interfaces (Produces):**
- Routines: `addRoutine(data, name)` (active if none active), `renameRoutine`, `setActiveRoutine(data, id)` (atomic: exactly one active), `deleteRoutine(data, id)` (sessions keep their `routineId`/`routineDayId` ids and `dayName`; nothing cascades), `addDay(data, routineId, name)`, `renameDay`, `moveDay(data, routineId, dayId, -1|1)`, `deleteDay(data, routineId, dayId)` (sessions' `routineDayId` set to null, `dayName` kept), `addDayExercise(data, routineId, dayId, { exerciseId?: string; newName?: string; measure?: Measure; muscleGroup?: string|null; targetSets; targetReps; targetWeight })` (creates exercise when `exerciseId` absent), `removeDayExercise(data, routineId, dayId, id)`, `addExercise(data, name, measure)`.
- Sessions: `activeRoutine(data): Routine|null`; `lastSessionDayId(data, routineId): string|null` (latest by `date` then `createdAt`); `lastSets(data, exerciseIds): Record<string, DraftSet[]>` (from most recent session containing that exercise); `setDraft(data, draft|null)`; `finishSession(data, draft, now: string): AppData` — appends `Session` with `dayName` looked up from routine (null for free), drops exercises with zero sets, clears `draft`; idempotent on `clientId`.
- `sessionsOn(data, date): Session[]`, `recentSessions(data, limit)`.

- [ ] Step 1: Failing tests: addRoutine first is active, second is not; setActiveRoutine leaves exactly one active; moveDay swaps positions; deleteDay nulls `routineDayId` on sessions but keeps `dayName` and `nextRoutineDay(days, lastSessionDayId)` returns first day; addDayExercise with `newName` creates exercise with given measure; finishSession twice with same clientId → one session; finishSession stores dayName and clears draft; lastSets returns latest session's sets for an exercise; setDraft round trip survives `parseBackup(serializeBackup(data))`.
- [ ] Step 2–5: FAIL → implement → PASS → Commit `feat: training operations`.

### Task 6: Training screens

**Files:**
- Create: `src/components/set-field.tsx`, `src/screens/{entrenamiento,rutinas,rutina,sesion,historial}.tsx`; Modify `src/screens/home.tsx` (Hoy te toca), `src/app.tsx` (routes).

**Interfaces:** Consumes Task 5, `lib/training/{next-day,draft-from-day,set-input}`.

- [ ] Step 1: Port v1 screens (`src/app/(app)/entrenamiento/**` on `v1-supabase`): Entrenamiento (Hoy te toca, Empezar, Hacer otro día, Entrenamiento libre, Historial grouped by date), Rutinas, Rutina (days/exercises editing), Sesión (resumes `data.draft` if present with "Descartar"; every change → `update(d => setDraft(d, draft))`; Terminar → `finishSession` then `navigate('/entrenamiento/historial/'+date)`), Historial.
- [ ] Step 2: `pnpm lint && pnpm build`. Playwright: create routine "PPL", day "Día A", exercise "Press banca" 3×10 50kg; home shows "Día A"; start session, type "22,5" in Kg of set 1, reload page → value still "22,5"; Terminar → history shows `10 × 22,5 kg`; back on Entrenamiento "Hoy te toca" is still "Día A" (single day wraps). Screenshot. Commit `feat: training screens`.

### Task 7: Ajustes (backup/restore/erase) and release

**Files:**
- Create: `src/screens/ajustes.tsx`; Modify `README.md`.

- [ ] Step 1: Ajustes screen: "Hacer copia" → downloads `serializeBackup(getData())` as `backupFileName(new Date())`; "Restaurar" → `<input type=file>` → `parseBackup` → `confirm("Esto reemplaza todos los datos actuales. ¿Continuar?")` → `replaceAll`; errors shown in Spanish; "Borrar todos los datos" → confirm → `replaceAll(emptyData())`. Shows app version from `package.json` and a line "Tus datos se guardan solo en este dispositivo."
- [ ] Step 2: Playwright: Hacer copia produces a download whose JSON parses with `version: 1`; Restaurar with `{"foo":1}` shows the error and data unchanged.
- [ ] Step 3: README: one-time step to enable Pages (Settings → Pages → Source: GitHub Actions), the link, how to install on the phone, backup advice. Remove Supabase instructions.
- [ ] Step 4: `pnpm test && pnpm lint && pnpm build` green. Commit `feat: settings with backup and restore; docs`. Push.
