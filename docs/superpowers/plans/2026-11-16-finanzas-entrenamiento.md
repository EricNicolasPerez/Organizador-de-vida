# Finanzas y Entrenamiento (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, installable web app (Spanish UI) with login, a Finance module (ARS/USD accounts, credit cards, quick add, monthly summary) and a Training module (rotating routines, "hoy te toca", session logging that survives no signal, history).

**Architecture:** Next.js App Router talks to Supabase (Postgres + Auth) through `@supabase/ssr`. All business rules (balances, card debt, monthly summary, next routine day, offline queue) live in pure TypeScript modules under `src/lib/**`, unit-tested with Vitest. The database schema, RLS policies and RPCs live in `supabase/migrations/*.sql`, tested in-process with PGlite against a stub `auth` schema.

**Tech Stack:** Next.js 16 (App Router, TypeScript, `src/` dir), Tailwind CSS 4, `@supabase/supabase-js` + `@supabase/ssr`, Vitest 5, `@electric-sql/pglite` (tests only), pnpm.

**Spec:** `docs/superpowers/specs/2026-11-16-finanzas-entrenamiento-design.md`

## Global Constraints

- UI copy in Spanish (Argentina, voseo: "Registrá", "Te toca"). Code identifiers in English.
- Currencies: exactly `'ARS' | 'USD'`. No conversion between them anywhere.
- Account types: `'cash'` (counts toward Disponible) and `'credit_card'` (ARS only; enforced by DB check).
- Money: DB `numeric(14,2)`; in TS, integer cents (`number`). Never floats for stored amounts. Format with `Intl.NumberFormat('es-AR', { style: 'currency', currency })`.
- Every user-owned table has `user_id uuid not null default auth.uid()` and RLS `user_id = auth.uid()` for select/insert/update/delete.
- Sign-up is closed in v1: the app has no sign-up page; owner account is created in the Supabase dashboard (document in README).
- Mobile-first; bottom nav: Inicio · Finanzas · Entrenamiento.
- Seed categories (expense): Comida, Transporte, Casa, Servicios, Salud, Ocio, Compras, Otros. (income): Sueldo, Otros.

## Review Focus

