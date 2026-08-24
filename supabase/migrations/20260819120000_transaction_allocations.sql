-- ============================================================
-- Split transactions: transaction_allocations
-- ============================================================
-- Lets a single transaction be funded by multiple accounts and/or saving
-- pots while remaining exactly one row in `transactions`. See
-- docs/split-transactions-plan.md for the full design rationale.
--
-- Additive: `transactions.account_id`/`amount` keep meaning exactly what
-- they mean today for the (large majority) non-split case. When
-- `is_split = true`, `transaction_allocations` rows become authoritative
-- for the funding breakdown and for balance math; `account_id` stays NOT
-- NULL as a "representative account" (the largest allocation, set by
-- save_transaction_allocations below) purely so existing account
-- filters/joins that are not split-aware keep resolving to something
-- sensible.
--
-- Note on consistency windows: `transactions.amount` and
-- `transaction_allocations` are validated for agreement whenever
-- transaction_allocations itself is written (via the deferred trigger
-- below), which is exactly what save_transaction_allocations relies on.
-- Editing a split transaction's total *and* rebalancing its allocations
-- happens as two separate client round-trips (update transaction, then
-- save_transaction_allocations), same as the rest of this codebase's
-- multi-step flows (e.g. create-transaction-then-upload-attachment). A
-- momentary mismatch between those two calls is expected and resolved by
-- the second call; see the client-side ordering contract documented on
-- transactionAllocationsService.replace.

-- ------------------------------------------------------------
-- 1. Composite unique index needed for the saving_pots FK below
--    (accounts/categories/transactions already have one from migration
--    20260731174334).
-- ------------------------------------------------------------
create unique index if not exists saving_pots_id_household_unique
  on public.saving_pots(id, household_id);

-- ------------------------------------------------------------
-- 2. is_split flag
-- ------------------------------------------------------------
alter table public.transactions
  add column if not exists is_split boolean not null default false;

comment on column public.transactions.is_split is
  'True when this transaction''s funding source is broken down across multiple transaction_allocations rows. When true, account_id/pot_id on this row are only a representative/display value -- transaction_allocations is authoritative for balance math.';

-- ------------------------------------------------------------
-- 3. transaction_allocations
-- ------------------------------------------------------------
create table public.transaction_allocations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  transaction_id uuid not null,
  source_type text not null check (source_type in ('account', 'pot')),
  account_id uuid,
  pot_id uuid,
  amount numeric(14,2) not null check (amount > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (transaction_id, household_id)
    references public.transactions(id, household_id) on delete cascade,
  foreign key (account_id, household_id)
    references public.accounts(id, household_id) on delete restrict,
  foreign key (pot_id, household_id)
    references public.saving_pots(id, household_id) on delete restrict,
  check (
    (source_type = 'account' and account_id is not null and pot_id is null) or
    (source_type = 'pot' and pot_id is not null and account_id is null)
  )
);

comment on table public.transaction_allocations is
  'Funding-source breakdown for a split transaction. amount is the source of truth; percentage is always derived client-side (never stored). Requires transactions.is_split = true and >= 2 rows summing exactly to transactions.amount -- enforced by enforce_transaction_allocations_integrity below. The only intended write path is save_transaction_allocations().';

-- "no duplicate sources" per transaction
create unique index idx_transaction_allocations_unique_account
  on public.transaction_allocations(transaction_id, account_id) where account_id is not null;
create unique index idx_transaction_allocations_unique_pot
  on public.transaction_allocations(transaction_id, pot_id) where pot_id is not null;

create index idx_transaction_allocations_transaction
  on public.transaction_allocations(transaction_id, sort_order);
create index idx_transaction_allocations_account
  on public.transaction_allocations(account_id);
create index idx_transaction_allocations_pot
  on public.transaction_allocations(pot_id);

create trigger set_transaction_allocations_updated_at
  before update on public.transaction_allocations
  for each row execute function public.update_updated_at();

alter table public.transaction_allocations enable row level security;

create policy "Members can manage transaction allocations"
on public.transaction_allocations for all to authenticated
using (public.is_household_member(household_id, (select auth.uid())))
with check (
  public.is_household_member(household_id, (select auth.uid()))
  and exists (
    select 1 from public.transactions t
    where t.id = transaction_allocations.transaction_id
      and t.household_id = transaction_allocations.household_id
  )
);

grant select, insert, update, delete on table public.transaction_allocations to authenticated;

