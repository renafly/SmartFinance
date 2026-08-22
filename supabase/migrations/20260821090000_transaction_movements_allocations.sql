-- Adds a per-row `allocations` breakdown to list_transaction_movements so
-- the transaction list can show split ("Split source" / multi-account)
-- transactions without an N+1 fetch per expanded row: today the list only
-- carries is_split (a boolean) and a single representative `account`
-- (20260819120000_transaction_allocations.sql's largest-allocation
-- heuristic), so the UI has no way to render "which accounts/pots, how
-- much each, whose" without a separate round-trip per split row.
--
-- `allocations` is a jsonb array (null for non-split transactions and for
-- every transfer row, since transfers can't be split) of:
--   { id, source_type, account_id, account_name, account_owner_profile_id,
--     pot_id, pot_name, amount }
-- ordered by transaction_allocations.sort_order. account_owner_profile_id
-- lets the client resolve "whose money" for an account allocation without
-- a lookup; pot allocations resolve the same thing client-side via the
-- pot's backing account(s) (a pot can have more than one, so that
-- resolution -- single backing account => that account's owner, otherwise
-- "Shared" -- stays in the client, same as the rest of the household-member
-- display logic already there).
--
-- Built directly on top of 20260901000200_transaction_movements_account_ids_
-- filter.sql's shape (the p_account_ids version) -- lands after it, so it
-- must carry every existing parameter and column forward unchanged and only
-- add the new one, or it would silently regress the replenishment wizard's
-- multi-account filtering the moment this file runs.
--
-- Adding an output column to an existing function's RETURNS TABLE can't be
-- done via plain `create or replace function` when the argument list is
-- unchanged (Postgres rejects a return-type change on an in-place
-- replace) -- same reasoning already used by 20260803172713 and
-- 20260901000200 for this exact function. Drop the old-return-shape
-- overload first, then create the new one.

drop function if exists public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric, uuid[]);

