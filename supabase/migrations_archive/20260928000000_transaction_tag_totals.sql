-- ============================================================
-- Custom expense tags: totals, details, atomic assignment
-- ============================================================
-- Builds the user-facing "Tags" feature (group expenses across categories
-- and accounts by project/event -- "Travel to Bali", "Baby", ...) on the
-- tag schema that ALREADY exists from 20260731174334_transaction_automation.sql:
--
--   transaction_tags            household-scoped labels, unique(id, household_id)
--   transaction_tag_assignments many-to-many link, composite FKs to
--                               transactions(id, household_id) and
--                               transaction_tags(id, household_id), both
--                               ON DELETE CASCADE (on the LINK row only)
--
-- so deleting a tag removes only its link rows, and un-tagging a
-- transaction deletes one link row -- a transaction itself is never
-- deleted or modified by anything here. The composite FKs also guarantee a
-- transaction can never be linked to another household's tag. Existing
-- transactions are untouched (they simply have no link rows).
--
-- This migration is purely additive: one unique index and three functions.
-- (The existing idx_transaction_tag_assignments_household on
-- (household_id, tag_id) already serves the per-tag lookups below.)

-- ------------------------------------------------------------
-- 1. Case-insensitive unique tag names per household.
-- ------------------------------------------------------------
-- The original constraint unique(household_id, name) is case-sensitive,
-- so "Baby" and "baby" could coexist. Guarded so a household that somehow
-- already has such duplicates doesn't fail the whole migration -- the app
-- layer (expense-tags.service.ts) also validates case-insensitively.
do $$
begin
  if exists (
    select 1
    from public.transaction_tags
    group by household_id, lower(btrim(name))
    having count(*) > 1
  ) then
    raise notice 'transaction_tags has case-insensitive duplicate names; skipping uq_transaction_tags_household_name_ci. Merge the duplicates and create the index manually.';
  else
    create unique index if not exists uq_transaction_tags_household_name_ci
      on public.transaction_tags (household_id, lower(btrim(name)));
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 2. Atomic "replace this transaction's tags".
-- ------------------------------------------------------------
-- The existing client-side replaceTags (transaction-automation.repository.ts)
-- deletes then inserts in two separate requests, so a failed insert loses
-- the transaction's tags. This does both in one statement-level
-- transaction. security invoker: every read/write still goes through the
-- existing RLS on transactions / transaction_tag_assignments, and the
-- composite FK rejects a tag from another household.
--
-- Tags are only offered on real expenses (not income, not transfer legs),
-- matching what summarize_transaction_tags counts. Clearing (empty array)
-- is always allowed so a transaction edited into income can drop its tags.
create or replace function public.set_transaction_tags(
  p_transaction_id uuid,
  p_tag_ids uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_household_id uuid;
  v_type public.transaction_type;
  v_transfer_group_id uuid;
  v_count integer := 0;
  v_tag_ids uuid[] := array(
    select distinct tag_id
    from unnest(coalesce(p_tag_ids, '{}'::uuid[])) as tag_id
    where tag_id is not null
  );
begin
  select t.household_id, t.type, t.transfer_group_id
    into v_household_id, v_type, v_transfer_group_id
  from public.transactions t
  where t.id = p_transaction_id;

  if v_household_id is null then
    raise exception 'Transaction not found.' using errcode = 'no_data_found';
  end if;

  if not public.is_household_member(v_household_id, auth.uid()) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;

  if cardinality(v_tag_ids) > 0
     and (v_type <> 'expense' or v_transfer_group_id is not null) then
    raise exception 'Tags can only be assigned to expense transactions.'
      using errcode = 'check_violation';
  end if;

  delete from public.transaction_tag_assignments
  where transaction_id = p_transaction_id
    and household_id = v_household_id;

  if cardinality(v_tag_ids) > 0 then
    insert into public.transaction_tag_assignments (household_id, transaction_id, tag_id)
    select v_household_id, p_transaction_id, tag_id
    from unnest(v_tag_ids) as tag_id;
    get diagnostics v_count = row_count;
  end if;

  return v_count;
end;
$$;

revoke all on function public.set_transaction_tags(uuid, uuid[]) from public, anon;
grant execute on function public.set_transaction_tags(uuid, uuid[]) to authenticated;

-- ------------------------------------------------------------
-- 3. Per-tag totals and per-tag transaction list.
-- ------------------------------------------------------------
-- security invoker => subject to RLS; another household's id yields zero
-- rows. Only non-transfer expenses count.
--
-- Date bounds use the same inclusive `transaction_date::date` semantics as
-- summarize_transaction_movements, so a tag's total for a period agrees
-- with the Transactions screen's filtered totals.
--
-- Amounts are NET of reimbursements (net_total / net_amount), the same
-- basis monthly_summary / monthly_category_spending use via
-- transaction_effective_amounts; gross and reimbursed are returned too.
-- A transaction carrying two tags counts fully toward both.

create or replace function public.summarize_transaction_tags(
  p_household_id uuid,
  p_from date default null,
  p_to date default null
)
returns table (
  tag_id uuid,
  name text,
  color text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  transaction_count integer,
  gross_total numeric,
  reimbursed_total numeric,
  net_total numeric,
  last_transaction_date timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with reimbursements as (
    select r.transaction_id, sum(r.amount) as reimbursed_total
    from public.transaction_reimbursements r
    where r.household_id = p_household_id
    group by r.transaction_id
  ),
  tagged as (
    select
      a.tag_id,
      t.id as transaction_id,
      t.amount,
      coalesce(re.reimbursed_total, 0) as reimbursed_total,
      t.transaction_date
    from public.transaction_tag_assignments a
    join public.transactions t
      on t.id = a.transaction_id
     and t.household_id = a.household_id
    left join reimbursements re on re.transaction_id = t.id
    where a.household_id = p_household_id
      and t.type = 'expense'
      and t.transfer_group_id is null
      and (p_from is null or t.transaction_date::date >= p_from)
      and (p_to is null or t.transaction_date::date <= p_to)
  )
  select
    tag.id as tag_id,
    tag.name,
    tag.color,
    tag.created_by,
    tag.created_at,
    tag.updated_at,
    count(x.transaction_id)::integer as transaction_count,
    coalesce(sum(x.amount), 0)::numeric as gross_total,
    coalesce(sum(x.reimbursed_total), 0)::numeric as reimbursed_total,
    (coalesce(sum(x.amount), 0) - coalesce(sum(x.reimbursed_total), 0))::numeric as net_total,
    max(x.transaction_date) as last_transaction_date
  from public.transaction_tags tag
  left join tagged x on x.tag_id = tag.id
  where tag.household_id = p_household_id
  group by tag.id;
$$;

revoke all on function public.summarize_transaction_tags(uuid, date, date) from public, anon;
grant execute on function public.summarize_transaction_tags(uuid, date, date) to authenticated;

create or replace function public.list_transaction_tag_transactions(
  p_household_id uuid,
  p_tag_id uuid,
  p_from date default null,
  p_to date default null
)
returns table (
  transaction_id uuid,
  transaction_date timestamptz,
  title text,
  notes text,
  amount numeric,
  reimbursed_total numeric,
  net_amount numeric,
  is_split boolean,
  category_id uuid,
  category_name text,
  category_icon text,
  account_id uuid,
  account_name text,
  created_by uuid,
  created_by_name text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    t.id as transaction_id,
    t.transaction_date,
    t.title,
    t.notes,
    t.amount,
    coalesce(re.reimbursed_total, 0)::numeric as reimbursed_total,
    (t.amount - coalesce(re.reimbursed_total, 0))::numeric as net_amount,
    t.is_split,
    t.category_id,
    c.name as category_name,
    c.icon as category_icon,
    t.account_id,
    ac.name as account_name,
    t.created_by,
    p.full_name as created_by_name
  from public.transaction_tag_assignments a
  join public.transactions t
    on t.id = a.transaction_id
   and t.household_id = a.household_id
  left join public.categories c on c.id = t.category_id
  left join public.accounts ac on ac.id = t.account_id
  left join public.profiles p on p.id = t.created_by
  left join (
    select r.transaction_id, sum(r.amount) as reimbursed_total
    from public.transaction_reimbursements r
    where r.household_id = p_household_id
    group by r.transaction_id
  ) re on re.transaction_id = t.id
  where a.household_id = p_household_id
    and a.tag_id = p_tag_id
    and t.type = 'expense'
    and t.transfer_group_id is null
    and (p_from is null or t.transaction_date::date >= p_from)
    and (p_to is null or t.transaction_date::date <= p_to)
  order by t.transaction_date desc, t.created_at desc;
$$;

revoke all on function public.list_transaction_tag_transactions(uuid, uuid, date, date) from public, anon;
grant execute on function public.list_transaction_tag_transactions(uuid, uuid, date, date) to authenticated;

