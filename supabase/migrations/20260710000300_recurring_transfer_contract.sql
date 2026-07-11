-- ============================================================
-- Recurring transfer rules and execution traceability
-- ============================================================

create type public.recurring_rule_kind as enum ('transaction', 'transfer');
create type public.recurring_execution_status as enum ('pending', 'completed', 'skipped', 'failed');

alter table public.recurring_transactions
    add column rule_kind public.recurring_rule_kind not null default 'transaction',
    add column destination_account_id uuid references public.accounts(id) on delete restrict,
    add column destination_pot_id uuid references public.saving_pots(id) on delete restrict;

comment on column public.recurring_transactions.pot_id is
    'Legacy optional saving-pot association for recurring income/expense rules. New recurring transfers use destination_pot_id.';
comment on column public.recurring_transactions.destination_account_id is
    'Transfer destination account. Required for transfer rules unless destination_pot_id is set.';
comment on column public.recurring_transactions.destination_pot_id is
    'Transfer destination saving pot. Required for transfer rules unless destination_account_id is set.';

alter table public.recurring_transactions
    add constraint recurring_transactions_destination_shape_check
    check (
        (rule_kind = 'transaction' and destination_account_id is null and destination_pot_id is null)
        or
        (rule_kind = 'transfer' and num_nonnulls(destination_account_id, destination_pot_id) = 1)
    ),
    add constraint recurring_transactions_direct_destination_differs_check
    check (destination_account_id is null or destination_account_id <> account_id);

create index idx_recurring_destination_account
    on public.recurring_transactions(destination_account_id)
    where destination_account_id is not null;
create index idx_recurring_destination_pot
    on public.recurring_transactions(destination_pot_id)
    where destination_pot_id is not null;

create or replace function public.validate_recurring_transaction_destinations()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    if not exists (
        select 1 from public.accounts account
        where account.id = new.account_id
          and account.household_id = new.household_id
    ) then
        raise exception 'Recurring source account must belong to the same household';
    end if;

    if new.category_id is not null and not exists (
        select 1 from public.categories category
        where category.id = new.category_id
          and category.household_id = new.household_id
    ) then
        raise exception 'Recurring category must belong to the same household';
    end if;

    if new.pot_id is not null and not exists (
        select 1 from public.saving_pots pot
        where pot.id = new.pot_id
          and pot.household_id = new.household_id
    ) then
        raise exception 'Recurring pot must belong to the same household';
    end if;

    if new.destination_account_id is not null and not exists (
        select 1 from public.accounts account
        where account.id = new.destination_account_id
          and account.household_id = new.household_id
    ) then
        raise exception 'Recurring destination account must belong to the same household';
    end if;

    if new.destination_pot_id is not null and not exists (
        select 1 from public.saving_pots pot
        where pot.id = new.destination_pot_id
          and pot.household_id = new.household_id
    ) then
        raise exception 'Recurring destination pot must belong to the same household';
    end if;

    return new;
end;
$$;

create trigger validate_recurring_transaction_destinations
before insert or update of household_id, account_id, category_id, pot_id, destination_account_id, destination_pot_id
on public.recurring_transactions
for each row
execute function public.validate_recurring_transaction_destinations();

create table public.recurring_run_executions (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    recurring_transaction_id uuid not null references public.recurring_transactions(id) on delete cascade,
    scheduled_for date not null,
    status public.recurring_execution_status not null default 'pending',
    skip_reason text,
    error_message text,
    transaction_ids uuid[] not null default '{}',
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    attempted_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint recurring_run_executions_rule_schedule_unique unique (recurring_transaction_id, scheduled_for),
    constraint recurring_run_executions_status_details_check check (
        (status = 'skipped' and skip_reason is not null)
        or (status = 'failed' and error_message is not null)
        or (status in ('pending', 'completed') and skip_reason is null and error_message is null)
    )
);

comment on table public.recurring_run_executions is
    'Idempotent audit records for every scheduled recurring-rule occurrence.';

create index idx_recurring_run_executions_household_scheduled
    on public.recurring_run_executions(household_id, scheduled_for desc);
create index idx_recurring_run_executions_rule_scheduled
    on public.recurring_run_executions(recurring_transaction_id, scheduled_for desc);
create index idx_recurring_run_executions_pending
    on public.recurring_run_executions(status)
    where status in ('pending', 'failed');

create or replace function public.validate_recurring_run_execution_household()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    if not exists (
        select 1 from public.recurring_transactions rule
        where rule.id = new.recurring_transaction_id
          and rule.household_id = new.household_id
    ) then
        raise exception 'Recurring execution must belong to the rule household';
    end if;

    return new;
end;
$$;

create trigger validate_recurring_run_execution_household
before insert or update of household_id, recurring_transaction_id
on public.recurring_run_executions
for each row
execute function public.validate_recurring_run_execution_household();

create trigger set_recurring_run_executions_updated_at
before update on public.recurring_run_executions
for each row
execute function public.update_updated_at();

alter table public.transactions
    add column recurring_execution_id uuid references public.recurring_run_executions(id) on delete set null;

comment on column public.transactions.recurring_execution_id is
    'Links a generated recurring transaction, including both legs of a transfer, to its execution record.';

create index idx_transactions_recurring_execution
    on public.transactions(recurring_execution_id)
    where recurring_execution_id is not null;

create or replace function public.validate_transaction_recurring_execution_household()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    if new.recurring_execution_id is not null and not exists (
        select 1 from public.recurring_run_executions execution
        where execution.id = new.recurring_execution_id
          and execution.household_id = new.household_id
    ) then
        raise exception 'Recurring execution must belong to the transaction household';
    end if;

    return new;
end;
$$;

create trigger validate_transaction_recurring_execution_household
before insert or update of household_id, recurring_execution_id
on public.transactions
for each row
execute function public.validate_transaction_recurring_execution_household();

alter table public.recurring_run_executions enable row level security;

create policy "Members can view recurring run executions"
on public.recurring_run_executions
for select
to authenticated
using (public.is_household_member(household_id, auth.uid()));

-- Writes are intentionally left to the service-role scheduler. Household members
-- manage rules, but cannot forge execution audit history through the public API.

revoke all on table public.recurring_run_executions from anon;
revoke all on table public.recurring_run_executions from authenticated;
grant select on table public.recurring_run_executions to authenticated;
grant usage on type public.recurring_rule_kind to authenticated;
grant usage on type public.recurring_execution_status to authenticated;

alter function public.validate_recurring_transaction_destinations() set search_path = public, pg_temp;
alter function public.validate_recurring_run_execution_household() set search_path = public, pg_temp;
alter function public.validate_transaction_recurring_execution_household() set search_path = public, pg_temp;
