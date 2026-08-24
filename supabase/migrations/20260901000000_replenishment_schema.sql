-- ============================================================
-- Sistema de Reposição (Replenishment System)
-- ============================================================
-- Lets a household mark a set of existing expense transactions as needing
-- to be "repaid" from other accounts/pots, and records the real money
-- source without ever mutating the original expense transaction (its
-- account_id/category_id/amount/type stay exactly as recorded, which is
-- what keeps category history, Wage Flow, and reports correct with no
-- special-casing anywhere else in the app).
--
-- Modeled directly on the monthly-budget-run precedent:
--   - replenishment_runs        ~ monthly_budget_runs (draft/confirmed header)
--   - replenishment_run_sources ~ budget_rule_allocations (resolved, persisted
--                                  per-source amounts, never a formula)
--   - transactions.replenishment_run_id ~ transactions.monthly_budget_run_id
--     (tags the generated transfer legs so account_balances, monthly_summary,
--     Wage Flow, and every existing report keep working with zero changes)
--
-- replenishment_run_transactions is the one genuinely new join: which
-- original expense transactions a run covers, snapshotted at draft time so
-- a run's own history stays truthful even if the original transaction is
-- later edited or deleted.

create type public.replenishment_run_status as enum ('draft', 'confirmed', 'cancelled');
create type public.replenishment_source_kind as enum ('account', 'pot');

-- ============================================================
-- Header / run
-- ============================================================

create table public.replenishment_runs (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    status public.replenishment_run_status not null default 'draft',
    title text,
    total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
    preview_snapshot jsonb,
    created_by uuid not null references public.profiles(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    confirmed_at timestamptz
);

comment on table public.replenishment_runs is
    'A replenishment (reposição) operation: a set of expense transactions that need repaying, plus the accounts/pots that funded the repayment.';
comment on column public.replenishment_runs.preview_snapshot is
    'The exact preview (selected transactions, sources, computed transfers) the user confirmed. Used both as an audit trail and to guard confirm_replenishment_run against a stale/tampered payload.';

create index idx_replenishment_runs_household on public.replenishment_runs(household_id);
create index idx_replenishment_runs_status on public.replenishment_runs(status);

create trigger set_replenishment_runs_updated_at
before update on public.replenishment_runs
for each row
execute function public.update_updated_at();

-- ============================================================
-- Which original transactions this run repays (snapshotted)
-- ============================================================

create table public.replenishment_run_transactions (
    id uuid primary key default gen_random_uuid(),
    run_id uuid not null references public.replenishment_runs(id) on delete cascade,
    transaction_id uuid not null references public.transactions(id) on delete restrict,
    account_id uuid not null references public.accounts(id) on delete restrict,
    amount numeric(14,2) not null check (amount > 0),
    category_id uuid references public.categories(id) on delete set null,
    transaction_date timestamptz not null,
    created_at timestamptz not null default now(),
    unique (run_id, transaction_id)
);

comment on table public.replenishment_run_transactions is
    'Snapshot of the original expense transactions a replenishment run covers. Snapshotted (not just referenced) so the run''s own history stays truthful even if the original transaction is later edited or deleted.';

create index idx_replenishment_run_transactions_run on public.replenishment_run_transactions(run_id);
create index idx_replenishment_run_transactions_transaction on public.replenishment_run_transactions(transaction_id);
create index idx_replenishment_run_transactions_account on public.replenishment_run_transactions(account_id);

-- ============================================================
-- Chosen sources and their final allocated amounts
-- ============================================================

create table public.replenishment_run_sources (
    id uuid primary key default gen_random_uuid(),
    run_id uuid not null references public.replenishment_runs(id) on delete cascade,
    source_kind public.replenishment_source_kind not null,
    pot_id uuid references public.saving_pots(id) on delete restrict,
    resolved_account_id uuid not null references public.accounts(id) on delete restrict,
    amount numeric(14,2) not null default 0 check (amount >= 0),
    suggested_amount numeric(14,2) not null default 0 check (suggested_amount >= 0),
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (run_id, resolved_account_id),
    check (source_kind = 'pot' or pot_id is null),
    check (source_kind <> 'pot' or pot_id is not null)
);

comment on table public.replenishment_run_sources is
    'Accounts/pots chosen as the money source for a replenishment run, with both the system-suggested and the final (possibly manually edited) amount. A pot source always resolves to a concrete backing account -- resolved_account_id -- since a real transfer always moves money between two real accounts.';

create index idx_replenishment_run_sources_run on public.replenishment_run_sources(run_id);
create index idx_replenishment_run_sources_account on public.replenishment_run_sources(resolved_account_id);
create index idx_replenishment_run_sources_pot on public.replenishment_run_sources(pot_id);

create trigger set_replenishment_run_sources_updated_at
before update on public.replenishment_run_sources
for each row
execute function public.update_updated_at();

-- ============================================================
-- Tag the transfer legs a confirmed run generates
-- ============================================================

alter table public.transactions
    add column replenishment_run_id uuid references public.replenishment_runs(id) on delete set null;

comment on column public.transactions.replenishment_run_id is
    'Set on the two transaction rows (expense + income leg) of a transfer generated by confirm_replenishment_run. Never set on the original expense transaction being replenished -- that row is never mutated by this feature.';

create index idx_transactions_replenishment_run on public.transactions(replenishment_run_id);

-- ============================================================
-- RLS
-- ============================================================
-- Member-level read/write, matching transactions/saving_pots (replenishing
-- is a day-to-day action like recording a transfer, not household budget
-- configuration -- unlike budget_rule_allocations' admin-only policy).

alter table public.replenishment_runs enable row level security;

create policy "Members can view replenishment runs"
on public.replenishment_runs
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage replenishment runs"
on public.replenishment_runs
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);

alter table public.replenishment_run_transactions enable row level security;

create policy "Members can view replenishment run transactions"
on public.replenishment_run_transactions
for select
using (
    exists (
        select 1 from public.replenishment_runs r
        where r.id = run_id
          and public.is_household_member(r.household_id, auth.uid())
    )
);

create policy "Members can manage replenishment run transactions"
on public.replenishment_run_transactions
for all
using (
    exists (
        select 1 from public.replenishment_runs r
        where r.id = run_id
          and public.is_household_member(r.household_id, auth.uid())
    )
)
with check (
    exists (
        select 1 from public.replenishment_runs r
        where r.id = run_id
          and public.is_household_member(r.household_id, auth.uid())
    )
);

alter table public.replenishment_run_sources enable row level security;

create policy "Members can view replenishment run sources"
on public.replenishment_run_sources
for select
using (
    exists (
        select 1 from public.replenishment_runs r
        where r.id = run_id
          and public.is_household_member(r.household_id, auth.uid())
    )
);

create policy "Members can manage replenishment run sources"
on public.replenishment_run_sources
for all
using (
    exists (
        select 1 from public.replenishment_runs r
        where r.id = run_id
          and public.is_household_member(r.household_id, auth.uid())
    )
)
with check (
    exists (
        select 1 from public.replenishment_runs r
        where r.id = run_id
          and public.is_household_member(r.household_id, auth.uid())
    )
);

notify pgrst, 'reload schema';