-- ------------------------------------------------------------
-- 4. Consistency trigger: is_split always agrees with row count/sum
-- ------------------------------------------------------------
-- Deferred (checked at commit) so save_transaction_allocations can
-- delete-then-insert a transaction's rows inside one statement/transaction
-- without tripping the "at least 2 rows" check on the empty intermediate
-- state. Mirrors enforce_saving_pot_account_integrity (20260711000100).
create or replace function public.check_transaction_allocations_consistency(p_transaction_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_sum numeric;
  v_amount numeric;
begin
  if not exists (select 1 from public.transactions t where t.id = p_transaction_id) then
    return;
  end if;

  select count(*), coalesce(sum(ta.amount), 0)
  into v_count, v_sum
  from public.transaction_allocations ta
  where ta.transaction_id = p_transaction_id;

  select t.amount into v_amount
  from public.transactions t
  where t.id = p_transaction_id;

  if v_count = 0 then
    update public.transactions set is_split = false
    where id = p_transaction_id and is_split is distinct from false;
    return;
  end if;

  if v_count < 2 then
    raise exception using
      errcode = '23514',
      message = 'A split transaction requires at least two allocations.';
  end if;

  if round(v_sum, 2) <> round(v_amount, 2) then
    raise exception using
      errcode = '23514',
      message = format('Transaction allocations (%s) must sum to the transaction amount (%s).', v_sum, v_amount);
  end if;

  update public.transactions set is_split = true
  where id = p_transaction_id and is_split is distinct from true;
end;
$$;

create or replace function public.enforce_transaction_allocations_integrity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_transaction_id uuid;
begin
  for v_transaction_id in
    select distinct candidate.transaction_id
    from unnest(array[
      case when tg_op in ('UPDATE', 'DELETE') then old.transaction_id else null end,
      case when tg_op in ('UPDATE', 'INSERT') then new.transaction_id else null end
    ]) as candidate(transaction_id)
    where candidate.transaction_id is not null
  loop
    perform public.check_transaction_allocations_consistency(v_transaction_id);
  end loop;

  return null;
end;
$$;

create constraint trigger enforce_transaction_allocations_integrity
after insert or update or delete on public.transaction_allocations
deferrable initially deferred
for each row
execute function public.enforce_transaction_allocations_integrity();

-- ------------------------------------------------------------
-- 5. Write RPC: save_transaction_allocations
-- ------------------------------------------------------------
-- Replace semantics (delete-then-insert), mirrors
-- save_monthly_budget_configuration's validate-then-replace shape. Passing
-- an empty array converts a split transaction back to a single source
-- (clears is_split).
create or replace function public.save_transaction_allocations(
  p_transaction_id uuid,
  p_allocations jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_household_id uuid;
  v_amount numeric;
  v_transfer_group_id uuid;
  v_allocation jsonb;
  v_source_type text;
  v_account_id uuid;
  v_pot_id uuid;
  v_amount_value numeric;
  v_sum numeric := 0;
  v_seen_keys text[] := '{}';
  v_seen_account_ids uuid[] := '{}';
  v_seen_pot_ids uuid[] := '{}';
  v_key text;
  v_sort_order integer := 0;
  v_representative_account_id uuid;
  v_representative_amount numeric;
begin
  select household_id, amount, transfer_group_id
  into v_household_id, v_amount, v_transfer_group_id
  from public.transactions
  where id = p_transaction_id
  for update;

  if v_household_id is null then
    raise exception using errcode = '22023', message = 'Transaction not found.';
  end if;

  if not public.is_household_member(v_household_id, (select auth.uid())) then
    raise exception using errcode = '42501', message = 'Household membership is required.';
  end if;

  if v_transfer_group_id is not null then
    raise exception using errcode = '22023', message = 'Transfers cannot be split.';
  end if;

  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' then
    raise exception using errcode = '22023', message = 'Allocations must be an array.';
  end if;

  -- Empty array = convert a split transaction back to a single source. The
  -- transaction's own account_id/pot_id (set separately via the normal
  -- transaction update path) become authoritative again.
  if jsonb_array_length(p_allocations) = 0 then
    delete from public.transaction_allocations where transaction_id = p_transaction_id;
    update public.transactions set is_split = false where id = p_transaction_id;
    return;
  end if;

  if jsonb_array_length(p_allocations) < 2 then
    raise exception using errcode = '22023', message = 'A split transaction requires at least two allocations.';
  end if;

  for v_allocation in select value from jsonb_array_elements(p_allocations)
  loop
    v_source_type := v_allocation->>'source_type';
    v_account_id := nullif(v_allocation->>'account_id', '')::uuid;
    v_pot_id := nullif(v_allocation->>'pot_id', '')::uuid;
    v_amount_value := round(coalesce((v_allocation->>'amount')::numeric, 0), 2);

    if v_source_type not in ('account', 'pot') then
      raise exception using errcode = '22023', message = 'Each allocation needs source_type "account" or "pot".';
    end if;

    if v_source_type = 'account' then
      if v_account_id is null or v_pot_id is not null then
        raise exception using errcode = '22023', message = 'An account allocation needs account_id and no pot_id.';
      end if;
      if not exists (select 1 from public.accounts a where a.id = v_account_id and a.household_id = v_household_id) then
        raise exception using errcode = '22023', message = 'Allocation account must belong to this household.';
      end if;
      v_key := 'account:' || v_account_id::text;
      v_seen_account_ids := array_append(v_seen_account_ids, v_account_id);
    else
      if v_pot_id is null or v_account_id is not null then
        raise exception using errcode = '22023', message = 'A pot allocation needs pot_id and no account_id.';
      end if;
      if not exists (select 1 from public.saving_pots sp where sp.id = v_pot_id and sp.household_id = v_household_id) then
        raise exception using errcode = '22023', message = 'Allocation pot must belong to this household.';
      end if;
      v_key := 'pot:' || v_pot_id::text;
      v_seen_pot_ids := array_append(v_seen_pot_ids, v_pot_id);
    end if;

    if v_amount_value <= 0 then
      raise exception using errcode = '22023', message = 'Every allocation amount must be greater than zero.';
    end if;

    if v_key = any(v_seen_keys) then
      raise exception using errcode = '23505', message = 'Each account or pot can only be used once per transaction.';
    end if;
    v_seen_keys := array_append(v_seen_keys, v_key);

    v_sum := v_sum + v_amount_value;
  end loop;

  -- Guard against double counting: an allocation cannot use both a pot and
  -- (on another row of the same transaction) an account that backs that
  -- same pot -- otherwise money leaving that account would be counted
  -- twice by account_balances/saving_pot_balances (once via the account
  -- row, once via the pot row). See docs/split-transactions-plan.md §2.6.
  if array_length(v_seen_account_ids, 1) > 0 and array_length(v_seen_pot_ids, 1) > 0
    and exists (
      select 1
      from public.saving_pot_accounts spa
      where spa.pot_id = any(v_seen_pot_ids)
        and spa.account_id = any(v_seen_account_ids)
    )
  then
    raise exception using
      errcode = '23514',
      message = 'An allocation cannot use both a pot and one of its own backing accounts on the same transaction.';
  end if;

  if round(v_sum, 2) <> round(v_amount, 2) then
    raise exception using
      errcode = '22023',
      message = format('Allocations (%s) must sum to the transaction amount (%s).', v_sum, v_amount);
  end if;

  delete from public.transaction_allocations where transaction_id = p_transaction_id;

  v_sort_order := 0;
  v_representative_account_id := null;
  v_representative_amount := -1;

  for v_allocation in select value from jsonb_array_elements(p_allocations)
  loop
    v_account_id := nullif(v_allocation->>'account_id', '')::uuid;
    v_amount_value := round(coalesce((v_allocation->>'amount')::numeric, 0), 2);

    insert into public.transaction_allocations (
      household_id, transaction_id, source_type, account_id, pot_id, amount, sort_order
    )
    values (
      v_household_id,
      p_transaction_id,
      v_allocation->>'source_type',
      v_account_id,
      nullif(v_allocation->>'pot_id', '')::uuid,
      v_amount_value,
      v_sort_order
    );

    -- The largest account allocation becomes the transaction's
    -- representative account_id, used by account filters/joins that are
    -- not split-aware. Ties keep the first row in the given order.
    if v_account_id is not null and v_amount_value > v_representative_amount then
      v_representative_account_id := v_account_id;
      v_representative_amount := v_amount_value;
    end if;

    v_sort_order := v_sort_order + 1;
  end loop;

  update public.transactions
  set is_split = true,
      pot_id = null,
      account_id = coalesce(v_representative_account_id, account_id)
  where id = p_transaction_id;
end;
$$;

revoke all on function public.save_transaction_allocations(uuid, jsonb) from public, anon;
grant execute on function public.save_transaction_allocations(uuid, jsonb) to authenticated;

comment on function public.save_transaction_allocations(uuid, jsonb) is
'Replaces a transaction''s funding-source breakdown. p_allocations is a JSON array of {source_type: "account"|"pot", account_id|pot_id, amount}. Validates household membership, no duplicate/self-conflicting sources, and that amounts sum to the transaction''s amount to the cent. An empty array reverts the transaction to a single (non-split) source.';

-- ------------------------------------------------------------
-- 6. Read model: list_transaction_movements gains is_split
-- ------------------------------------------------------------
-- Same 17-arg signature as migration 20260808160000 -- only the returned
-- column list changes, which Postgres does not allow via CREATE OR REPLACE,
-- hence the explicit drop (same technique as 20260803172713).
drop function if exists public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric);

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
  p_max_amount numeric default null
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

