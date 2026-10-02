-- The Accounts screen's "Account History" view showed "--" for every split
-- transaction's balance-after column. That was intentional at the
-- `balance_after_transaction()` level (see 20260819120000): a split
-- transaction moves money through more than one account at once, so there
-- is no single well-defined "balance after" for the transaction as a
-- whole. But from the perspective of ONE specific account being viewed,
-- there absolutely is a well-defined running balance -- it's just not
-- something `list_transaction_movements` (built for a cross-account,
-- household-wide feed) can answer, since it works one transaction at a
-- time rather than walking one account's ledger.
--
-- This adds `list_account_ledger`, a per-account equivalent purpose-built
-- for the Account History view: it reconstructs one account's full ledger
-- by combining that account's own non-split transactions (regular
-- income/expense, and each leg of a transfer -- a transfer is just two
-- ordinary transaction rows, one per account, so no merging is needed the
-- way list_transaction_movements has to) with that account's share of
-- every split transaction (via transaction_allocations, matching
-- `account_balances`'s own split.delta calculation exactly -- only
-- 'account'-type allocations, since a pot-type allocation is deliberately
-- excluded from its backing account's own balance and counted on the pot
-- instead, per `saving_pot_balances`). A window function then walks that
-- combined, chronologically-ordered ledger to compute a real running
-- balance after every single row -- split rows included.

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
  running_balance numeric
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
      t.created_at
    from public.transactions t
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
      t.created_at
    from public.transaction_allocations ta
    join public.transactions t on t.id = ta.transaction_id
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
    running_balance
  from ledger
  order by transaction_date desc, created_at desc, transaction_id desc, movement_id desc
  limit p_limit offset p_offset;
$$;

comment on function public.list_account_ledger(uuid, uuid, integer, integer) is
'Paginated, newest-first ledger for ONE account, with a real running balance after every row -- including split transactions, unlike list_transaction_movements/balance_after_transaction which return null for those. A transfer appears as two independent rows (one per account) rather than a merged movement, since each leg already carries the right sign and balance for its own account.';

revoke all on function public.list_account_ledger(uuid, uuid, integer, integer) from public, anon;
grant execute on function public.list_account_ledger(uuid, uuid, integer, integer) to authenticated;
