-- ============================================================
-- Replenishment v2: reassign origin instead of creating transfers
-- ============================================================
-- Sistema de Reposição previously replenished a transaction by creating a
-- brand-new paired transfer (expense + income leg) and leaving the
-- original expense transaction completely untouched (see
-- 20260901000000_replenishment_schema.sql's own rationale comment). This
-- migration switches the model: replenishing now directly reassigns the
-- covered transaction's (or, for a split transaction, the specific
-- transaction_allocations row's) real funding source to the account/pot
-- that actually paid for it, and snapshots what it used to be for
-- traceability. See confirm_replenishment_run's rewrite (next migration)
-- for the write path; this migration only adds the columns it needs.
--
-- Direct columns on transactions/transaction_allocations (rather than only
-- reading history back through replenishment_run_transactions) because
-- list_transaction_movements -- the shared read model behind the
-- Transactions list, the Accounts history tab, and this wizard's own
-- transaction picker -- needs "was this ever reassigned, and what was it
-- before" as a plain column it can select, not a per-row subquery.

-- ------------------------------------------------------------
-- 1. Original-source snapshot on transactions
-- ------------------------------------------------------------
alter table public.transactions
  add column original_source_type text check (original_source_type in ('account', 'pot')),
  add column original_account_id uuid,
  add column original_pot_id uuid;

alter table public.transactions
  add constraint transactions_original_account_household_fk
    foreign key (original_account_id, household_id)
    references public.accounts(id, household_id) on delete restrict,
  add constraint transactions_original_pot_household_fk
    foreign key (original_pot_id, household_id)
    references public.saving_pots(id, household_id) on delete restrict,
  add constraint transactions_original_source_shape_check
  check (
    (original_source_type is null and original_account_id is null and original_pot_id is null) or
    (original_source_type = 'account' and original_account_id is not null and original_pot_id is null) or
    (original_source_type = 'pot' and original_pot_id is not null and original_account_id is null)
  );

comment on column public.transactions.original_source_type is
  'Set once, the first time a replenishment reassigns this transaction''s account_id/pot_id -- never overwritten again (a transaction can only be replenished once, enforced by confirm_replenishment_run''s double-repayment guard). Null on a transaction that has never been replenished, including every transaction replenished under the pre-2026-09 transfer-creating model (those were never mutated, so they have nothing to snapshot).';
comment on column public.transactions.original_account_id is
  'The account_id this transaction was recorded against before a replenishment reassigned it. Set together with original_source_type = ''account'' (the only case the wizard currently produces -- a transaction is always originally attributed to an account, never directly to a pot).';
comment on column public.transactions.original_pot_id is
  'Reserved for a future original_source_type = ''pot'' case. Always null today.';

create index idx_transactions_original_account on public.transactions(original_account_id) where original_account_id is not null;

comment on column public.transactions.replenishment_run_id is
  'Historically (runs confirmed before this migration): set on the two transfer-leg transactions a confirmed run generated, never on the original expense transaction. Going forward: set directly on the covered transaction itself when a replenishment reassigns its origin -- a transaction only ever carries this when it was itself replenished.';

-- ------------------------------------------------------------
-- 2. Same trace on transaction_allocations, so replenishing one funding
--    slice of an already-split transaction (e.g. an expense split
--    ActivoBank/Roupa where only the Roupa slice needs repaying) touches
--    just that allocation row, not the whole transaction.
-- ------------------------------------------------------------
alter table public.transaction_allocations
  add column original_source_type text check (original_source_type in ('account', 'pot')),
  add column original_account_id uuid,
  add column original_pot_id uuid,
  add column replenishment_run_id uuid references public.replenishment_runs(id) on delete set null;

alter table public.transaction_allocations
  add constraint transaction_allocations_original_account_household_fk
    foreign key (original_account_id, household_id)
    references public.accounts(id, household_id) on delete restrict,
  add constraint transaction_allocations_original_pot_household_fk
    foreign key (original_pot_id, household_id)
    references public.saving_pots(id, household_id) on delete restrict,
  add constraint transaction_allocations_original_source_shape_check
  check (
    (original_source_type is null and original_account_id is null and original_pot_id is null) or
    (original_source_type = 'account' and original_account_id is not null and original_pot_id is null) or
    (original_source_type = 'pot' and original_pot_id is not null and original_account_id is null)
  );

comment on column public.transaction_allocations.original_source_type is
  'Same idea as transactions.original_source_type, scoped to this one allocation row: which account/pot this specific funding slice came from before a replenishment reassigned it.';
comment on column public.transaction_allocations.replenishment_run_id is
  'The run that reassigned this allocation row''s source, if any -- audit trail only, set together with original_source_type/original_account_id.';

create index idx_transaction_allocations_replenishment_run on public.transaction_allocations(replenishment_run_id) where replenishment_run_id is not null;

-- ------------------------------------------------------------
-- 3. Run-history record of what each covered unit was reassigned to
-- ------------------------------------------------------------
-- A run's own audit trail (alongside preview_snapshot) of what confirming
-- it actually did -- kept separate from reading it back off the live
-- transactions/transaction_allocations rows so the run's history stays
-- accurate even if the user later edits the transaction again.
alter table public.replenishment_run_transactions
  add column new_sources jsonb;

comment on column public.replenishment_run_transactions.new_sources is
  'Populated by confirm_replenishment_run: the funding source(s) this covered unit was reassigned to, as a JSON array of {source_type, account_id, pot_id, amount}. Null while the run is still draft (or, for a run confirmed before this migration, permanently -- those runs created transfer transactions instead and have nothing to record here).';

notify pgrst, 'reload schema';
