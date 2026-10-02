-- ============================================================
-- Surface original-source info in list_account_ledger
-- ============================================================
-- Companion to 20260901002800_transaction_movements_original_source.sql:
-- that migration added original_source_type/original_account_id/
-- original_pot_id (plus joined names) to list_transaction_movements, the
-- RPC behind the main Transactions list. The Accounts screen's "Account
-- History" tab reads a different RPC -- list_account_ledger (see
-- 20260901000600_account_ledger_running_balance.sql) -- so it needs the
-- same columns added here too, or a transaction/allocation a replenishment
-- reassigned would show its current source there but nothing about where
-- it originally came from.
--
-- Same per-leg shape as the rest of this function: a direct (non-split)
-- leg reads transactions.original_*, a split leg reads that specific
-- transaction_allocations row's own original_* (only the slice a
-- replenishment actually reassigned carries one -- every sibling
-- allocation on the same transaction stays null, exactly like
-- list_transaction_movements' allocations array).
--
-- Postgres refuses `create or replace function` when the change adds a
-- column to a `returns table (...)` row shape, so the signature has to be
-- dropped first (same pattern as every other list_* extension so far).

drop function if exists public.list_account_ledger(uuid, uuid, integer, integer);

create or replace function public.list_account_ledger(
  p_household_id uuid,
  p_account_id uuid,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  movement_id uuid,
  transaction_id uuid,
  movement_kind text,
  title text,
  is_split boolean,
  is_transfer boolean,
  amount numeric,
  transaction_date timestamptz,
  created_at timestamptz,
  running_balance numeric,
  original_source_type text,
  original_account_id uuid,
  original_account_name text,
  original_pot_id uuid,
  original_pot_name text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with account as (
    select a.id, a.initial_balance
    from public.accounts a
    where a.id = p_account_id
      and a.household_id = p_household_id
  ),
  direct_legs as (
    select
      t.id as movement_id,
      t.id as transaction_id,
      t.type::text as movement_kind,
      t.title,
      false as is_split,
      (t.transfer_group_id is not null) as is_transfer,
      t.amount,
      t.transaction_date,
      t.created_at,
      t.original_source_type,
      t.original_account_id,
      oa.name as original_account_name,
      t.original_pot_id,
      op.name as original_pot_name
    from public.transactions t
    left join public.accounts oa on oa.id = t.original_account_id
    left join public.saving_pots op on op.id = t.original_pot_id
    where t.household_id = p_household_id
      and t.account_id = p_account_id
      and t.is_split = false
  ),
  split_legs as (
    select
      ta.id as movement_id,
      t.id as transaction_id,
      t.type::text as movement_kind,
      t.title,
      true as is_split,
      false as is_transfer,
      ta.amount,
      t.transaction_date,
      t.created_at,
      ta.original_source_type,
      ta.original_account_id,
      oaa.name as original_account_name,
      ta.original_pot_id,
      oap.name as original_pot_name
    from public.transaction_allocations ta
    join public.transactions t on t.id = ta.transaction_id
    left join public.accounts oaa on oaa.id = ta.original_account_id
    left join public.saving_pots oap on oap.id = ta.original_pot_id
    where t.household_id = p_household_id
      and ta.account_id = p_account_id
  ),
  legs as (
    select * from direct_legs
    union all
    select * from split_legs
  ),
  ledger as (
    select
      legs.*,
      account.initial_balance
        + sum(
            case when legs.movement_kind = 'income' then legs.amount else -legs.amount end
          ) over (
            order by legs.transaction_date, legs.created_at, legs.transaction_id, legs.movement_id
            rows between unbounded preceding and current row
          ) as running_balance
    from legs
    cross join account
  )
  select
    movement_id,
    transaction_id,
    movement_kind,
    title,
    is_split,
    is_transfer,
    amount,
    transaction_date,
    created_at,
    running_balance,
    original_source_type,
    original_account_id,
    original_account_name,
    original_pot_id,
    original_pot_name
  from ledger
  order by transaction_date desc, created_at desc, transaction_id desc, movement_id desc
  limit p_limit offset p_offset;
$$;

comment on function public.list_account_ledger(uuid, uuid, integer, integer) is
'Paginated, newest-first ledger for ONE account, with a real running balance after every row -- including split transactions, unlike list_transaction_movements/balance_after_transaction which return null for those. A transfer appears as two independent rows (one per account) rather than a merged movement, since each leg already carries the right sign and balance for its own account. original_source_type/original_account_id/original_account_name/original_pot_id/original_pot_name are set on a row a replenishment has reassigned (see confirm_replenishment_run) -- the account/pot this row''s money originally came from, before that; all null on a row that has never been replenished.';

revoke all on function public.list_account_ledger(uuid, uuid, integer, integer) from public, anon;
grant execute on function public.list_account_ledger(uuid, uuid, integer, integer) to authenticated;

notify pgrst, 'reload schema';
