-- Entrenamiento: ejercicios, rutinas con días rotativos, sesiones y series.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  muscle_group text,
  measure text not null default 'reps_weight' check (measure in ('reps_weight', 'time', 'distance')),
  created_at timestamptz not null default now()
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index routines_one_active on public.routines (user_id) where is_active;

create table public.routine_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  position int not null default 0,
  name text not null check (length(trim(name)) > 0)
);

create table public.routine_day_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_day_id uuid not null references public.routine_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position int not null default 0,
  target_sets int not null default 3 check (target_sets between 1 and 20),
  target_reps int check (target_reps > 0),
  target_weight numeric(6, 2) check (target_weight >= 0)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null,
  routine_id uuid references public.routines (id) on delete set null,
  routine_day_id uuid references public.routine_days (id) on delete set null,
  day_name text,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index workout_sessions_user_date on public.workout_sessions (user_id, date desc);

create table public.session_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position int not null,
  set_number int not null,
  reps int check (reps >= 0),
  weight_kg numeric(6, 2) check (weight_kg >= 0),
  duration_sec int check (duration_sec >= 0),
  distance_m numeric(8, 1) check (distance_m >= 0)
);
create index session_sets_session on public.session_sets (session_id);

alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_day_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_sets enable row level security;

create policy exercises_owner on public.exercises for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy routines_owner on public.routines for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy routine_days_owner on public.routine_days for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()));

create policy routine_day_exercises_owner on public.routine_day_exercises for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and exists (select 1 from public.routine_days d where d.id = routine_day_id and d.user_id = auth.uid())
    and exists (select 1 from public.exercises e where e.id = exercise_id and e.user_id = auth.uid()));

create policy workout_sessions_owner on public.workout_sessions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and (routine_id is null or exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()))
    and (routine_day_id is null or exists (select 1 from public.routine_days d where d.id = routine_day_id and d.user_id = auth.uid())));

create policy session_sets_owner on public.session_sets for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
    and exists (select 1 from public.exercises e where e.id = exercise_id and e.user_id = auth.uid()));

grant select, insert, update, delete on
  public.exercises, public.routines, public.routine_days, public.routine_day_exercises,
  public.workout_sessions, public.session_sets
to authenticated;

-- Guarda una sesión completa (payload = SessionDraft en camelCase) en una sola transacción.
-- Idempotente por clientId: si ya existe, devuelve la sesión existente sin duplicar series.
create function public.save_workout_session(payload jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  sid uuid;
  ex jsonb;
  st jsonb;
  ex_pos int := 0;
  set_no int;
  v_day_id uuid := nullif(payload ->> 'routineDayId', '')::uuid;
begin
  insert into workout_sessions (client_id, routine_id, routine_day_id, day_name, date)
  values (
    (payload ->> 'clientId')::uuid,
    nullif(payload ->> 'routineId', '')::uuid,
    v_day_id,
    (select d.name from routine_days d where d.id = v_day_id),
    coalesce((payload ->> 'date')::date, current_date)
  )
  on conflict (user_id, client_id) do nothing
  returning id into sid;

  if sid is null then
    select s.id into sid from workout_sessions s
    where s.user_id = auth.uid() and s.client_id = (payload ->> 'clientId')::uuid;
    return sid;
  end if;

  for ex in select * from jsonb_array_elements(coalesce(payload -> 'exercises', '[]'::jsonb)) loop
    set_no := 0;
    for st in select * from jsonb_array_elements(coalesce(ex -> 'sets', '[]'::jsonb)) loop
      set_no := set_no + 1;
      insert into session_sets (session_id, exercise_id, position, set_number, reps, weight_kg, duration_sec, distance_m)
      values (
        sid,
        (ex ->> 'exerciseId')::uuid,
        ex_pos,
        set_no,
        (st ->> 'reps')::int,
        (st ->> 'weightKg')::numeric,
        (st ->> 'durationSec')::int,
        (st ->> 'distanceM')::numeric
      );
    end loop;
    ex_pos := ex_pos + 1;
  end loop;

  return sid;
end;
$$;

revoke all on function public.save_workout_session(jsonb) from public;
grant execute on function public.save_workout_session(jsonb) to authenticated;
