-- A split transaction (transaction_allocations) can owe money back to more
-- than one account at once -- e.g. an expense funded 150/18 by two
-- accounts, where a single replenishment run is used to repay both. Step 1
-- of the wizard already lets the user pick MULTIPLE "accounts to
-- replenish" in one run (20260901000200_transaction_movements_account_ids_filter.sql),
-- and step 2's SelectTransactionsStep now records one
-- replenishment_run_transactions row per matching account allocation
-- (rather than crediting the split's *representative* account with its
-- *entire* total -- see the client-side fix alongside this migration), so
-- the same transaction_id can legitimately appear more than once in a
-- single run, each row against a different account_id/amount.
--
-- The original `unique (run_id, transaction_id)` (from
-- 20260901000000_replenishment_schema.sql) predates split-transaction
-- awareness in this feature and would reject that second row outright.
-- Loosen it to `unique (run_id, transaction_id, account_id)` -- still
-- exactly one row per (run, transaction, account) triple, which is what
-- actually needs to stay unique: two rows for the same transaction_id are
-- fine as long as they're for two different accounts, but a duplicate of
-- the very same (run, transaction, account) is still rejected, same as
-- before for the (overwhelmingly common) non-split case where each
-- transaction only ever has one account either way.

alter table public.replenishment_run_transactions
  drop constraint replenishment_run_transactions_run_id_transaction_id_key;

alter table public.replenishment_run_transactions
  add constraint replenishment_run_transactions_run_tx_account_key
  unique (run_id, transaction_id, account_id);
