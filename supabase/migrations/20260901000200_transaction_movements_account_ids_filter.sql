-- Adds an optional p_account_ids filter to list_transaction_movements and
-- summarize_transaction_movements, needed by the replenishment wizard's
-- transaction-selection step: step 1 lets the user pick MULTIPLE "accounts
-- to replenish", and step 2 must show the union of their transactions in one
-- filtered, paginated, sortable list -- the existing single p_account_id
-- filter can't express "any of these accounts". Purely additive: both
-- functions keep every existing parameter and behavior; p_account_ids
-- defaults to null (no filtering), so every existing caller is unaffected.
--
-- Built directly on top of 20260819120000_transaction_allocations.sql's
-- version of list_transaction_movements (the one that added `is_split` to
-- the returned columns for split-transaction support) rather than the older
-- 20260808160000 shape -- this migration lands after it, so it must carry
-- `is_split` forward unchanged or it would silently regress split
-- transactions out of the movements list the moment this file runs.

create or replace function public.list_transaction_movements(
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
  created_by_profile jsonb
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
      case when p.id is null then null else jsonb_build_object('id', p.id, 'full_name', p.full_name) end as created_by_profile
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
      case when p.id is null then null else jsonb_build_object('id', p.id, 'full_name', p.full_name) end as created_by_profile
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
'Lists paginated transaction and completed-transfer movements, including the account balance after the transaction or transfer source transaction and whether the row is a split transaction (is_split; always false for transfers, which cannot be split). Supports sorting by date, amount, or title. Filtering by a parent category also includes its subcategories. p_exclude_transfers drops transfer rows server-side. p_search matches title/notes/merchant_name case-insensitively. p_min_amount/p_max_amount bound the amount column inclusively. p_account_ids matches a movement touching ANY of the given accounts (account_id, source_account_id, or destination_account_id) -- used by the replenishment wizard to show transactions across multiple "accounts to replenish" at once.';

revoke all on function public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric, uuid[]) from public, anon;
grant execute on function public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric, uuid[]) to authenticated;

-- Superseded 17-arg overload -- drop so PostgREST doesn't see two overloads
-- with ambiguous default-argument calls (same reasoning as the 13-arg drop
-- in 20260808160000_transaction_movement_search_and_amount_filters.sql).
drop function if exists public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric);

-- ============================================================
-- Same extension for summarize_transaction_movements
-- ============================================================

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
  p_max_amount numeric default null,
  p_account_ids uuid[] default null
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
  )
  select
    count(*)::integer as movement_count,
    coalesce(sum(amount) filter (where movement_kind = 'income'), 0) as income_total,
    coalesce(sum(amount) filter (where movement_kind = 'expense'), 0) as expense_total,
    coalesce(sum(amount) filter (where movement_kind = 'income'), 0)
      - coalesce(sum(amount) filter (where movement_kind = 'expense'), 0) as net_total
  from filtered;
$$;

comment on function public.summarize_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, boolean, text, numeric, numeric, uuid[]) is
'Aggregates the full transaction/transfer movement set matching the same filters as list_transaction_movements (minus sort/limit/offset). p_account_ids matches a movement touching ANY of the given accounts -- used by the replenishment wizard''s "total selected / total per account" summary across multiple "accounts to replenish".';

revoke all on function public.summarize_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, boolean, text, numeric, numeric, uuid[]) from public, anon;
grant execute on function public.summarize_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, boolean, text, numeric, numeric, uuid[]) to authenticated;

drop function if exists public.summarize_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, boolean, text, numeric, numeric);

notify pgrst, 'reload schema';
