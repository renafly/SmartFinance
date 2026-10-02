-- ============================================================
-- Monthly Budget rebuild (Phase 2) -- monthly_budget_periods
-- ============================================================
-- Month-level lock/gate for a household's Monthly Budget. Three states
-- (open/committed/closed) -- 'closed' is never set directly by
-- application code, it is purely derived: once a committed period has no
-- planned_item_occurrences left with status = 'planned', the auto-close
-- trigger below flips it to 'closed'.

create table public.monthly_budget_periods (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    month date not null,
    status public.monthly_budget_period_status not null default 'open',
    confirmed_at timestamptz,
    confirmed_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (household_id, month)
);

comment on table public.monthly_budget_periods is
  'Month-level lock/gate for a household''s Monthly Budget. status = closed is purely derived (see maybe_close_monthly_budget_period()) -- application code only ever sets open or committed.';

create index idx_monthly_budget_periods_household_month on public.monthly_budget_periods(household_id, month);

create trigger set_monthly_budget_periods_updated_at
before update on public.monthly_budget_periods
for each row
execute function public.update_updated_at();

alter table public.monthly_budget_periods enable row level security;

create policy "Members can view monthly budget periods"
on public.monthly_budget_periods
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Admins can manage monthly budget periods"
on public.monthly_budget_periods
for all
using (
    public.is_household_admin(household_id, auth.uid())
)
with check (
    public.is_household_admin(household_id, auth.uid())
);

-- ------------------------------------------------------------
-- Auto-close trigger -- AFTER UPDATE on planned_item_occurrences, only
-- when status changes away from 'planned'. If the corresponding
-- monthly_budget_periods row is 'committed' and no occurrence for that
-- household+month still has status = 'planned', flip it to 'closed'.
-- Nothing ever sets 'closed' directly from application code.
-- ------------------------------------------------------------

create or replace function public.maybe_close_monthly_budget_period()
returns trigger
language plpgsql
as $$
begin
    update public.monthly_budget_periods p
        set status = 'closed'
        where p.household_id = new.household_id
            and p.month = new.month
            and p.status = 'committed'
            and not exists (
                select 1
                from public.planned_item_occurrences o
                where o.household_id = new.household_id
                    and o.month = new.month
                    and o.status = 'planned'
            );

    return new;
end;
$$;

comment on function public.maybe_close_monthly_budget_period() is
  'AFTER UPDATE trigger on planned_item_occurrences (only when status changes away from planned): closes the household+month''s monthly_budget_periods row once it is committed and no occurrence in that month is still planned. Purely derived -- application code never sets status = closed directly.';

create trigger maybe_close_monthly_budget_period_on_occurrence_status
after update on public.planned_item_occurrences
for each row
when (old.status = 'planned' and new.status <> 'planned')
execute function public.maybe_close_monthly_budget_period();