1. **Card payment counted twice** — paying a card (transfer cash→card) must lower Disponible and card debt but never appear as an expense in the monthly summary. Test in Task 3.
2. **Cross-currency transfer** (buy USD with ARS) — source loses `amount`, destination gains `to_amount`; ARS and USD totals each move correctly. Test in Task 2.
3. **Session finished with no signal / retried twice** — the pending session must upload exactly once (idempotent on `client_id`) and the draft must not be lost on reload. Tests in Tasks 5 and 7.
4. **Routine edited after sessions exist** (a day deleted, or last session's day no longer in routine) — "hoy te toca" falls back to the first day instead of crashing. Test in Task 4.
5. **Amount input with Argentine formatting** ("1.234,50", "1234.5", "  500 ") parses to correct cents; empty/zero/negative rejected. Test in Task 2.

---

## File Structure

```
src/lib/money.ts                      parse/format cents
src/lib/finance/types.ts              Account, Movement, Category types
src/lib/finance/balances.ts           account balances, Disponible, card debt
src/lib/finance/summary.ts            monthly summary per currency
src/lib/training/types.ts             Routine, RoutineDay, Session types
src/lib/training/next-day.ts          "hoy te toca"
src/lib/training/session-draft.ts     local draft + pending upload queue
src/lib/supabase/{client,server,middleware}.ts
src/middleware.ts                     auth guard
supabase/migrations/0001_finance.sql
supabase/migrations/0002_training.sql
tests/db/helpers.ts                   PGlite boot with stub auth
tests/db/*.test.ts, src/lib/**/*.test.ts
src/app/login/page.tsx
src/app/(app)/layout.tsx              bottom nav + QuickAdd FAB
src/app/(app)/page.tsx                Inicio panel
src/app/(app)/finanzas/...            summary, movements, cuentas, categorias, actions.ts
src/app/(app)/entrenamiento/...       hoy, rutinas, sesion, historial, actions.ts
src/app/manifest.ts, public/icons/*
```

---

### Task 1: Scaffold, tooling and auth shell

**Files:**
- Create: Next.js app via `pnpm create next-app@16.4.6 . --ts --tailwind --app --src-dir --eslint --use-pnpm --import-alias "@/*"` (run in a temp dir and move in, since repo has `docs/`)
- Create: `vitest.config.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/middleware.ts`, `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx` (placeholder), `.env.example`, `README.md`
- Test: `src/lib/smoke.test.ts`

**Interfaces:**
- Produces: `createClient()` (browser) in `client.ts`; `async createClient()` (server, cookies) in `server.ts`; `updateSession(req)` in `middleware.ts`. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- [ ] Step 1: Scaffold; add deps `@supabase/supabase-js @supabase/ssr`, dev deps `vitest @electric-sql/pglite`; script `"test": "vitest run"`.
- [ ] Step 2: Write `smoke.test.ts` (`expect(1+1).toBe(2)`), run `pnpm test` → PASS.
- [ ] Step 3: Supabase clients per `@supabase/ssr` docs (verify current API with Context7). Middleware redirects unauthenticated requests to `/login` except `/login`, `/_next`, `/manifest.webmanifest`, `/icons`.
- [ ] Step 4: Login page: email + password, server action `signIn` → `supabase.auth.signInWithPassword`; on error show "Email o contraseña incorrectos". Logout action in `(app)/layout.tsx` menu. No sign-up link.
- [ ] Step 5: `(app)/layout.tsx`: bottom nav with 3 links (Inicio `/`, Finanzas `/finanzas`, Entrenamiento `/entrenamiento`), active state, `pb-20` content padding, dark theme default.
- [ ] Step 6: README: setup steps (create Supabase project, run migrations, disable sign-ups in Auth settings, create owner user, set env vars, `pnpm dev`).
- [ ] Step 7: `pnpm build` succeeds (with dummy env vars). Commit `feat: scaffold app with Supabase auth shell`.

### Task 2: Money parsing and account balances

**Files:**
- Create: `src/lib/money.ts`, `src/lib/finance/types.ts`, `src/lib/finance/balances.ts`
- Test: `src/lib/money.test.ts`, `src/lib/finance/balances.test.ts`

**Interfaces:**
- Produces:
  - `type Currency = 'ARS' | 'USD'`; `type AccountType = 'cash' | 'credit_card'`
  - `interface Account { id: string; name: string; currency: Currency; type: AccountType; initialBalanceCents: number; archived: boolean }`
  - `type MovementKind = 'expense' | 'income' | 'transfer' | 'adjustment'`
  - `interface Movement { id: string; kind: MovementKind; accountId: string; amountCents: number; toAccountId: string | null; toAmountCents: number | null; categoryId: string | null; date: string /* YYYY-MM-DD */; note: string | null }` — `amountCents > 0` except `adjustment`, which is signed.
  - `parseAmount(input: string): number | null` (cents; null if empty/invalid/≤0)
  - `formatMoney(cents: number, currency: Currency): string`
  - `accountBalance(account: Account, movements: Movement[]): number`
  - `availableByCurrency(accounts: Account[], movements: Movement[]): Record<Currency, number>` (cash accounts only, non-archived)
  - `cardDebt(accounts: Account[], movements: Movement[]): number` (sum of `-balance` of credit cards, ARS cents, ≥0 per card)
  - `adjustmentAmount(currentCents: number, realCents: number): number` (= real − current)

- [ ] Step 1: Failing tests:
  - `parseAmount('1.234,50') === 123450`, `('1234.5') === 123450`, `('  500 ') === 50000`, `('1234,5') === 123450`, `('') === null`, `('0') === null`, `('-3') === null`, `('abc') === null`.
  - `formatMoney(123450,'ARS')` contains `1.234,50`.
  - balance: initial 1000_00 + income 500_00 − expense 200_00 = 1300_00.
  - transfer ARS→USD: ARS acct `amountCents 120000_00` out, USD acct `toAmountCents 100_00` in; `availableByCurrency` → `{ARS: before−120000_00, USD: before+100_00}`.
  - card: expense 300_00 on card → card balance −300_00, `cardDebt === 300_00`, Disponible ARS unchanged; transfer cash→card 300_00 → Disponible ARS −300_00, `cardDebt === 0`.
  - adjustment movement −50_00 lowers balance by 50_00; `adjustmentAmount(1000_00, 950_00) === -50_00`.
  - archived cash account excluded from Disponible.
- [ ] Step 2: `pnpm test` → FAIL.
- [ ] Step 3: Implement. `parseAmount`: trim; if contains `,` treat `.` as thousands and `,` as decimal; else `.` is decimal; max 2 decimals; round to integer cents.
- [ ] Step 4: `pnpm test` → PASS. Commit `feat: money parsing and account balances`.

### Task 3: Monthly summary

**Files:**
- Create: `src/lib/finance/summary.ts`
- Test: `src/lib/finance/summary.test.ts`

**Interfaces:**
- Consumes: Task 2 types.
- Produces: `interface CurrencySummary { incomeCents: number; expenseCents: number; balanceCents: number; byCategory: { categoryId: string; cents: number }[] /* desc */ }`; `monthlySummary(accounts: Account[], movements: Movement[], month: string /* YYYY-MM */): Record<Currency, CurrencySummary>`; `shiftMonth(month: string, delta: number): string`.

- [ ] Step 1: Failing tests: expense on card in month counts as expense (ARS); transfer cash→card does NOT count; transfers and adjustments never count; movements outside month ignored; USD expenses only in `USD` summary; `byCategory` sorted desc; `shiftMonth('2026-01',-1) === '2025-12'`.
- [ ] Step 2: Run → FAIL. Step 3: Implement (currency of a movement = currency of its `accountId`). Step 4: Run → PASS. Commit `feat: monthly finance summary`.

### Task 4: "Hoy te toca"

**Files:**
- Create: `src/lib/training/types.ts`, `src/lib/training/next-day.ts`
- Test: `src/lib/training/next-day.test.ts`

**Interfaces:**
- Produces:
  - `type Measure = 'reps_weight' | 'time' | 'distance'`
  - `interface RoutineDay { id: string; position: number; name: string }`
  - `nextRoutineDay(days: RoutineDay[], lastSessionDayId: string | null): RoutineDay | null`

- [ ] Step 1: Failing tests: no days → null; no last session → first by position; last = A → B; last = last day → first (wrap); `lastSessionDayId` not in days → first; unsorted input still ordered by `position`.
- [ ] Step 2–4: FAIL → implement → PASS. Commit `feat: next routine day rotation`.

### Task 5: Session draft and pending upload queue

**Files:**
- Create: `src/lib/training/session-draft.ts`
- Test: `src/lib/training/session-draft.test.ts`

**Interfaces:**
- Consumes: `Measure` from Task 4.
- Produces:
  - `interface DraftSet { reps: number | null; weightKg: number | null; durationSec: number | null; distanceM: number | null }`
  - `interface DraftExercise { exerciseId: string; name: string; measure: Measure; sets: DraftSet[] }`
  - `interface SessionDraft { clientId: string; routineId: string | null; routineDayId: string | null; date: string; exercises: DraftExercise[] }`
  - `interface KeyValueStore { get(k: string): string | null; set(k: string, v: string): void; remove(k: string): void }` (localStorage-compatible)
  - `saveDraft(store, draft)`, `loadDraft(store): SessionDraft | null`, `clearDraft(store)`
  - `enqueuePending(store, draft)`, `listPending(store): SessionDraft[]`
  - `async flushPending(store, upload: (d: SessionDraft) => Promise<void>): Promise<{ uploaded: number; failed: number }>` — removes each only after `upload` resolves.
  - Keys: `atlas.sessionDraft`, `atlas.pendingSessions`.

- [ ] Step 1: Failing tests (in-memory store): save/load round trip; corrupted JSON in store → `loadDraft` returns null (no throw); enqueue same `clientId` twice → one entry; `flushPending` with upload rejecting → entry kept, `failed: 1`; then resolving → removed, `uploaded: 1`.
- [ ] Step 2–4: FAIL → implement → PASS. Commit `feat: offline session draft and queue`.

### Task 6: Finance schema, RLS and seed

**Files:**
- Create: `supabase/migrations/0001_finance.sql`, `tests/db/helpers.ts`
- Test: `tests/db/finance.test.ts`

**Interfaces:**
- Produces tables: `accounts(id uuid pk default gen_random_uuid(), user_id, name text, currency text check in ('ARS','USD'), type text check in ('cash','credit_card'), initial_balance numeric(14,2) default 0, archived bool default false, created_at)` + check `type <> 'credit_card' or currency = 'ARS'`; `categories(id, user_id, name, kind text check in ('expense','income'), archived bool)`; `movements(id, user_id, kind text check in ('expense','income','transfer','adjustment'), account_id fk, amount numeric(14,2), to_account_id fk null, to_amount numeric(14,2) null, category_id fk null, date date default current_date, note text, created_at)` with checks: transfer ⇔ to_account_id & to_amount not null; `amount > 0` unless adjustment.
- Function `public.seed_default_categories()` (security definer, inserts seed list for `auth.uid()` if user has none) — called by app on first load of Finanzas.
- `tests/db/helpers.ts`: `bootDb(): Promise<PGlite>` creates schema `auth` with `auth.users(id uuid pk)`, `auth.uid()` returning `current_setting('request.jwt.claim.sub', true)::uuid`, role `authenticated`, applies all migrations in order; `asUser(db, userId, fn)` sets role + claim inside a transaction.

- [ ] Step 1: Failing tests: user A inserts account; user B selects → 0 rows; B cannot update A's movement; credit_card with USD rejected; expense with amount 0 rejected; transfer without to_amount rejected; `seed_default_categories()` twice → 10 categories, not 20.
- [ ] Step 2–4: FAIL → write migration (grant usage/select/insert/update/delete to `authenticated`) → PASS. Commit `feat: finance schema with RLS`.

### Task 7: Training schema, RLS and save RPC

**Files:**
- Create: `supabase/migrations/0002_training.sql`
- Test: `tests/db/training.test.ts`

**Interfaces:**
- Produces tables: `exercises(id, user_id, name, muscle_group text null, measure text check in ('reps_weight','time','distance'))`; `routines(id, user_id, name, is_active bool)` + partial unique index one active per user; `routine_days(id, user_id, routine_id fk cascade, position int, name)`; `routine_day_exercises(id, user_id, routine_day_id fk cascade, exercise_id fk, position int, target_sets int, target_reps int null, target_weight numeric(6,2) null)`; `workout_sessions(id, user_id, client_id uuid unique, routine_id fk set null, routine_day_id fk set null, date date, created_at)`; `session_sets(id, user_id, session_id fk cascade, exercise_id fk, position int, set_number int, reps int, weight_kg numeric(6,2), duration_sec int, distance_m numeric(8,1))`.
- RPC `public.save_workout_session(payload jsonb) returns uuid` (security invoker): payload = `SessionDraft` JSON shape from Task 5 (camelCase); inserts session + sets in one transaction; if `client_id` exists for this user, returns existing id without inserting.

- [ ] Step 1: Failing tests: RPC called twice with same clientId → 1 session, sets not duplicated; user B can't see A's sessions; second active routine for same user rejected; deleting a routine day sets session.routine_day_id null (history kept).
- [ ] Step 2–4: FAIL → implement → PASS. Commit `feat: training schema and save RPC`.

### Task 8: Finance UI

**Files:**
- Create: `src/lib/finance/queries.ts` (server: `getFinanceData(): Promise<{accounts, categories, movements}>` mapping snake_case numeric strings → cents), `src/app/(app)/finanzas/actions.ts`, `src/app/(app)/finanzas/page.tsx`, `src/app/(app)/finanzas/cuentas/page.tsx`, `src/app/(app)/finanzas/categorias/page.tsx`, `src/components/quick-add.tsx`, `src/components/money.tsx`
- Modify: `src/app/(app)/layout.tsx` (mount QuickAdd FAB), `src/app/(app)/page.tsx` (Disponible card)
- Test: `src/lib/finance/queries.test.ts` (row mapping only)

**Interfaces:**
- Consumes: Tasks 2, 3, 6.
- Produces server actions: `createMovement(form: FormData)`, `updateMovement(id, form)`, `deleteMovement(id)`, `createAccount(form)`, `updateAccount(id, form)`, `adjustBalance(accountId, realAmount: string)`, `createCategory(form)`, `renameCategory(id, name)`; all `revalidatePath('/')` and `'/finanzas'`.

- [ ] Step 1: Failing test: `rowToMovement({amount:'1234.50', to_amount:null, ...}).amountCents === 123450`; `rowToAccount` maps `initial_balance`.
- [ ] Step 2–4: FAIL → implement mappers → PASS.
- [ ] Step 5: QuickAdd: FAB "+" opens bottom sheet; field order: amount (autofocus, `inputMode="decimal"`), toggle Gasto/Ingreso/Transferencia, account (default last used, kept in localStorage `atlas.lastAccount`), category (default last used per kind), date (today), note. Transfer shows destination account and, if currencies differ, a second amount "Recibís". Validation via `parseAmount`; error "Ingresá un monto válido".
- [ ] Step 6: `/finanzas`: month switcher (`shiftMonth`), ARS and USD summary blocks (hide USD block if user has no USD accounts), category bars, movement list filterable by account; tap → edit/delete. Calls `seed_default_categories` RPC on load.
- [ ] Step 7: `/finanzas/cuentas`: list with balances, create/edit (name, moneda, tipo; tarjeta forces ARS), "Ajustar saldo" (input real balance → `adjustment` movement). `/finanzas/categorias`: list, add, rename, archive.
- [ ] Step 8: Inicio: "Disponible" card showing ARS and USD totals, "Debés en tarjetas" if > 0, month income/expense ARS.
- [ ] Step 9: `pnpm test && pnpm build` → PASS. Commit `feat: finance UI`.

### Task 9: Training UI

**Files:**
- Create: `src/lib/training/queries.ts`, `src/app/(app)/entrenamiento/actions.ts`, `src/app/(app)/entrenamiento/page.tsx`, `.../rutinas/page.tsx`, `.../rutinas/[id]/page.tsx`, `.../sesion/page.tsx` + `session-logger.tsx` (client), `.../historial/[date]/page.tsx`, `src/components/pending-sync.tsx`
- Modify: `src/app/(app)/page.tsx` (Hoy te toca card), `src/app/(app)/layout.tsx` (mount PendingSync)
- Test: `src/lib/training/queries.test.ts` (`draftFromDay(day, exercises, lastSets)` prefill)

**Interfaces:**
- Consumes: Tasks 4, 5, 7.
- Produces: `draftFromDay(dayExercises: {exerciseId, name, measure, targetSets}[], lastSets: Record<string /*exerciseId*/, DraftSet[]>, routineId, dayId, date): SessionDraft` — one `DraftExercise` per exercise with `targetSets` sets prefilled from last session values (or nulls).

- [ ] Step 1: Failing tests for `draftFromDay`: sets count = targetSets; values copied from last session when present; new `clientId` each call (uuid format).
- [ ] Step 2–4: FAIL → implement → PASS.
- [ ] Step 5: Rutinas: list, create, set active, edit days (add/rename/reorder/delete) and exercises per day (pick from library or create inline with measure; target sets/reps/weight).
- [ ] Step 6: `/entrenamiento`: "Hoy te toca: {day.name}" via `nextRoutineDay` (last session of active routine), button "Empezar", selector to pick another day; empty state linking to create a routine; history list grouped by date.
- [ ] Step 7: Session logger (client): resumes `loadDraft` if present, else builds via `draftFromDay`; every change `saveDraft`; inputs per measure; add/remove set/exercise; "Terminar" → `enqueuePending` + `clearDraft` + `flushPending(store, d => supabase.rpc('save_workout_session', { payload: d }))`; if failed, toast "Guardado en el celular, se subirá cuando haya conexión".
- [ ] Step 8: `PendingSync`: on mount and on `window` `online` event calls `flushPending`; shows small badge "N sin subir" if pending.
- [ ] Step 9: Historial `[date]`: sessions of that date with day name and sets.
- [ ] Step 10: `pnpm test && pnpm build` → PASS. Commit `feat: training UI`.

### Task 10: PWA and final check

**Files:**
- Create: `src/app/manifest.ts` (name "Organizador", short_name "Organizador", `display: 'standalone'`, `start_url: '/'`, theme/background `#0b0b0f`), `public/icons/icon-192.png`, `public/icons/icon-512.png` (simple generated icon), `public/sw.js` (minimal: cache app shell for offline load of `/entrenamiento/sesion`), registration in `(app)/layout.tsx`.

- [ ] Step 1: `pnpm build && pnpm start`, then with Playwright at 390×844: login page renders; `/manifest.webmanifest` returns JSON with `display: standalone`.
- [ ] Step 2: `pnpm test` all PASS. Commit `feat: PWA manifest and service worker`. Push.
