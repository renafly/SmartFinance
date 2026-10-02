-- ============================================================
-- Category budgets / limits
-- ============================================================
-- Minimal, additive-only schema for per-category monthly spending
-- limits. Deliberately a single plain table with no SQL functions or
-- triggers -- "amount spent so far" is computed client-side from the
-- existing `transactions` table (see
-- src/features/category-budgets/services/category-budget-view-model.ts),
-- and "recurring/planned expenses inside the budget" reuses the existing
-- planned_items/planned_item_occurrences/planned_item_matches system
-- (see 20260901001200_planned_items_core.sql and friends) rather than
-- introducing a second recurring-expense model. This mirrors
-- recurring_expenses' own "plain CRUD, no new SQL functions" precedent
-- (see 20260901000800_recurring_expense_forecasts.sql).
--
-- Effective-month model: a household sets a category's limit as of a
-- given month; that limit applies from `effective_month` onward until a
-- newer row for the same category supersedes it. Rows are never updated
-- in place -- changing a limit inserts a new row instead, so a month
-- that has already been looked at (or confirmed) never silently changes
-- when a later limit edit happens. "The active limit for category X in
-- month Y" = the row with the latest effective_month <= Y for that
-- category (see resolveActiveCategoryBudgets in
-- category-budget-view-model.ts) -- same effective-dated-lookup shape as
-- planned_items.start_month/end_month elsewhere in this schema.

create table public.category_budgets (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    category_id uuid not null references public.categories(id) on delete cascade,
    amount numeric(14,2) not null check (amount > 0),
    -- First-of-month date, e.g. '2026-09-01'. Not constrained to day=1 at
    -- the DB level (the app always writes first-of-month values, same
    -- convention as recurring_expense_matches.occurrence_month) to avoid
    -- an extra check constraint for something already guaranteed by the
    -- single write path.
    effective_month date not null,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    -- At most one limit per category per effective month -- if the user
    -- changes their mind twice in the same month before it starts, that's
    -- an update-in-place on this row (still just an insert conflict the
    -- app should upsert against), not two competing "active" rows for the
    -- same month.
    unique (category_id, effective_month)
);

comment on table public.category_budgets is
  'Monthly spending limit for a category, effective-dated so changing a limit never rewrites an already-reported month. The active limit for a category in month Y is the row with the latest effective_month <= Y (see resolveActiveCategoryBudgets in category-budget-view-model.ts). "Amount spent" is computed separately, client-side, from transactions + planned_item_occurrences -- this table only stores the limit itself.';
comment on column public.category_budgets.effective_month is
  'First-of-month date this limit takes effect from (inclusive), applying to every later month until a newer row for the same category_id supersedes it. Rows are immutable in practice -- the app always inserts a new row to change a limit, never updates one.';

create index idx_category_budgets_household_category_month
  on public.category_budgets(household_id, category_id, effective_month desc);

-- ------------------------------------------------------------
-- RLS -- any household member can view and manage, matching
-- recurring_expenses/income_sources' "any member can write" convention
-- (this is everyday personal-finance data entry, not the
-- admin-gated convention planned_items/budget_rules use).
-- ------------------------------------------------------------

alter table public.category_budgets enable row level security;

create policy "Members can view category budgets"
on public.category_budgets
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage category budgets"
on public.category_budgets
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);
