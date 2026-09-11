-- ============================================================
-- Income sources (Monthly Budget)
-- ============================================================
-- Replaces the "one wage per household member per run" model
-- (monthly_income_inputs, still used for persisted/confirmed income) with
-- a reusable, named list of income sources, mirroring how
-- recurring_expenses already models planned expenses: a household defines
-- its income sources once (Salary, Meal Allowance, Rent Income, Bonus...),
-- each with its own amount, destination account, optional category,
-- optional owner, and recurrence -- instead of exactly one figure per
-- member re-entered every month. See
-- docs/ (session notes) for the full rework proposal this implements.
--
-- This table is definitional/planning data, like recurring_expenses. The
-- actual per-month, per-run record of "what income was credited" continues
-- to live in monthly_income_inputs (see the next migration), which gains an
-- income_source_id so more than one source can belong to the same member.
--
-- Requires 20260901000950_income_sources_recurrence_enum.sql to have run
-- first and committed: this migration's check constraint below references
-- the 'one_time' enum value, which Postgres refuses to let a migration use
-- in the same transaction that added it.

create table public.income_sources (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    name text not null,
    notes text,
    amount numeric(14,2) not null check (amount > 0),
    category_id uuid references public.categories(id) on delete set null,
    destination_account_id uuid not null references public.accounts(id) on delete restrict,
    -- Null = shared/household income, not tied to one member -- same
    -- convention budget_rules.owner_member_id already uses.
    owner_member_id uuid references public.profiles(id) on delete set null,
    recurrence_type public.recurring_expense_recurrence_type not null default 'monthly',
    -- Calendar months (1-12) this source is expected in. Only meaningful
    -- (and required non-empty) when recurrence_type = 'specific_months'.
    recurrence_months smallint[] not null default '{}',
    -- "Every N months" counted from start_date's month. Only meaningful
    -- (and required) when recurrence_type = 'interval'.
    recurrence_interval_months integer,
    -- The single month this income happens. Only meaningful (and required)
    -- when recurrence_type = 'one_time' -- e.g. a bonus that only occurs
    -- once, or a payment dated to a specific future month.
    one_time_month date,
    start_date date not null,
    end_date date,
    is_paused boolean not null default false,
    created_by uuid not null references public.profiles(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- Soft delete, matching recurring_expenses/budget_rules: removing an
    -- income source must never rewrite history for months already
    -- forecast or already confirmed into real transactions.
    deleted_at timestamptz
);

comment on table public.income_sources is
  'Named, recurring or one-time income sources feeding the Monthly Budget overview (Salary, Meal Allowance, Rent Income, Bonus, ...). Planning data -- see monthly_income_inputs for what was actually credited when a month is confirmed.';
comment on column public.income_sources.destination_account_id is
  'Account this income is expected to be credited to.';
comment on column public.income_sources.owner_member_id is
  'Household member this income belongs to. Null means shared/household income, same convention as budget_rules.owner_member_id.';
comment on column public.income_sources.one_time_month is
  'First day of the single month this income happens, e.g. 2026-12-01. Only set when recurrence_type = one_time.';

alter table public.income_sources
  add constraint income_sources_recurrence_shape check (
    (recurrence_type = 'monthly' and recurrence_months = '{}' and recurrence_interval_months is null and one_time_month is null) or
    (recurrence_type = 'specific_months' and array_length(recurrence_months, 1) > 0 and recurrence_interval_months is null and one_time_month is null) or
    (recurrence_type = 'interval' and recurrence_interval_months is not null and recurrence_interval_months > 0 and recurrence_months = '{}' and one_time_month is null) or
    (recurrence_type = 'one_time' and one_time_month is not null and recurrence_months = '{}' and recurrence_interval_months is null)
  ),
  add constraint income_sources_recurrence_months_valid check (
    recurrence_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]
  ),
  add constraint income_sources_end_date_after_start check (
    end_date is null or end_date >= start_date
  );

create index idx_income_sources_household on public.income_sources(household_id) where deleted_at is null;
create index idx_income_sources_account on public.income_sources(destination_account_id);
create index idx_income_sources_category on public.income_sources(category_id);
create index idx_income_sources_owner on public.income_sources(owner_member_id);

create trigger set_income_sources_updated_at
before update on public.income_sources
for each row
execute function public.update_updated_at();

alter table public.income_sources enable row level security;

create policy "Members can view income sources"
on public.income_sources
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage income sources"
on public.income_sources
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);
