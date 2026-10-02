-- ============================================================
-- Saving Pots
-- ============================================================

create table public.saving_pots (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    name text not null,
    target_amount numeric(14,2),
    color text,
    icon text,
    created_by uuid not null references public.profiles(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.saving_pots is 'Household saving pots for goal-based savings and spending tracking.';

create index idx_saving_pots_household on public.saving_pots(household_id);

-- ============================================================
-- Triggers
-- ============================================================

create trigger set_saving_pots_updated_at
before update on public.saving_pots
for each row
execute function public.update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.saving_pots enable row level security;

create policy "Members can view saving pots"
on public.saving_pots
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage saving pots"
on public.saving_pots
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);

-- ============================================================
-- Link transactions to saving pots
-- ============================================================

alter table public.transactions
    add column pot_id uuid references public.saving_pots(id) on delete set null;

comment on column public.transactions.pot_id is
    'Optional link to a saving pot this transaction contributed to or was spent from.';

create index idx_transactions_pot on public.transactions(pot_id);
