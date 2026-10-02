-- ============================================================
-- Reimbursement allocations: which account/pot the money landed in
-- ============================================================
-- Additive to transaction_reimbursements (20260901000400_transaction_
-- reimbursements.sql). A reimbursement still records a free-text
-- payer_name (who paid you back -- often someone outside the household),
-- but now also records which of the household's OWN accounts/pots that
-- money was deposited into, using the exact same source_type/account_id/
-- pot_id shape (household-scoped composite FKs, "exactly one of the two"
-- check) as transaction_allocations
-- (20260819120000_transaction_allocations.sql), since the client reuses
-- that table's allocation editor/validation logic wholesale for
-- reimbursements -- see
-- src/features/transactions/components/split-allocations-editor.tsx and
-- reimbursement-section.tsx.
--
-- Nullable: a reimbursement is still valid without a source (keeps any
-- pre-existing payer-name-only row valid), but the "Create New
-- Transaction" wizard's reimbursement step always sets one, and the
-- client-side validation (validateReimbursementAllocations, see
-- src/features/transactions/utils/reimbursements.ts) requires it there.

alter table public.transaction_reimbursements
  add column source_type text check (source_type in ('account', 'pot')),
  add column account_id uuid,
  add column pot_id uuid;

comment on column public.transaction_reimbursements.source_type is
  'Which of the household''s own accounts/pots this reimbursement''s money landed in. Null on a legacy payer-name-only row.';
comment on column public.transaction_reimbursements.account_id is
  'Set when source_type = ''account''. The account the reimbursement was deposited into.';
comment on column public.transaction_reimbursements.pot_id is
  'Set when source_type = ''pot''. The saving pot the reimbursement was deposited into.';

alter table public.transaction_reimbursements
  add constraint transaction_reimbursements_account_household_fk
    foreign key (account_id, household_id)
    references public.accounts(id, household_id) on delete restrict,
  add constraint transaction_reimbursements_pot_household_fk
    foreign key (pot_id, household_id)
    references public.saving_pots(id, household_id) on delete restrict,
  add constraint transaction_reimbursements_source_target_check
  check (
    (source_type is null and account_id is null and pot_id is null) or
    (source_type = 'account' and account_id is not null and pot_id is null) or
    (source_type = 'pot' and pot_id is not null and account_id is null)
  );

create index idx_transaction_reimbursements_account
  on public.transaction_reimbursements(account_id) where account_id is not null;
create index idx_transaction_reimbursements_pot
  on public.transaction_reimbursements(pot_id) where pot_id is not null;
