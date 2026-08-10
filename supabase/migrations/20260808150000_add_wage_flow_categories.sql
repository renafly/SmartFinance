-- ============================================================
-- Wage Flow categories
-- ============================================================
-- Stores the household's user-configurable "Wage Flow" categories shown on
-- the Insights screen: what accounts/categories/pots/transfer rules count
-- toward each category, its display order (also the first-match-wins
-- matching precedence), color, and icon. Replaces the previous fixed
-- 4-bucket heuristic and the short-lived device-local storage version of
-- this feature -- this table is the shared, household-wide source of truth.

create table public.wage_flow_categories (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    name text not null,
    color text not null default '#3B82F6',
    icon text not null default 'ellipse-outline',
    include_all_transactions boolean not null default false,
    account_ids uuid[] not null default '{}',
    category_ids uuid[] not null default '{}',
    pot_account_ids uuid[] not null default '{}',
    include_transfers_between_accounts boolean not null default false,
    include_transfers_into_pots boolean not null default false,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.wage_flow_categories is
    'User-configurable Wage Flow categories for the Insights screen. sort_order also drives first-match-wins matching precedence.';
comment on column public.wage_flow_categories.account_ids is
    'Matches non-transfer expenses spent from, and incoming transfers landing on, these accounts.';
comment on column public.wage_flow_categories.category_ids is
    'Matches non-transfer expenses in these categories (subcategories of a selected parent are included automatically at query time).';
comment on column public.wage_flow_categories.pot_account_ids is
    'Matches incoming transfers landing on these specific pot/savings accounts.';

create index idx_wage_flow_categories_household on public.wage_flow_categories(household_id, sort_order);

create trigger set_wage_flow_categories_updated_at
before update on public.wage_flow_categories
for each row
execute function public.update_updated_at();

alter table public.wage_flow_categories enable row level security;

create policy "Members can view wage flow categories"
on public.wage_flow_categories
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage wage flow categories"
on public.wage_flow_categories
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);
