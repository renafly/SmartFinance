-- ============================================================
-- Recurring Transactions
-- ============================================================

create table public.recurring_transactions (

    id uuid primary key default gen_random_uuid(),

    household_id uuid not null
        references public.households(id)
        on delete cascade,

    account_id uuid not null
        references public.accounts(id)
        on delete cascade,

    category_id uuid
        references public.categories(id)
        on delete set null,

    title text not null,

    notes text,

    amount numeric(14,2) not null
        check (amount > 0),

    type public.transaction_type not null,

    frequency public.recurring_frequency not null,

    next_run date not null,

    last_run date,

    is_active boolean not null default true,

    created_by uuid not null
        references public.profiles(id)
        on delete restrict,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

comment on table public.recurring_transactions is
'Templates used to automatically generate recurring transactions.';

create index idx_recurring_household
on public.recurring_transactions(household_id);

create index idx_recurring_account
on public.recurring_transactions(account_id);

create index idx_recurring_category
on public.recurring_transactions(category_id);

create index idx_recurring_next_run
on public.recurring_transactions(next_run);

create index idx_recurring_active
on public.recurring_transactions(is_active);

create trigger set_recurring_transactions_updated_at
before update on public.recurring_transactions
for each row
execute function public.update_updated_at();