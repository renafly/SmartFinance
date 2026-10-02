-- One pagination-safe activity stream for transactions and completed transfers.
-- Valid transfer pairs are collapsed before filters, ordering, and pagination.
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
  p_offset integer default 0
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
  amount numeric,
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
      t.amount,
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
      outgoing.amount,
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
    and (p_account_id is null or m.account_id = p_account_id or m.source_account_id = p_account_id or m.destination_account_id = p_account_id)
    and (p_source_account_id is null or m.source_account_id = p_source_account_id)
    and (p_destination_account_id is null or m.destination_account_id = p_destination_account_id)
    and (not p_uncategorized or m.category_id is null)
    and (p_uncategorized or p_category_id is null or m.category_id = p_category_id)
    and (p_created_by is null or m.created_by = p_created_by)
    and (p_from is null or m.transaction_date::date >= p_from)
    and (p_to is null or m.transaction_date::date <= p_to)
  order by
    case when p_sort = 'amount_asc' then m.amount end asc,
    case when p_sort = 'amount_desc' then m.amount end desc,
    case when p_sort = 'oldest' then m.transaction_date end asc,
    case when p_sort in ('amount_asc', 'amount_desc') then m.transaction_date end desc,
    case when p_sort not in ('oldest', 'amount_asc', 'amount_desc') then m.transaction_date end desc,
    m.created_at desc,
    m.movement_id desc
  limit greatest(1, least(coalesce(p_limit, 25), 500))
  offset greatest(0, coalesce(p_offset, 0));
$$;

create or replace function public.update_completed_transfer(
  p_transfer_group_id uuid,
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount numeric,
  p_title text,
  p_notes text default null,
  p_transaction_date timestamptz default now(),
  p_category_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_household_id uuid;
  v_row_count integer;
begin
  if p_amount <= 0 then raise exception 'Transfer amount must be greater than zero'; end if;
  if p_source_account_id = p_destination_account_id then raise exception 'Source and destination accounts must be different'; end if;
  if nullif(btrim(p_title), '') is null then raise exception 'Transfer title is required'; end if;

  perform 1 from public.transactions t
  where t.transfer_group_id = p_transfer_group_id
  order by t.id
  for update;

  select min(t.household_id::text)::uuid, count(*) into v_household_id, v_row_count
  from public.transactions t
  where t.transfer_group_id = p_transfer_group_id;

  if v_row_count <> 2
    or (select count(*) from public.transactions t where t.transfer_group_id = p_transfer_group_id and t.type = 'expense') <> 1
    or (select count(*) from public.transactions t where t.transfer_group_id = p_transfer_group_id and t.type = 'income') <> 1
  then raise exception 'Transfer group is malformed or unavailable'; end if;

  if not public.is_household_member(v_household_id, (select auth.uid())) then raise exception 'Not authorized for this household'; end if;
  if (select count(*) from public.accounts a where a.id in (p_source_account_id, p_destination_account_id) and a.household_id = v_household_id) <> 2
  then raise exception 'Transfer accounts must belong to the transfer household'; end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories c where c.id = p_category_id and c.household_id = v_household_id and c.type = 'account'
  ) then raise exception 'Transfer category must be an account category in this household'; end if;

  update public.transactions t
  set account_id = case when t.type = 'expense' then p_source_account_id else p_destination_account_id end,
      category_id = p_category_id,
      amount = p_amount,
      title = btrim(p_title),
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      transaction_date = p_transaction_date
  where t.transfer_group_id = p_transfer_group_id;

  if not found then raise exception 'Transfer group is unavailable'; end if;
  return p_transfer_group_id;
end;
$$;

create or replace function public.delete_completed_transfer(p_transfer_group_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_household_id uuid;
  v_row_count integer;
begin
  perform 1 from public.transactions t
  where t.transfer_group_id = p_transfer_group_id
  order by t.id
  for update;

  select min(t.household_id::text)::uuid, count(*) into v_household_id, v_row_count
  from public.transactions t
  where t.transfer_group_id = p_transfer_group_id;

  if v_row_count <> 2
    or (select count(*) from public.transactions t where t.transfer_group_id = p_transfer_group_id and t.type = 'expense') <> 1
    or (select count(*) from public.transactions t where t.transfer_group_id = p_transfer_group_id and t.type = 'income') <> 1
  then raise exception 'Transfer group is malformed or unavailable'; end if;
  if not public.is_household_member(v_household_id, (select auth.uid())) then raise exception 'Not authorized for this household'; end if;

  delete from public.transactions t where t.transfer_group_id = p_transfer_group_id;
  get diagnostics v_row_count = row_count;
  return v_row_count;
end;
$$;

revoke all on function public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer) from public, anon;
revoke all on function public.update_completed_transfer(uuid, uuid, uuid, numeric, text, text, timestamptz, uuid) from public, anon;
revoke all on function public.delete_completed_transfer(uuid) from public, anon;
grant execute on function public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer) to authenticated;
grant execute on function public.update_completed_transfer(uuid, uuid, uuid, numeric, text, text, timestamptz, uuid) to authenticated;
grant execute on function public.delete_completed_transfer(uuid) to authenticated;

notify pgrst, 'reload schema';
