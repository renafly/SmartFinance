-- ============================================================
-- Monthly Budget rebuild (Phase 2) -- transaction lineage columns
-- ============================================================
-- Additive-only: three new nullable columns on the existing `transactions`
-- table linking a generated transaction back to the planned_item_occurrence
-- (and, where relevant, the specific occurrence-destination leg) it was
-- generated from. No existing column, constraint, or policy on
-- transactions is touched.
--
-- The two partial unique indexes below are the idempotency guarantee for
-- transaction generation: they make "insert the transaction(s) for this
-- occurrence" safely re-runnable without ever producing a duplicate.

alter table public.transactions
    add column if not exists planned_item_occurrence_id uuid references public.planned_item_occurrences(id) on delete set null,
    add column if not exists planned_item_occurrence_destination_id uuid references public.planned_item_occurrence_destinations(id) on delete set null,
    add column if not exists planned_item_transaction_role public.planned_item_transaction_role;

comment on column public.transactions.planned_item_occurrence_id is
  'Monthly Budget rebuild (Phase 2) lineage: the planned_item_occurrence this transaction was generated from, if any. on delete set null so deleting a planned occurrence never cascades into deleting real financial history.';
comment on column public.transactions.planned_item_occurrence_destination_id is
  'Monthly Budget rebuild (Phase 2) lineage: the specific occurrence-destination leg this transaction settles, for multi-destination planned items. Null for a single-leg (plain_expense) transaction. on delete set null, same rationale as planned_item_occurrence_id.';
comment on column public.transactions.planned_item_transaction_role is
  'Which leg of a planned item generation this transaction represents. Null for transactions with no Monthly Budget lineage.';

create index if not exists idx_transactions_planned_item_occurrence on public.transactions(planned_item_occurrence_id);
create index if not exists idx_transactions_planned_item_occurrence_destination on public.transactions(planned_item_occurrence_destination_id);

-- At most one transfer_source and one transfer_destination (or one
-- income) transaction per occurrence-destination leg.
create unique index if not exists idx_transactions_one_role_per_occurrence_destination
    on public.transactions(planned_item_occurrence_destination_id, planned_item_transaction_role)
    where planned_item_occurrence_destination_id is not null;

-- At most one plain-expense transaction per occurrence (single-leg
-- planned items generate directly against the occurrence, with no
-- occurrence-destination row involved).
create unique index if not exists idx_transactions_one_plain_expense_per_occurrence
    on public.transactions(planned_item_occurrence_id)
    where planned_item_occurrence_destination_id is null
        and planned_item_transaction_role = 'plain_expense'
        and planned_item_occurrence_id is not null;
