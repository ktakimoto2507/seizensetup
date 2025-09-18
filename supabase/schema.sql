-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  display_name text,
  created_at timestamptz default now()
);

-- Beneficiaries
create table if not exists public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relation text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Results
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('ex00','deus00','machina00')),
  payload jsonb not null,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.results enable row level security;

create policy if not exists "profiles self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy if not exists "beneficiaries by owner" on public.beneficiaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "results by owner" on public.results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