comment on function public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric) is
'Lists paginated transaction and completed-transfer movements, including the account balance after the transaction or transfer source transaction and whether the row is a split transaction (is_split; always false for transfers, which cannot be split). Supports sorting by date, amount, or title (p_sort: newest, oldest, amount_asc, amount_desc, title_asc, title_desc). Filtering by a parent category (p_category_id) also includes its subcategories; filtering by a subcategory matches only that subcategory. p_exclude_transfers drops transfer rows server-side. p_search matches title/notes/merchant_name case-insensitively. p_min_amount/p_max_amount bound the amount column inclusively.';

revoke all on function public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric) from public, anon;
grant execute on function public.list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric) to authenticated;

-- ------------------------------------------------------------
-- 7. balance_after_transaction: null for split rows, and no longer
--    double-counts a split transaction's representative account_id in
--    other rows' running-balance walk.
-- ------------------------------------------------------------
create or replace function public.balance_after_transaction(public.transactions)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
    select
        case when $1.is_split then null else (
            account.initial_balance
            + coalesce(sum(
                case
                    when movement.type = 'income' then movement.amount
                    when movement.type = 'expense' then -movement.amount
                end
            ), 0)
        ) end
    from public.accounts as account
    left join public.transactions as movement
        on movement.account_id = account.id
        and movement.is_split = false
        and (
            movement.transaction_date,
            movement.created_at,
            movement.id
        ) <= (
            $1.transaction_date,
            $1.created_at,
            $1.id
        )
    where account.id = $1.account_id
    group by account.initial_balance;