create function public.list_transaction_movements(
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
  p_sort text default 'newest',
  p_limit integer default 25,
  p_offset integer default 0,
  p_exclude_transfers boolean default false,
  p_search text default null,
  p_min_amount numeric default null,
  p_max_amount numeric default null,
  p_account_ids uuid[] default null
)
returns table (
  movement_id uuid,
  movement_kind text,
  household_id uuid,
  transaction_id uuid,
  transfer_group_id uuid,
  source_transaction_id uuid,
  destination_transaction_id uuid,
  account_id uuid,
  source_account_id uuid,
  destination_account_id uuid,
  category_id uuid,
  created_by uuid,
  title text,
  notes text,
  merchant_name text,
  amount numeric,
  balance_after_transaction numeric,
  is_split boolean,
  transaction_date timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  monthly_budget_run_id uuid,
  generated_by_rule_id uuid,
  recurring_execution_id uuid,
  budget_section public.monthly_budget_section,
  account jsonb,
  source_account jsonb,
  destination_account jsonb,
  category jsonb,
  created_by_profile jsonb,
  allocations jsonb
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
      t.id as transaction_id,
      t.transfer_group_id,
      null::uuid as source_transaction_id,
      null::uuid as destination_transaction_id,
      t.account_id,
      null::uuid as source_account_id,
      null::uuid as destination_account_id,
      t.category_id,
      t.created_by,
      t.title,
      t.notes,
      t.merchant_name,
      t.amount,
      public.balance_after_transaction(t) as balance_after_transaction,
      t.is_split,
      t.transaction_date,
      t.created_at,
      t.updated_at,
      t.monthly_budget_run_id,
      t.generated_by_rule_id,
      t.recurring_execution_id,
      t.budget_section,
      jsonb_build_object('id', a.id, 'name', a.name, 'owner_profile_id', a.owner_profile_id) as account,
      null::jsonb as source_account,
      null::jsonb as destination_account,
      case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name, 'icon', c.icon) end as category,
      case when p.id is null then null else jsonb_build_object('id', p.id, 'full_name', p.full_name) end as created_by_profile,
      case
        when not t.is_split then null
        else (
          select jsonb_agg(
            jsonb_build_object(
              'id', ta.id,
              'source_type', ta.source_type,
              'account_id', ta.account_id,
              'account_name', aa.name,
              'account_owner_profile_id', aa.owner_profile_id,
              'pot_id', ta.pot_id,
              'pot_name', sp.name,
              'amount', ta.amount
            )
            order by ta.sort_order
          )
          from public.transaction_allocations ta
          left join public.accounts aa on aa.id = ta.account_id
          left join public.saving_pots sp on sp.id = ta.pot_id
          where ta.transaction_id = t.id
        )
      end as allocations
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    left join public.categories c on c.id = t.category_id
    left join public.profiles p on p.id = t.created_by
    where t.household_id = p_household_id
      and t.transfer_group_id is null
  ),
  transfers as (
    select
      outgoing.transfer_group_id as movement_id,
      'transfer'::text as movement_kind,
      outgoing.household_id,
      null::uuid as transaction_id,
      outgoing.transfer_group_id,
      outgoing.id as source_transaction_id,
      incoming.id as destination_transaction_id,
      null::uuid as account_id,
      outgoing.account_id as source_account_id,
      incoming.account_id as destination_account_id,
      outgoing.category_id,
      outgoing.created_by,
      outgoing.title,
      outgoing.notes,
      outgoing.merchant_name,
      outgoing.amount,
      public.balance_after_transaction(outgoing) as balance_after_transaction,
      false as is_split,
      outgoing.transaction_date,
      greatest(outgoing.created_at, incoming.created_at) as created_at,
      greatest(outgoing.updated_at, incoming.updated_at) as updated_at,
      outgoing.monthly_budget_run_id,
      outgoing.generated_by_rule_id,
      outgoing.recurring_execution_id,
      outgoing.budget_section,
      null::jsonb as account,
      jsonb_build_object('id', source.id, 'name', source.name, 'owner_profile_id', source.owner_profile_id) as source_account,
      jsonb_build_object('id', destination.id, 'name', destination.name, 'owner_profile_id', destination.owner_profile_id) as destination_account,
      case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name, 'icon', c.icon) end as category,
      case when p.id is null then null else jsonb_build_object('id', p.id, 'full_name', p.full_name) end as created_by_profile,
      null::jsonb as allocations
    from transfer_integrity valid
    join public.transactions outgoing
      on outgoing.transfer_group_id = valid.transfer_group_id and outgoing.household_id = p_household_id and outgoing.type = 'expense'
    join public.transactions incoming
      on incoming.transfer_group_id = valid.transfer_group_id and incoming.household_id = p_household_id and incoming.type = 'income'
    join public.accounts source on source.id = outgoing.account_id
    join public.accounts destination on destination.id = incoming.account_id
    left join public.categories c on c.id = outgoing.category_id
    left join public.profiles p on p.id = outgoing.created_by
  ),
  movements as (
    select * from regular
    union all
    select * from transfers
  )
  select m.*
  from movements m
  where (p_kind is null or m.movement_kind = p_kind)
    and (not p_exclude_transfers or m.movement_kind <> 'transfer')
    and (p_account_id is null or m.account_id = p_account_id or m.source_account_id = p_account_id or m.destination_account_id = p_account_id)
    and (
      p_account_ids is null
      or m.account_id = any(p_account_ids)
      or m.source_account_id = any(p_account_ids)
      or m.destination_account_id = any(p_account_ids)
    )
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
  order by
    case when p_sort = 'amount_asc' then m.amount end asc,
    case when p_sort = 'amount_desc' then m.amount end desc,
    case when p_sort = 'title_asc' then lower(m.title) end asc,
    case when p_sort = 'title_desc' then lower(m.title) end desc,
    case when p_sort = 'oldest' then m.transaction_date end asc,
    case when p_sort in ('amount_asc', 'amount_desc') then m.transaction_date end desc,
    case when p_sort not in ('oldest', 'amount_asc', 'amount_desc', 'title_asc', 'title_desc') then m.transaction_date end desc,
    m.created_at desc,
    m.movement_id desc
  limit greatest(1, least(coalesce(p_limit, 25), 500))
  offset greatest(0, coalesce(p_offset, 0));
$$;

comment on function public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric, uuid[]) is
'Lists paginated transaction and completed-transfer movements, including the account balance after the transaction or transfer source transaction, whether the row is a split transaction (is_split; always false for transfers), and -- for split transactions -- the full funding-source breakdown (allocations: array of {id, source_type, account_id, account_name, account_owner_profile_id, pot_id, pot_name, amount}, ordered by sort_order; null for non-split rows and all transfers) so the transaction list can render multi-account detail without a per-row fetch. Supports sorting by date, amount, or title. Filtering by a parent category also includes its subcategories. p_exclude_transfers drops transfer rows server-side. p_search matches title/notes/merchant_name case-insensitively. p_min_amount/p_max_amount bound the amount column inclusively. p_account_ids matches a movement touching ANY of the given accounts (account_id, source_account_id, or destination_account_id) -- used by the replenishment wizard to show transactions across multiple "accounts to replenish" at once.';

revoke all on function public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric, uuid[]) from public, anon;
grant execute on function public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric, uuid[]) to authenticated;

notify pgrst, 'reload schema';
