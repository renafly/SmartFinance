create table public.transaction_import_batches (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    account_id uuid not null,
    created_by uuid not null references public.profiles(id) on delete restrict,
    source_file_name text not null check (length(trim(source_file_name)) between 1 and 255),
    source_file_hash text,
    status text not null default 'preview' check (status in ('preview', 'completed', 'rolled_back', 'failed')),
    total_rows integer not null default 0 check (total_rows >= 0),
    imported_rows integer not null default 0 check (imported_rows >= 0),
    skipped_rows integer not null default 0 check (skipped_rows >= 0),
    mapping jsonb not null default '{}'::jsonb check (jsonb_typeof(mapping) = 'object'),
    created_at timestamptz not null default now(),
    completed_at timestamptz,
    rolled_back_at timestamptz,
    constraint transaction_import_batches_id_household_unique unique (id, household_id),
    constraint transaction_import_batches_account_household_fkey
      foreign key (account_id, household_id)
      references public.accounts(id, household_id) on delete restrict,
    constraint import_batch_status_dates check (
      (status <> 'completed' or completed_at is not null)
      and (status <> 'rolled_back' or rolled_back_at is not null)
    )
);

comment on table public.transaction_import_batches is
    'Household-scoped provenance and lifecycle metadata for transaction CSV imports. Rolled-back batches are retained as an audit record.';

alter table public.transactions
    add column import_batch_id uuid,
    add column import_source_row integer check (import_source_row is null or import_source_row >= 2),
    add column import_fingerprint text;

alter table public.transactions
    add constraint transaction_import_provenance_complete check (
      (import_batch_id is null and import_source_row is null and import_fingerprint is null)
      or (import_batch_id is not null and import_source_row is not null and import_fingerprint is not null)
    ),
    add constraint transaction_import_batch_source_row_unique unique (import_batch_id, import_source_row),
    add constraint transactions_import_batch_household_fkey
      foreign key (import_batch_id, household_id)
      references public.transaction_import_batches(id, household_id)
      on delete restrict;

create table public.account_reconciliations (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    account_id uuid not null,
    statement_date date not null,
    statement_balance numeric(14,2) not null,
    ledger_balance numeric(14,2) not null,
    difference numeric(14,2) generated always as (statement_balance - ledger_balance) stored,
    notes text,
    created_by uuid not null references public.profiles(id) on delete restrict,
    created_at timestamptz not null default now(),
    constraint account_reconciliation_unique_statement unique (account_id, statement_date),
    constraint account_reconciliations_account_household_fkey
      foreign key (account_id, household_id)
      references public.accounts(id, household_id) on delete cascade
);

comment on table public.account_reconciliations is
    'Immutable statement checkpoints. Difference records statement minus ledger balance without altering transaction history.';

create index idx_import_batches_household_created on public.transaction_import_batches(household_id, created_at desc);
create index idx_import_batches_account on public.transaction_import_batches(account_id, created_at desc);
create index idx_transactions_import_batch on public.transactions(import_batch_id) where import_batch_id is not null;
create index idx_transactions_import_fingerprint on public.transactions(household_id, account_id, import_fingerprint) where import_fingerprint is not null;
create index idx_reconciliations_household_account_date on public.account_reconciliations(household_id, account_id, statement_date desc);

alter table public.transaction_import_batches enable row level security;
alter table public.account_reconciliations enable row level security;

create policy "Members can view transaction import batches"
on public.transaction_import_batches for select to authenticated
using (public.is_household_member(household_id, (select auth.uid())));

create policy "Members can create transaction import batches"
on public.transaction_import_batches for insert to authenticated
with check (
  public.is_household_member(household_id, (select auth.uid()))
  and created_by = (select auth.uid())
  and exists (select 1 from public.accounts a where a.id = account_id and a.household_id = household_id)
);

create policy "Members can update transaction import batches"
on public.transaction_import_batches for update to authenticated
using (public.is_household_member(household_id, (select auth.uid())))
with check (
  public.is_household_member(household_id, (select auth.uid()))
  and exists (select 1 from public.accounts a where a.id = account_id and a.household_id = household_id)
);

create policy "Members can view account reconciliations"
on public.account_reconciliations for select to authenticated
using (public.is_household_member(household_id, (select auth.uid())));

create policy "Members can create account reconciliations"
on public.account_reconciliations for insert to authenticated
with check (
  public.is_household_member(household_id, (select auth.uid()))
  and created_by = (select auth.uid())
  and exists (select 1 from public.accounts a where a.id = account_id and a.household_id = household_id)
);

create policy "Members can delete account reconciliations"
on public.account_reconciliations for delete to authenticated
using (public.is_household_member(household_id, (select auth.uid())));

revoke all on table public.transaction_import_batches from anon;
revoke all on table public.account_reconciliations from anon;
grant select, insert, update on table public.transaction_import_batches to authenticated;
grant select, insert, delete on table public.account_reconciliations to authenticated;
