-- Categories as the single source of truth for Wage Flow and Monthly Budget.
--
-- 1. Accounts and saving pots get an optional category_id: "money going
--    into this account/pot is <category>". Pre-filled for existing rows and
--    on create:
--      * investment account -> Investments, PPR account -> Retirement,
--        savings account -> Emergency Fund (defaults from
--        default_category_catalog(), matched by EN/PT name);
--      * every saving pot -> its own subcategory under "Savings &
--        Investments", named after the pot (an existing expense category
--        with that name is reused instead of creating a duplicate).
--    Editable on the Accounts / Savings screens.
-- 2. destination_category_for_account(account): the category of the saving
--    pot the account backs (when it backs exactly one pot that has one),
--    else the account's own category, else null.
-- 3. confirm_planned_item_month now gives both legs of every Monthly Budget
--    movement that destination category (the planned item's category is
--    only the fallback). Income legs keep their income category.
-- 4. Backfill: existing Monthly Budget transfers (planned-item movements
--    and legacy monthly_budget_run transfers) get the same derived category.
--    Hand-made transfers are not touched.
-- 5. Wage Flow no longer has its own category system: its buckets are the
--    main expense categories (client side), so wage_flow_categories is
--    dropped and merge_category_into stops maintaining it.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
alter table public.accounts
    add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.saving_pots
    add column if not exists category_id uuid references public.categories(id) on delete set null;

comment on column public.accounts.category_id is 'Expense category for money moved INTO this account (e.g. Investments for an investment account). Used by Monthly Budget movements -- see destination_category_for_account.';
comment on column public.saving_pots.category_id is 'Expense category for money moved INTO this pot (by default the pot''s own subcategory under Savings & Investments). Takes precedence over the backing account''s category -- see destination_category_for_account.';

create index if not exists idx_accounts_category_id on public.accounts (category_id) where category_id is not null;
create index if not exists idx_saving_pots_category_id on public.saving_pots (category_id) where category_id is not null;

-- Same household, expense type only.
create or replace function public.validate_destination_category()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
    if new.category_id is not null and not exists (
        select 1 from public.categories c
         where c.id = new.category_id
           and c.household_id = new.household_id
           and c.type = 'expense'
    ) then
        raise exception 'The category must be an expense category of the same household.' using errcode = '23514';
    end if;
    return new;
end;
$$;

drop trigger if exists validate_account_category on public.accounts;
create trigger validate_account_category
    before insert or update of category_id, household_id on public.accounts
    for each row execute function public.validate_destination_category();

drop trigger if exists validate_saving_pot_category on public.saving_pots;
create trigger validate_saving_pot_category
    before insert or update of category_id, household_id on public.saving_pots
    for each row execute function public.validate_destination_category();

-- ---------------------------------------------------------------------------
-- Defaults
-- ---------------------------------------------------------------------------
-- An existing, active expense category of the household for a catalog key
-- (matched by its English or Portuguese name).
create or replace function public.default_category_id(p_household_id uuid, p_key text)
returns uuid
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
    select c.id
      from public.categories c
      join public.default_category_catalog() d on d.key = p_key
     where c.household_id = p_household_id
       and c.type = d.type
       and lower(btrim(c.name)) in (lower(d.name_en), lower(d.name_pt))
     order by c.is_archived asc, c.created_at asc
     limit 1;
$$;

create or replace function public.default_account_category_id(p_household_id uuid, p_type public.account_type)
returns uuid
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
    select case p_type
        when 'investment' then public.default_category_id(p_household_id, 'investments')
        when 'ppr' then public.default_category_id(p_household_id, 'retirement')
        when 'savings' then public.default_category_id(p_household_id, 'emergencyFund')
        else null
    end;
$$;

