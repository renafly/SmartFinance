-- ============================================================
-- Accounts
-- ============================================================

create table public.accounts (

    id uuid primary key default gen_random_uuid(),

    household_id uuid not null
        references public.households(id)
        on delete cascade,

    name text not null,

    type public.account_type not null,

    currency text not null default 'EUR',

    initial_balance numeric(14,2) not null default 0,

    icon text,

    color text,

    is_archived boolean not null default false,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

comment on table public.accounts is
'Financial accounts belonging to a household.';

comment on column public.accounts.initial_balance is
'Opening balance. Current balance is calculated from transactions.';

create index idx_accounts_household
on public.accounts(household_id);

create index idx_accounts_archived
on public.accounts(is_archived);