-- ============================================================
-- Accounts
-- ============================================================

create table public.accounts (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    owner_profile_id uuid references public.profiles(id) on delete set null,
    name text not null,
    type public.account_type not null,
    currency public.currency_code not null default 'EUR'::public.currency_code,
    initial_balance numeric(14,2) not null default 0,
    icon text,
    color text,
    is_archived boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.accounts is 'Financial accounts belonging to a household. Accounts may be personal or shared.';
comment on column public.accounts.initial_balance is 'Opening balance. Current balance is calculated from transactions.';
comment on column public.accounts.owner_profile_id is 'NULL indicates a shared household account.';

create index idx_accounts_household on public.accounts(household_id);
create index idx_accounts_owner on public.accounts(owner_profile_id);
create index idx_accounts_archived on public.accounts(is_archived);

-- ============================================================
-- Triggers
-- ============================================================

create trigger set_accounts_updated_at
before update on public.accounts
for each row
execute function public.update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.accounts enable row level security;

create policy "Members can view accounts"
on public.accounts
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage accounts"
on public.accounts
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);