$$;

comment on function public.balance_after_transaction(public.transactions) is
'Account balance immediately after this transaction, ordered by transaction date, creation date, and id. Returns null for split transactions (is_split = true), which move money in more than one account/pot at once and so have no single well-defined running balance; the running-balance ledger walk itself also excludes split transactions so their representative account_id is never double-counted.';

-- ------------------------------------------------------------
-- 8. account_balances: add the split-allocation delta
-- ------------------------------------------------------------
create or replace view public.account_balances as
with direct as (
    select
        t.account_id,
        sum(case when t.type = 'income' then t.amount else -t.amount end) as delta
    from public.transactions t
    where t.is_split = false
    group by t.account_id
),
split as (
    select
        ta.account_id,
        sum(case when t.type = 'income' then ta.amount else -ta.amount end) as delta
    from public.transaction_allocations ta
    join public.transactions t on t.id = ta.transaction_id
    where ta.account_id is not null
    group by ta.account_id
)
select
    a.id,
    a.household_id,
    a.name,
    a.type,
    a.currency,
    a.initial_balance,
    a.initial_balance + coalesce(direct.delta, 0) + coalesce(split.delta, 0) as current_balance
from public.accounts a
left join direct on direct.account_id = a.id
left join split on split.account_id = a.id;

-- ------------------------------------------------------------
-- 9. saving_pot_balances: add the direct pot-allocation delta on top of
--    the existing account-derived total (unchanged for pots that are
--    never targeted directly by a split allocation).
-- ------------------------------------------------------------
create or replace view public.saving_pot_balances as
with selected_account_counts as (
    select
        pot_id,
        count(*)::int as selected_account_count
    from public.saving_pot_accounts
    group by pot_id
),
account_totals as (
    select
        spa.pot_id,
        coalesce(sum(case when ab.current_balance > 0 then ab.current_balance else 0 end), 0) as saved,
        coalesce(sum(case when ab.current_balance < 0 then abs(ab.current_balance) else 0 end), 0) as spent,
        coalesce(sum(ab.current_balance), 0) as balance
    from public.saving_pot_accounts spa
    join public.account_balances ab on ab.id = spa.account_id
    group by spa.pot_id
),
allocation_totals as (
    select
        ta.pot_id,
        coalesce(sum(case when t.type = 'income' then ta.amount else 0 end), 0) as saved,
        coalesce(sum(case when t.type = 'expense' then ta.amount else 0 end), 0) as spent,
        coalesce(sum(case when t.type = 'income' then ta.amount else -ta.amount end), 0) as balance
    from public.transaction_allocations ta
    join public.transactions t on t.id = ta.transaction_id
    where ta.pot_id is not null
    group by ta.pot_id
)
select
    sp.id,
    sp.household_id,
    sp.name,
    sp.target_amount,
    sp.color,
    sp.icon,
    coalesce(acct.saved, 0) + coalesce(alloc.saved, 0) as saved,
    coalesce(acct.spent, 0) + coalesce(alloc.spent, 0) as spent,
    coalesce(acct.balance, 0) + coalesce(alloc.balance, 0) as balance,
    coalesce(sac.selected_account_count, 0) as selected_account_count
from public.saving_pots sp
left join selected_account_counts sac on sac.pot_id = sp.id
left join account_totals acct on acct.pot_id = sp.id
left join allocation_totals alloc on alloc.pot_id = sp.id;

alter view public.saving_pot_balances set (security_invoker = true);
grant select on table public.saving_pot_balances to authenticated;

notify pgrst, 'reload schema';
