-- Finanzas: cuentas, categorías y movimientos. Cada fila pertenece a un usuario (RLS).

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  currency text not null check (currency in ('ARS', 'USD')),
  type text not null default 'cash' check (type in ('cash', 'credit_card')),
  initial_balance numeric(14, 2) not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  constraint credit_card_is_ars check (type <> 'credit_card' or currency = 'ARS')
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind text not null check (kind in ('expense', 'income')),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('expense', 'income', 'transfer', 'adjustment')),
  account_id uuid not null references public.accounts (id) on delete cascade,
  amount numeric(14, 2) not null,
  to_account_id uuid references public.accounts (id) on delete cascade,
  to_amount numeric(14, 2),
  category_id uuid references public.categories (id) on delete set null,
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  constraint amount_positive check (kind = 'adjustment' or amount > 0),
  constraint adjustment_nonzero check (kind <> 'adjustment' or amount <> 0),
  constraint transfer_shape check (
    (kind = 'transfer' and to_account_id is not null and to_amount is not null and to_amount > 0
       and to_account_id <> account_id and category_id is null)
    or (kind <> 'transfer' and to_account_id is null and to_amount is null)
  )
);

create index movements_user_date on public.movements (user_id, date desc);
create index accounts_user on public.accounts (user_id);
create index categories_user on public.categories (user_id);

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.movements enable row level security;

create policy accounts_owner on public.accounts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy categories_owner on public.categories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy movements_owner on public.movements for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and (to_account_id is null or exists (select 1 from public.accounts a where a.id = to_account_id and a.user_id = auth.uid()))
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid()))
  );

grant select, insert, update, delete on public.accounts, public.categories, public.movements to authenticated;

-- Crea las categorías por defecto del usuario actual si todavía no tiene ninguna.
create function public.seed_default_categories() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  perform pg_advisory_xact_lock(hashtext('seed_categories:' || uid::text));
  if exists (select 1 from public.categories where user_id = uid) then
    return;
  end if;
  insert into public.categories (user_id, name, kind)
  select uid, n, 'expense'
  from unnest(array['Comida', 'Transporte', 'Casa', 'Servicios', 'Salud', 'Ocio', 'Compras', 'Otros']) as n;
  insert into public.categories (user_id, name, kind)
  select uid, n, 'income' from unnest(array['Sueldo', 'Otros']) as n;
end;
$$;

revoke all on function public.seed_default_categories() from public;
grant execute on function public.seed_default_categories() to authenticated;
