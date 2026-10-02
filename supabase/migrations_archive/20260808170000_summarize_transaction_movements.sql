-- Powers a results-summary bar above the Transactions list (count, income
-- total, expense total, net) that reflects the FULL filtered set, not just
-- the pages the client has scrolled through so far. Mirrors the exact same
-- CTEs and WHERE clause as list_transaction_movements (see
-- 20260808160000_transaction_movement_search_and_amount_filters.sql) so the
-- two never disagree about which rows count as "in the filtered set" --
-- only the SELECT/aggregation and the absence of limit/offset/order differ.
create or replace function public.summarize_transaction_movements(
  p_household_id uuid,
  p_kind text default null,
  p_account_id uuid default null,
  p_source_account_id uuid default null,
  p_destination_account_id uuid default null,
  p_category_id uuid default null,
  p_uncategorized boolean default false,
  p_created_by uuid default null,
  p_from date default null,
  p_to date default null,
  p_exclude_transfers boolean default false,
  p_search text default null,
  p_min_amount numeric default null,
  p_max_amount numeric default null
)
returns table (
  movement_count integer,
  income_total numeric,
  expense_total numeric,
  net_total numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with transfer_integrity as (
    select t.transfer_group_id
    from public.transactions t
    where t.household_id = p_household_id
      and t.transfer_group_id is not null
    group by t.transfer_group_id
    having count(*) = 2
      and count(*) filter (where t.type = 'expense') = 1
      and count(*) filter (where t.type = 'income') = 1
  ),
  regular as (
    select
      t.id as movement_id,
      t.type::text as movement_kind,
      t.household_id,
      t.account_id,
      null::uuid as source_account_id,
      null::uuid as destination_account_id,
      t.category_id,
      t.created_by,
      t.title,
      t.notes,
      t.merchant_name,
      t.amount,
      t.transaction_date
    from public.transactions t
    where t.household_id = p_household_id
      and t.transfer_group_id is null
  ),
  transfers as (
    select
      outgoing.transfer_group_id as movement_id,
      'transfer'::text as movement_kind,
      outgoing.household_id,
      null::uuid as account_id,
      outgoing.account_id as source_account_id,
      incoming.account_id as destination_account_id,
      outgoing.category_id,
      outgoing.created_by,
      outgoing.title,
      outgoing.notes,
      outgoing.merchant_name,
      outgoing.amount,
      outgoing.transaction_date
    from transfer_integrity valid
    join public.transactions outgoing
      on outgoing.transfer_group_id = valid.transfer_group_id and outgoing.household_id = p_household_id and outgoing.type = 'expense'
    join public.transactions incoming
      on incoming.transfer_group_id = valid.transfer_group_id and incoming.household_id = p_household_id and incoming.type = 'income'
  ),
  movements as (
    select * from regular
    union all
    select * from transfers
  ),
  filtered as (
    select m.*
    from movements m
    where (p_kind is null or m.movement_kind = p_kind)
      and (not p_exclude_transfers or m.movement_kind <> 'transfer')
      and (p_account_id is null or m.account_id = p_account_id or m.source_account_id = p_account_id or m.destination_account_id = p_account_id)
      and (p_source_account_id is null or m.source_account_id = p_source_account_id)
      and (p_destination_account_id is null or m.destination_account_id = p_destination_account_id)
      and (not p_uncategorized or (m.movement_kind <> 'transfer' and m.category_id is null))
      and (
        p_uncategorized
        or p_category_id is null
        or m.category_id = p_category_id
        or m.category_id in (
          select c.id
          from public.categories c
          where c.parent_id = p_category_id
            and c.household_id = p_household_id
        )
      )
      and (p_created_by is null or m.created_by = p_created_by)
      and (p_from is null or m.transaction_date::date >= p_from)
      and (p_to is null or m.transaction_date::date <= p_to)
      and (
        p_search is null
        or btrim(p_search) = ''
        or m.title ilike '%' || p_search || '%'
        or m.notes ilike '%' || p_search || '%'
        or m.merchant_name ilike '%' || p_search || '%'
      )
      and (p_min_amount is null or m.amount >= p_min_amount)
      and (p_max_amount is null or m.amount <= p_max_amount)
  )
  select
    count(*)::integer as movement_count,
    coalesce(sum(amount) filter (where movement_kind = 'income'), 0) as income_total,
    coalesce(sum(amount) filter (where movement_kind = 'expense'), 0) as expense_total,
    coalesce(sum(amount) filter (where movement_kind = 'income'), 0)
      - coalesce(sum(amount) filter (where movement_kind = 'expense'), 0) as net_total
  from filtered;
$$;

comment on function public.summarize_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, boolean, text, numeric, numeric) is
'Aggregates the full transaction/transfer movement set matching the same filters as list_transaction_movements (minus sort/limit/offset), returning a total row count, income total, expense total, and net (income - expense). Used to power a results-summary bar that reflects the whole filtered set rather than only the pages currently loaded on the client.';

revoke all on function public.summarize_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, boolean, text, numeric, numeric) from public, anon;
grant execute on function public.summarize_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, boolean, text, numeric, numeric) to authenticated;

notify pgrst, 'reload schema';
