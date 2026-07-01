-- ============================================================
-- Budgets
-- ============================================================

create table public.budgets (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    category_id uuid not null references public.categories(id) on delete cascade,
    amount numeric(14,2) not null check (amount > 0),
    period public.budget_period not null,
    start_date date not null,
    end_date date not null,
    created_by uuid not null references public.profiles(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint budgets_date_check check (start_date <= end_date),
    constraint budgets_unique unique (household_id, category_id, period, start_date)
);

comment on table public.budgets is 'Household budgets grouped by category and period.';

create index idx_budgets_household on public.budgets(household_id);
create index idx_budgets_category on public.budgets(category_id);
create index idx_budgets_period on public.budgets(period);
create index idx_budgets_dates on public.budgets(start_date, end_date);

-- ============================================================
-- Triggers
-- ============================================================

create trigger set_budgets_updated_at
before update on public.budgets
for each row
execute function public.update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.budgets enable row level security;

create policy "Members can view budgets"
on public.budgets
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage budgets"
on public.budgets
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);
