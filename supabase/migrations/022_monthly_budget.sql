-- ============================================================
-- Monthly Budget Automation
-- ============================================================

create type public.household_income_mode as enum ('shared', 'individual');
create type public.remaining_cash_strategy as enum ('keep', 'fixed');
create type public.excess_cash_distribution_method as enum ('even_split');
create type public.monthly_budget_run_status as enum ('draft', 'confirmed', 'cancelled');
create type public.monthly_budget_section as enum ('income', 'savings', 'pots', 'investments', 'ppr', 'remaining_cash');

alter type public.account_type add value if not exists 'ppr';

alter table public.households
  add column if not exists income_mode public.household_income_mode not null default 'shared',
  add column if not exists remaining_cash_strategy public.remaining_cash_strategy not null default 'keep',
  add column if not exists fixed_remaining_cash_amount numeric(14,2) not null default 0,
  add column if not exists excess_cash_distribution_method public.excess_cash_distribution_method not null default 'even_split';

create table public.budget_configs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_budget_configs_active_household
  on public.budget_configs(household_id)
  where is_active;

create trigger set_budget_configs_updated_at
before update on public.budget_configs
for each row
execute function public.update_updated_at();

create table public.budget_rules (
  id uuid primary key default gen_random_uuid(),
  budget_config_id uuid not null references public.budget_configs(id) on delete cascade,
  name text not null,
  section public.monthly_budget_section not null,
  source_account_id uuid not null references public.accounts(id) on delete restrict,
  destination_account_id uuid not null references public.accounts(id) on delete restrict,
  owner_member_id uuid references public.profiles(id) on delete set null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  frequency public.recurring_frequency not null default 'monthly',
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_budget_rules_config on public.budget_rules(budget_config_id);
create index idx_budget_rules_source on public.budget_rules(source_account_id);
create index idx_budget_rules_destination on public.budget_rules(destination_account_id);

create trigger set_budget_rules_updated_at
before update on public.budget_rules
for each row
execute function public.update_updated_at();

create table public.monthly_budget_runs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  budget_config_id uuid not null references public.budget_configs(id) on delete restrict,
  month date not null,
  status public.monthly_budget_run_status not null default 'draft',
  income_mode_snapshot public.household_income_mode not null default 'shared',
  remaining_cash_strategy_snapshot public.remaining_cash_strategy not null default 'keep',
  preview_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_monthly_budget_runs_household_month
  on public.monthly_budget_runs(household_id, month);

create index idx_monthly_budget_runs_config on public.monthly_budget_runs(budget_config_id);

create trigger set_monthly_budget_runs_updated_at
before update on public.monthly_budget_runs
for each row
execute function public.update_updated_at();

create table public.monthly_income_inputs (
  id uuid primary key default gen_random_uuid(),
  monthly_budget_run_id uuid not null references public.monthly_budget_runs(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  cash_account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (monthly_budget_run_id, member_id)
);

create index idx_monthly_income_inputs_run on public.monthly_income_inputs(monthly_budget_run_id);
create index idx_monthly_income_inputs_member on public.monthly_income_inputs(member_id);

create trigger set_monthly_income_inputs_updated_at
before update on public.monthly_income_inputs
for each row
execute function public.update_updated_at();

alter table public.transactions
  add column if not exists monthly_budget_run_id uuid references public.monthly_budget_runs(id) on delete set null,
  add column if not exists generated_by_rule_id uuid references public.budget_rules(id) on delete set null,
  add column if not exists budget_section public.monthly_budget_section;

create index if not exists idx_transactions_monthly_budget_run on public.transactions(monthly_budget_run_id);
create index if not exists idx_transactions_generated_rule on public.transactions(generated_by_rule_id);

create or replace function public.create_transfer(
    p_household_id uuid,
    p_from_account_id uuid,
    p_to_account_id uuid,
    p_amount numeric,
    p_title text,
    p_notes text,
    p_transaction_date timestamptz,
    p_created_by uuid,
    p_category_id uuid default null,
    p_monthly_budget_run_id uuid default null,
    p_generated_by_rule_id uuid default null,
    p_budget_section public.monthly_budget_section default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_transfer_group_id uuid := gen_random_uuid();
    v_category_type public.category_type;
begin

    if p_amount <= 0 then
        raise exception 'Transfer amount must be greater than zero';
    end if;

    if p_from_account_id = p_to_account_id then
        raise exception 'Source and destination accounts must be different';
    end if;

    if p_category_id is not null then
        select c.type
          into v_category_type
          from public.categories c
         where c.id = p_category_id
           and c.household_id = p_household_id;

        if v_category_type is null then
            raise exception 'Transfer category is invalid for this household';
        end if;

        if v_category_type <> 'account' then
            raise exception 'Transfer category must be of type account';
        end if;
    end if;

    insert into public.transactions (
        household_id, account_id, category_id, transfer_group_id,
        monthly_budget_run_id, generated_by_rule_id, budget_section,
        title, notes, amount, type, transaction_date, created_by
    )
    values (
        p_household_id, p_from_account_id, p_category_id, v_transfer_group_id,
        p_monthly_budget_run_id, p_generated_by_rule_id, p_budget_section,
        p_title, p_notes, p_amount, 'expense', p_transaction_date, p_created_by
    );

    insert into public.transactions (
        household_id, account_id, category_id, transfer_group_id,
        monthly_budget_run_id, generated_by_rule_id, budget_section,
        title, notes, amount, type, transaction_date, created_by
    )
    values (
        p_household_id, p_to_account_id, p_category_id, v_transfer_group_id,
        p_monthly_budget_run_id, p_generated_by_rule_id, p_budget_section,
        p_title, p_notes, p_amount, 'income', p_transaction_date, p_created_by
    );

    return v_transfer_group_id;

end;
$$;

alter table public.budget_configs enable row level security;
alter table public.budget_rules enable row level security;
alter table public.monthly_budget_runs enable row level security;
alter table public.monthly_income_inputs enable row level security;

create policy "Members can view budget configs"
on public.budget_configs
for select
using (public.is_household_member(household_id, auth.uid()));

create policy "Admins can manage budget configs"
on public.budget_configs
for all
using (public.is_household_admin(household_id, auth.uid()))
with check (public.is_household_admin(household_id, auth.uid()));

create policy "Members can view budget rules"
on public.budget_rules
for select
using (
  exists (
    select 1
    from public.budget_configs bc
    where bc.id = budget_config_id
      and public.is_household_member(bc.household_id, auth.uid())
  )
);

create policy "Admins can manage budget rules"
on public.budget_rules
for all
using (
  exists (
    select 1
    from public.budget_configs bc
    where bc.id = budget_config_id
      and public.is_household_admin(bc.household_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.budget_configs bc
    where bc.id = budget_config_id
      and public.is_household_admin(bc.household_id, auth.uid())
  )
);

create policy "Members can view monthly budget runs"
on public.monthly_budget_runs
for select
using (public.is_household_member(household_id, auth.uid()));

create policy "Admins can manage monthly budget runs"
on public.monthly_budget_runs
for all
using (public.is_household_admin(household_id, auth.uid()))
with check (public.is_household_admin(household_id, auth.uid()));

create policy "Members can view monthly income inputs"
on public.monthly_income_inputs
for select
using (
  exists (
    select 1
    from public.monthly_budget_runs mbr
    where mbr.id = monthly_budget_run_id
      and public.is_household_member(mbr.household_id, auth.uid())
  )
);

create policy "Admins can manage monthly income inputs"
on public.monthly_income_inputs
for all
using (
  exists (
    select 1
    from public.monthly_budget_runs mbr
    where mbr.id = monthly_budget_run_id
      and public.is_household_admin(mbr.household_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.monthly_budget_runs mbr
    where mbr.id = monthly_budget_run_id
      and public.is_household_admin(mbr.household_id, auth.uid())
  )
);

