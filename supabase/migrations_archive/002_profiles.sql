-- ============================================================
-- Profiles
-- ============================================================

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    full_name text,
    avatar_url text,
    preferred_currency text not null default 'EUR',
    locale text not null default 'en',
    timezone text,
    -- default_household_id added after households table (see 003_households.sql)
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User profiles linked to auth.users.';
comment on column public.profiles.preferred_currency is 'ISO 4217 currency code (EUR, USD, GBP...)';
comment on column public.profiles.locale is 'Preferred locale (en, pt-PT, es...)';
comment on column public.profiles.timezone is 'IANA timezone (Europe/Lisbon, Europe/Madrid...)';

-- ============================================================
-- Triggers
-- ============================================================

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles enable row level security;

create policy "Profiles can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Profiles can update their own profile"
on public.profiles
for update
using (auth.uid() = id);

create policy "Profiles can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

-- Note: "Members can view household profiles" policy added in 003_households.sql
-- after household_members table exists.
