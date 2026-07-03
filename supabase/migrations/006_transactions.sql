-- ============================================================
-- Transactions
-- ============================================================

create table public.transactions (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    account_id uuid not null references public.accounts(id) on delete restrict,
    category_id uuid references public.categories(id) on delete set null,
    transfer_group_id uuid,
    title text not null,
    notes text,
    amount numeric(14,2) not null check (amount > 0),
    type public.transaction_type not null,
    transaction_date timestamptz not null default now(),
    created_by uuid not null references public.profiles(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.transactions is 'Stores all income and expense transactions.';
comment on column public.transactions.transfer_group_id is 'Links two transactions representing an account transfer.';

create index idx_transactions_household on public.transactions(household_id);
create index idx_transactions_account on public.transactions(account_id);
create index idx_transactions_category on public.transactions(category_id);
create index idx_transactions_date on public.transactions(transaction_date desc);
create index idx_transactions_type on public.transactions(type);
create index idx_transactions_transfer on public.transactions(transfer_group_id);
create index idx_transactions_created_by on public.transactions(created_by);

-- ============================================================
-- Triggers
-- ============================================================

create trigger set_transactions_updated_at
before update on public.transactions
for each row
execute function public.update_updated_at();

-- ============================================================
-- Transfer RPC
-- ============================================================

create or replace function public.create_transfer(
    p_household_id uuid,
    p_from_account_id uuid,
    p_to_account_id uuid,
    p_amount numeric,
    p_title text,
    p_notes text,
    p_transaction_date timestamptz,
    p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_transfer_group_id uuid := gen_random_uuid();
begin

    if p_amount <= 0 then
        raise exception 'Transfer amount must be greater than zero';
    end if;

    if p_from_account_id = p_to_account_id then
        raise exception 'Source and destination accounts must be different';
    end if;

    -- Expense leg (money leaving source account)
    insert into public.transactions (
        household_id, account_id, category_id, transfer_group_id,
        title, notes, amount, type, transaction_date, created_by
    )
    values (
        p_household_id, p_from_account_id, null, v_transfer_group_id,
        p_title, p_notes, p_amount, 'expense', p_transaction_date, p_created_by
    );

    -- Income leg (money arriving in destination account)
    insert into public.transactions (
        household_id, account_id, category_id, transfer_group_id,
        title, notes, amount, type, transaction_date, created_by
    )
    values (
        p_household_id, p_to_account_id, null, v_transfer_group_id,
        p_title, p_notes, p_amount, 'income', p_transaction_date, p_created_by
    );

    return v_transfer_group_id;

end;
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table public.transactions enable row level security;

create policy "Members can view transactions"
on public.transactions
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage transactions"
on public.transactions
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);
