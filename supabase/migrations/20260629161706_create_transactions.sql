-- ============================================================
-- Transactions
-- ============================================================

create table public.transactions (

    id uuid primary key default gen_random_uuid(),

    household_id uuid not null
        references public.households(id)
        on delete cascade,

    account_id uuid not null
        references public.accounts(id)
        on delete restrict,

    category_id uuid
        references public.categories(id)
        on delete set null,

    transfer_group_id uuid,

    title text not null,

    notes text,

    amount numeric(14,2) not null
        check (amount > 0),

    type public.transaction_type not null,

    transaction_date timestamptz not null default now(),

    created_by uuid not null
        references public.profiles(id)
        on delete restrict,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

comment on table public.transactions is
'Stores all income and expense transactions.';

comment on column public.transactions.transfer_group_id is
'Links two transactions representing an account transfer.';

create index idx_transactions_household
on public.transactions(household_id);

create index idx_transactions_account
on public.transactions(account_id);

create index idx_transactions_category
on public.transactions(category_id);

create index idx_transactions_date
on public.transactions(transaction_date desc);

create index idx_transactions_type
on public.transactions(type);

create index idx_transactions_transfer
on public.transactions(transfer_group_id);

create index idx_transactions_created_by
on public.transactions(created_by);