-- The pot's own category: an existing expense category named like the pot,
-- else a new subcategory of "Savings & Investments" (or a main category if
-- that main one doesn't exist).
create or replace function public.ensure_saving_pot_category(p_pot_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
    v_pot public.saving_pots;
    v_category_id uuid;
    v_parent_id uuid;
begin
    select * into v_pot from public.saving_pots where id = p_pot_id;
    if v_pot.id is null then
        return null;
    end if;
    if v_pot.category_id is not null then
        return v_pot.category_id;
    end if;

    select c.id into v_category_id
      from public.categories c
     where c.household_id = v_pot.household_id
       and c.type = 'expense'
       and lower(btrim(c.name)) = lower(btrim(v_pot.name))
     order by c.is_archived asc, c.created_at asc
     limit 1;

    if v_category_id is null then
        v_parent_id := public.default_category_id(v_pot.household_id, 'savings');
        insert into public.categories (household_id, name, type, icon, parent_id, sort_order)
        values (
            v_pot.household_id, btrim(v_pot.name), 'expense', 'flag-outline', v_parent_id,
            coalesce((select max(sort_order) + 1 from public.categories where parent_id is not distinct from v_parent_id and household_id = v_pot.household_id), 0)
        )
        on conflict (household_id, type, name) do nothing
        returning id into v_category_id;
    end if;

    update public.saving_pots set category_id = v_category_id where id = p_pot_id;
    return v_category_id;
end;
$$;

create or replace function public.set_default_account_category()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
    if new.category_id is null then
        new.category_id := public.default_account_category_id(new.household_id, new.type);
    end if;
    return new;
end;
$$;

drop trigger if exists set_default_account_category on public.accounts;
create trigger set_default_account_category
    before insert on public.accounts
    for each row execute function public.set_default_account_category();

create or replace function public.set_default_saving_pot_category()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
    if new.category_id is null then
        perform public.ensure_saving_pot_category(new.id);
    end if;
    return new;
end;
$$;

drop trigger if exists set_default_saving_pot_category on public.saving_pots;
create trigger set_default_saving_pot_category
    after insert on public.saving_pots
    for each row execute function public.set_default_saving_pot_category();

-- ---------------------------------------------------------------------------
-- 2. Destination category
-- ---------------------------------------------------------------------------
create or replace function public.destination_category_for_account(p_account_id uuid)
returns uuid
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
    select coalesce(
        (
            -- the one pot this account backs (ambiguous when it backs several)
            select (array_agg(p.category_id))[1]
              from public.saving_pot_accounts spa
              join public.saving_pots p on p.id = spa.pot_id
             where spa.account_id = p_account_id
               and p.category_id is not null
            having count(distinct p.id) = 1
        ),
        (select a.category_id from public.accounts a where a.id = p_account_id)
    );
$$;

comment on function public.destination_category_for_account(uuid) IS 'Category for money moved into an account: the category of the saving pot it backs (when exactly one pot with a category), else the account''s own category_id, else null.';

-- ---------------------------------------------------------------------------
-- 3. Monthly Budget movements use the destination category
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_planned_item_month(p_household_id uuid, p_month date, p_transfers jsonb, p_confirmed_by uuid) RETURNS public.monthly_budget_periods
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_leg jsonb;
    v_occurrence_id uuid;
    v_occurrence public.planned_item_occurrences%rowtype;
    v_role public.planned_item_transaction_role;
    v_account_id uuid;
    v_amount numeric;
    v_category_id uuid;
    v_lookup_account_id uuid;
    v_occurrence_destination_id uuid;
    v_transfer_groups jsonb := '{}'::jsonb;
    v_transfer_group_id uuid;
    v_type public.transaction_type;
    v_item_name text;
    v_month_key text;
    v_title text;
    v_notes text;
    v_period public.monthly_budget_periods%rowtype;
    v_batch_id uuid;
    v_income_count integer := 0;
    v_income_total numeric := 0;
    v_transfer_count integer := 0;
    v_transfer_total numeric := 0;
begin
    if not public.is_household_admin(p_household_id, auth.uid()) then
        raise exception 'Only household admins can confirm a monthly budget month';
    end if;

    p_transfers := coalesce(p_transfers, '[]'::jsonb);
    if jsonb_typeof(p_transfers) <> 'array' then
        raise exception 'Planned item transfers must be a JSON array';
    end if;

    -- Serialise concurrent clicks on the same month: make sure the period
    -- row exists, then lock it. A second caller blocks here until the
    -- first commits, then sees status <> 'open' and inserts nothing.
    insert into public.monthly_budget_periods (household_id, month, status)
    values (p_household_id, p_month, 'open')
    on conflict (household_id, month) do nothing;

    select * into v_period
      from public.monthly_budget_periods
     where household_id = p_household_id and month = p_month
     for update;

    if v_period.status <> 'open' then
        return v_period; -- already created: never create anything twice
    end if;

    insert into public.monthly_budget_batches (household_id, month, created_by)
    values (p_household_id, p_month, p_confirmed_by)
    returning id into v_batch_id;

    v_month_key := to_char(p_month, 'YYYY-MM');

    -- Income legs first (occurrence.source_account_id is null), then every
    -- transfer leg, each group in its original order -- see
    -- 20260901002400 for why created_at uses clock_timestamp().
    for v_leg in
        select elems.value
          from jsonb_array_elements(p_transfers) with ordinality as elems(value, ord)
          left join public.planned_item_occurrences poc
                 on poc.id = nullif(elems.value ->> 'occurrenceId', '')::uuid
                and poc.household_id = p_household_id
         order by coalesce(poc.source_account_id is not null, true), elems.ord
    loop
        v_occurrence_id := nullif(v_leg ->> 'occurrenceId', '')::uuid;
        if v_occurrence_id is null then
            raise exception 'Planned item transfer entry is missing occurrenceId';
        end if;

        select * into v_occurrence
          from public.planned_item_occurrences
         where id = v_occurrence_id
           and household_id = p_household_id
         for update;

        if not found then
            raise exception 'Planned item occurrence % does not belong to household %', v_occurrence_id, p_household_id;
        end if;
        if v_occurrence.month <> p_month then
            raise exception 'Planned item occurrence % is not in month %', v_occurrence_id, v_month_key;
        end if;

        if v_occurrence.status <> 'planned' or v_occurrence.is_estimate then
            continue;
        end if;

        v_role := (v_leg ->> 'role')::public.planned_item_transaction_role;
        v_account_id := nullif(v_leg ->> 'accountId', '')::uuid;
        v_amount := (v_leg ->> 'amount')::numeric;
        v_category_id := nullif(v_leg ->> 'categoryId', '')::uuid;
        v_lookup_account_id := nullif(v_leg ->> 'occurrenceDestinationLookupAccountId', '')::uuid;

        -- Movements take their category from the destination's
        -- configuration (its saving pot, else the account itself -- see
        -- destination_category_for_account); both legs of a transfer share
        -- it. The leg's own category (the planned item's) is only the
        -- fallback for a destination with nothing configured. Income legs
        -- keep the planned item's income category.
        if v_role in ('transfer_source', 'transfer_destination') and v_lookup_account_id is not null then
            v_category_id := coalesce(public.destination_category_for_account(v_lookup_account_id), v_category_id);
        end if;

        if v_role is null then
            raise exception 'Planned item transfer leg is missing a role (occurrence %)', v_occurrence_id;
        end if;
        if v_amount is null or v_amount <= 0 then
            raise exception 'Planned item transfer amount must be greater than zero (occurrence %)', v_occurrence_id;
        end if;
        if v_account_id is null then
            raise exception 'Planned item transfer is missing an account (occurrence %)', v_occurrence_id;
        end if;
        if not exists (
            select 1 from public.accounts where id = v_account_id and household_id = p_household_id
        ) then
            raise exception 'Planned item transfer account % does not belong to household %', v_account_id, p_household_id;
        end if;

        v_occurrence_destination_id := null;
        v_transfer_group_id := null;

        if v_lookup_account_id is not null then
            select id into v_occurrence_destination_id
              from public.planned_item_occurrence_destinations
             where occurrence_id = v_occurrence_id
               and destination_account_id = v_lookup_account_id
             limit 1;

            if v_occurrence_destination_id is null then
                raise exception 'No occurrence destination for account % on occurrence % -- call materialize_planned_item_occurrences first',
                    v_lookup_account_id, v_occurrence_id;
            end if;

            if v_role in ('transfer_source', 'transfer_destination') then
                v_transfer_group_id := nullif(v_transfer_groups ->> v_occurrence_destination_id::text, '')::uuid;
                if v_transfer_group_id is null then
                    v_transfer_group_id := gen_random_uuid();
                    v_transfer_groups := v_transfer_groups
                        || jsonb_build_object(v_occurrence_destination_id::text, v_transfer_group_id::text);
                end if;
            end if;
        end if;

        v_type := case when v_role in ('transfer_destination', 'income') then 'income' else 'expense' end;

        -- Per-leg idempotency (unchanged).
        if v_occurrence_destination_id is not null then
            if exists (
                select 1 from public.transactions
                 where planned_item_occurrence_destination_id = v_occurrence_destination_id
                   and planned_item_transaction_role = v_role
            ) then
                continue;
            end if;
        else
            if exists (
                select 1 from public.transactions
                 where planned_item_occurrence_id = v_occurrence_id
                   and planned_item_occurrence_destination_id is null
                   and planned_item_transaction_role = 'plain_expense'
            ) then
                continue;
            end if;
        end if;

        select pi.name into v_item_name
          from public.planned_items pi
         where pi.id = v_occurrence.planned_item_id;

        v_title := coalesce(v_item_name, 'Planned item');
        v_notes := 'Monthly budget ' || v_month_key || ' · ' || v_title;

        insert into public.transactions (
            household_id, account_id, category_id, transfer_group_id,
            title, notes, amount, type, transaction_date, created_by, created_at,
            planned_item_occurrence_id, planned_item_occurrence_destination_id,
            planned_item_transaction_role, monthly_budget_batch_id
        ) values (
            p_household_id, v_account_id, v_category_id, v_transfer_group_id,
            v_title, v_notes, v_amount, v_type, p_month::timestamptz, p_confirmed_by, clock_timestamp(),
            v_occurrence_id, v_occurrence_destination_id, v_role, v_batch_id
        );

        if v_role = 'income' then
            v_income_count := v_income_count + 1;
            v_income_total := v_income_total + v_amount;
        elsif v_role = 'transfer_source' then
            v_transfer_count := v_transfer_count + 1;
            v_transfer_total := v_transfer_total + v_amount;
        end if;
    end loop;

    if v_income_count = 0 and v_transfer_count = 0 then
        raise exception 'Nothing to create for % -- every income and movement is already created or not due this month.', v_month_key;
    end if;

    update public.monthly_budget_batches
       set income_count = v_income_count,
           income_total = v_income_total,
           transfer_count = v_transfer_count,
           transfer_total = v_transfer_total
     where id = v_batch_id;

    update public.planned_item_occurrences
       set status = 'confirmed',
           confirmed_at = now(),
           confirmed_by = p_confirmed_by
     where household_id = p_household_id
       and month = p_month
       and status = 'planned'
       and not is_estimate
       and id in (
           select distinct nullif(value ->> 'occurrenceId', '')::uuid
             from jsonb_array_elements(p_transfers)
       );

    update public.monthly_budget_periods
       set status = 'committed',
           confirmed_at = now(),
           confirmed_by = p_confirmed_by
     where id = v_period.id
     returning * into v_period;

    return v_period;
end;
$$;

-- merge_category_into no longer maintains wage_flow_categories (dropped below).
create or replace function public.merge_category_into(p_from uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
    v_from public.categories;
    v_to public.categories;
    r record;
begin
    if p_from is null or p_to is null or p_from = p_to then
        return;
    end if;

    select * into v_from from public.categories where id = p_from;
    select * into v_to from public.categories where id = p_to;

    if v_from.id is null or v_to.id is null then
        return;
    end if;

    if v_from.household_id <> v_to.household_id or v_from.type <> v_to.type then
        raise exception 'Can only merge categories of the same household and type.';
    end if;

    -- If the target is currently a child of the category being merged away,
    -- lift it to that category's parent first so the generic parent_id
    -- rewrite below can't make it its own parent.
    update public.categories
       set parent_id = v_from.parent_id
     where id = p_to
       and parent_id = p_from;

    -- One budget per category per month: when both have one for the same
    -- month, the target's wins.
    delete from public.category_budgets b
     where b.category_id = p_from
       and exists (
           select 1 from public.category_budgets o
            where o.category_id = p_to
              and o.effective_month = b.effective_month
       );

    -- Repoint every foreign key that references categories.id (including
    -- categories.parent_id, which moves the duplicate's children over).
    -- Discovered from the system catalog so a future FK is never missed.
    for r in
        select cl.relname as table_name, att.attname as column_name
          from pg_constraint con
          join pg_class cl on cl.oid = con.conrelid
          join pg_namespace ns on ns.oid = cl.relnamespace
          cross join lateral unnest(con.conkey, con.confkey) as k(attnum, fattnum)
          join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
          join pg_attribute fatt on fatt.attrelid = con.confrelid and fatt.attnum = k.fattnum
         where con.contype = 'f'
           and con.confrelid = 'public.categories'::regclass
           and ns.nspname = 'public'
           and fatt.attname = 'id'
    loop
        execute format('update public.%I set %I = $1 where %I = $2', r.table_name, r.column_name, r.column_name)
          using p_to, p_from;
    end loop;

    update public.categories
       set is_archived = true,
           is_default = false
     where id = p_from;
end;
$$;

-- ---------------------------------------------------------------------------
-- Existing rows: defaults, then backfill Monthly Budget transfers
-- ---------------------------------------------------------------------------
update public.accounts a
   set category_id = public.default_account_category_id(a.household_id, a.type)
 where a.category_id is null
   and a.type in ('investment', 'ppr', 'savings');

do $$
declare
    v_pot_id uuid;
begin
    for v_pot_id in select id from public.saving_pots where category_id is null order by created_at loop
        perform public.ensure_saving_pot_category(v_pot_id);
    end loop;
end;
$$;

-- Planned-item movements: both legs, destination from the occurrence destination.
with derived as (
    select t.id, public.destination_category_for_account(pod.destination_account_id) as category_id
      from public.transactions t
      join public.planned_item_occurrence_destinations pod on pod.id = t.planned_item_occurrence_destination_id
     where t.planned_item_transaction_role in ('transfer_source', 'transfer_destination')
)
update public.transactions t
   set category_id = d.category_id
  from derived d
 where t.id = d.id
   and d.category_id is not null
   and t.category_id is distinct from d.category_id;

-- Legacy monthly_budget_run transfers: destination = the income leg's account.
with legs as (
    select t.transfer_group_id,
           public.destination_category_for_account((array_agg(t.account_id) filter (where t.type = 'income'))[1]) as category_id
      from public.transactions t
     where t.monthly_budget_run_id is not null
       and t.transfer_group_id is not null
     group by t.transfer_group_id
)
update public.transactions t
   set category_id = l.category_id
  from legs l
 where t.transfer_group_id = l.transfer_group_id
   and l.category_id is not null
   and t.category_id is distinct from l.category_id;

-- ---------------------------------------------------------------------------
-- 5. Wage Flow uses the Categories section directly
-- ---------------------------------------------------------------------------
drop table if exists public.wage_flow_categories;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
revoke all on function public.validate_destination_category() from public, anon, authenticated;
revoke all on function public.default_category_id(uuid, text) from public, anon, authenticated;
revoke all on function public.default_account_category_id(uuid, public.account_type) from public, anon, authenticated;
revoke all on function public.ensure_saving_pot_category(uuid) from public, anon, authenticated;
revoke all on function public.set_default_account_category() from public, anon, authenticated;
revoke all on function public.set_default_saving_pot_category() from public, anon, authenticated;
revoke all on function public.destination_category_for_account(uuid) from public, anon;
grant execute on function public.destination_category_for_account(uuid) to authenticated;
