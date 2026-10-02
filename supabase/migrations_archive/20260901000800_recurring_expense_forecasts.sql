-- ============================================================
-- Recurring expense forecasts (Monthly Budget)
-- ============================================================
-- Lightweight, forecast-only recurring expenses for the Monthly Budget
-- screen. Deliberately NOT built on top of `recurring_transactions`:
-- that table's `execute_due_recurring_movements` scheduler automatically
-- posts real transactions on schedule, which is exactly the behavior this
-- feature must avoid ("do not create real transactions automatically").
-- It is also not built on top of `budget_rules`, which models transfers
-- between two of the household's own accounts (source + destination) as
-- part of income allocation, not a one-account expense paid to a third
-- party. This table borrows the same "is this rule active in month X"
-- shape `budget_rules.active_months` already uses (see
-- 20260711000200_monthly_budget_rule_month_windows.sql) and extends it
-- with an explicit "every N months" interval pattern, computed entirely
-- client-side (mirrors how `budget_rules`/`recurring_transactions` month
-- applicability is already computed in
-- src/features/monthly-budget/services/monthly-budget.service.ts) — no
-- new security-definer functions, no changes to the existing recurring
-- execution engine.

create type public.recurring_expense_recurrence_type as enum ('monthly', 'specific_months', 'interval');

create table public.recurring_expenses (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    name text not null,
    notes text,
    amount numeric(14,2) not null check (amount > 0),
    category_id uuid references public.categories(id) on delete set null,
    account_id uuid not null references public.accounts(id) on delete restrict,
    recurrence_type public.recurring_expense_recurrence_type not null default 'monthly',
    -- Calendar months (1-12) this rule is due in. Only meaningful (and
    -- required non-empty) when recurrence_type = 'specific_months'.
    recurrence_months smallint[] not null default '{}',
    -- "Every N months" counted from start_date's month. Only meaningful
    -- (and required) when recurrence_type = 'interval'.
    recurrence_interval_months integer,
    start_date date not null,
    end_date date,
    is_paused boolean not null default false,
    created_by uuid not null references public.profiles(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- Soft delete, matching budget_rules: editing/removing a recurring
    -- expense must never rewrite history for months already forecast or
    -- matched against real transactions.
    deleted_at timestamptz
);

comment on table public.recurring_expenses is
  'Forecast-only recurring/planned expenses shown in the Monthly Budget overview. Never auto-generates real transactions; see recurring_expense_matches for linking an actual transaction to an occurrence once it happens.';
comment on column public.recurring_expenses.account_id is
  'Account the expense is normally expected to be paid from. Informational for forecasting only -- no money is moved automatically.';
comment on column public.recurring_expenses.recurrence_months is
  'Calendar months (1-12) this rule is due in, e.g. {3,6,9,12}. Only set when recurrence_type = specific_months.';
comment on column public.recurring_expenses.recurrence_interval_months is
  'Recurs every N months starting from start_date''s month, e.g. 2 = every other month. Only set when recurrence_type = interval.';

alter table public.recurring_expenses
  add constraint recurring_expenses_recurrence_shape check (
    (recurrence_type = 'monthly' and recurrence_months = '{}' and recurrence_interval_months is null) or
    (recurrence_type = 'specific_months' and array_length(recurrence_months, 1) > 0 and recurrence_interval_months is null) or
    (recurrence_type = 'interval' and recurrence_interval_months is not null and recurrence_interval_months > 0 and recurrence_months = '{}')
  ),
  add constraint recurring_expenses_recurrence_months_valid check (
    recurrence_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]
  ),
  add constraint recurring_expenses_end_date_after_start check (
    end_date is null or end_date >= start_date
  );

create index idx_recurring_expenses_household on public.recurring_expenses(household_id) where deleted_at is null;
create index idx_recurring_expenses_account on public.recurring_expenses(account_id);
create index idx_recurring_expenses_category on public.recurring_expenses(category_id);

create trigger set_recurring_expenses_updated_at
before update on public.recurring_expenses
for each row
execute function public.update_updated_at();

-- ============================================================
-- Matching: link a real transaction to a planned occurrence
-- ============================================================
-- Manual, best-effort matching so a planned recurring expense isn't shown
-- as still-due once the real transaction has been entered, and so the two
-- are never mistaken for double-counting the same expense. One real
-- transaction can back at most one occurrence, and one occurrence
-- (household expense + calendar month) can only be matched once.

create table public.recurring_expense_matches (
    id uuid primary key default gen_random_uuid(),
    recurring_expense_id uuid not null references public.recurring_expenses(id) on delete cascade,
    -- Always the first day of the matched month, e.g. 2026-03-01.
    occurrence_month date not null,
    transaction_id uuid not null references public.transactions(id) on delete cascade,
    matched_by uuid references public.profiles(id) on delete set null,
    matched_at timestamptz not null default now(),
    unique (recurring_expense_id, occurrence_month),
    unique (transaction_id)
);

comment on table public.recurring_expense_matches is
  'Manual link from a planned recurring-expense occurrence to the real transaction that fulfilled it, so the forecast and the actual expense are not both shown as outstanding.';
comment on column public.recurring_expense_matches.occurrence_month is
  'First day of the calendar month this occurrence belongs to (e.g. 2026-03-01), not the transaction date itself.';

create index idx_recurring_expense_matches_expense on public.recurring_expense_matches(recurring_expense_id);
create index idx_recurring_expense_matches_transaction on public.recurring_expense_matches(transaction_id);

-- ============================================================
-- RLS
-- ============================================================

alter table public.recurring_expenses enable row level security;
alter table public.recurring_expense_matches enable row level security;

create policy "Members can view recurring expenses"
on public.recurring_expenses
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage recurring expenses"
on public.recurring_expenses
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can view recurring expense matches"
on public.recurring_expense_matches
for select
using (
    exists (
        select 1
        from public.recurring_expenses re
        where re.id = recurring_expense_id
          and public.is_household_member(re.household_id, auth.uid())
    )
);

create policy "Members can manage recurring expense matches"
on public.recurring_expense_matches
for all
using (
    exists (
        select 1
        from public.recurring_expenses re
        where re.id = recurring_expense_id
          and public.is_household_member(re.household_id, auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.recurring_expenses re
        where re.id = recurring_expense_id
          and public.is_household_member(re.household_id, auth.uid())
    )
);
