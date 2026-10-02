-- ============================================================
-- Monthly Budget rules: allocate one rule across N destination accounts
-- ============================================================
-- A budget rule used to carry exactly one destination_account_id/amount
-- pair. This migration moves the destination side of a rule into a child
-- table (`budget_rule_allocations`) so a single rule (e.g. "Investments")
-- can fan out to any number of destination accounts, either splitting the
-- rule's total evenly or using a per-account custom amount.
--
-- Both allocation modes persist concrete, resolved per-account amounts.
-- `allocation_mode` is only a hint for the editor UI (which fields are
-- editable, whether to auto-recompute on change) — the execution engine
-- (buildPreview / confirm_monthly_budget_run) always reads the stored
-- allocation amounts, so there is exactly one code path that turns a rule
-- into transfers regardless of how it was configured. This also keeps
-- rounding simple: the equal-split remainder is distributed once, here,
-- using integer cent math, so the persisted allocations always sum exactly
-- to the rule's total.

create type public.budget_rule_allocation_mode as enum ('equal_split', 'custom');

alter table public.budget_rules
  add column if not exists allocation_mode public.budget_rule_allocation_mode not null default 'equal_split';

create table public.budget_rule_allocations (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.budget_rules(id) on delete cascade,
  destination_account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_id, destination_account_id)
);

create index idx_budget_rule_allocations_rule on public.budget_rule_allocations(rule_id);
create index idx_budget_rule_allocations_destination on public.budget_rule_allocations(destination_account_id);

create trigger set_budget_rule_allocations_updated_at
before update on public.budget_rule_allocations
for each row
execute function public.update_updated_at();

-- Backfill: every existing rule had exactly one destination account, so it
-- becomes a single allocation row carrying the rule's full amount. Existing
-- rules already default to allocation_mode = 'equal_split', which is
-- correct for a single-destination rule (splitting a total across one
-- account is a no-op).
insert into public.budget_rule_allocations (rule_id, destination_account_id, amount, sort_order)
select id, destination_account_id, amount, 0
from public.budget_rules
where destination_account_id is not null;

alter table public.budget_rules
  drop column if exists destination_account_id,
  drop column if exists destination_pot_id;

alter table public.budget_rule_allocations enable row level security;

create policy "Members can view budget rule allocations"
on public.budget_rule_allocations
for select
using (
  exists (
    select 1
    from public.budget_rules br
    join public.budget_configs bc on bc.id = br.budget_config_id
    where br.id = rule_id
      and br.deleted_at is null
      and public.is_household_member(bc.household_id, auth.uid())
  )
);

create policy "Admins can manage budget rule allocations"
on public.budget_rule_allocations
for all
using (
  exists (
    select 1
    from public.budget_rules br
    join public.budget_configs bc on bc.id = br.budget_config_id
    where br.id = rule_id
      and public.is_household_admin(bc.household_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.budget_rules br
    join public.budget_configs bc on bc.id = br.budget_config_id
    where br.id = rule_id
      and public.is_household_admin(bc.household_id, auth.uid())
  )
);

revoke all on table public.budget_rule_allocations from anon;
grant select, insert, update, delete on table public.budget_rule_allocations to authenticated;
grant usage on type public.budget_rule_allocation_mode to authenticated;

-- Saving a configuration replaces every allocation row for every rule sent
-- by the editor (delete-then-insert, scoped to one rule_id at a time), the
-- same "replace" strategy already used for the household's whole rule list
-- a few lines up. Each rule object in p_rules now carries an `allocations`
-- array instead of a single destination_account_id:
--   { ..., "allocation_mode": "equal_split" | "custom",
--     "allocations": [{ "destination_account_id": uuid, "amount": numeric }, ...] }
-- For 'equal_split' rules the amounts sent by the client are ignored and
-- recomputed here from the rule's total and the destination count, so a
-- stale or buggy client can never desync the persisted per-account amounts
-- from the rule total. For 'custom' rules the sum of the sent amounts must
-- equal the rule's total (to the cent) or the whole save is rejected.
create or replace function public.save_monthly_budget_configuration(
  p_household_id uuid,
  p_config_id uuid,
  p_name text,
  p_income_mode public.household_income_mode,
  p_remaining_cash_strategy public.remaining_cash_strategy,
  p_fixed_remaining_cash_amount numeric,
  p_excess_cash_distribution_method public.excess_cash_distribution_method,
  p_rules jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_config_id uuid;
  v_rule jsonb;
  v_rule_id uuid;
  v_rule_name text;
  v_source_account_id uuid;
  v_amount numeric;
  v_allocation_mode public.budget_rule_allocation_mode;
  v_dest_ids uuid[];
  v_alloc_amounts numeric[];
  v_count integer;
  v_distinct_count integer;
  v_total_cents integer;
  v_base_cents integer;
  v_remainder_cents integer;
  v_sum numeric;
begin
  if auth.uid() is null
    or not public.is_household_admin(p_household_id, auth.uid()) then
    raise exception 'Only household administrators can save a monthly budget.';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'A monthly budget name is required.';
  end if;

  if jsonb_typeof(p_rules) <> 'array' then
    raise exception 'Budget rules must be an array.';
  end if;

  if p_config_id is null then
    update public.budget_configs
       set is_active = false
     where household_id = p_household_id
       and is_active;

    insert into public.budget_configs (household_id, name, is_active)
    values (p_household_id, trim(p_name), true)
    returning id into v_config_id;
  else
    select id into v_config_id
      from public.budget_configs
     where id = p_config_id
       and household_id = p_household_id
     for update;

    if v_config_id is null then
      raise exception 'Monthly budget configuration not found.';
    end if;

    update public.budget_configs
       set is_active = false
     where household_id = p_household_id
       and id <> v_config_id
       and is_active;

    update public.budget_configs
       set name = trim(p_name),
           is_active = true
     where id = v_config_id;
  end if;

  update public.households
     set income_mode = p_income_mode,
         remaining_cash_strategy = p_remaining_cash_strategy,
         fixed_remaining_cash_amount = p_fixed_remaining_cash_amount,
         excess_cash_distribution_method = p_excess_cash_distribution_method,
         updated_at = now()
   where id = p_household_id;

  -- Rules no longer sent by the editor are retained for 30 days.
  update public.budget_rules br
     set deleted_at = now()
   where br.budget_config_id = v_config_id
     and br.deleted_at is null
     and not exists (
       select 1
       from jsonb_array_elements(p_rules) candidate
       where candidate ? 'id'
         and nullif(candidate->>'id', '')::uuid = br.id
     );

  for v_rule in select value from jsonb_array_elements(p_rules)
  loop
    v_rule_id := nullif(v_rule->>'id', '')::uuid;
    v_rule_name := trim(v_rule->>'name');
    v_source_account_id := nullif(v_rule->>'source_account_id', '')::uuid;
    v_amount := (v_rule->>'amount')::numeric;
    v_allocation_mode := coalesce(nullif(v_rule->>'allocation_mode', ''), 'equal_split')::public.budget_rule_allocation_mode;

    if v_rule->'allocations' is null
       or jsonb_typeof(v_rule->'allocations') <> 'array'
       or jsonb_array_length(v_rule->'allocations') = 0 then
      raise exception 'Rule "%" needs at least one destination account.', v_rule_name;
    end if;

    v_dest_ids := array(
      select nullif(elem->>'destination_account_id', '')::uuid
      from jsonb_array_elements(v_rule->'allocations') elem
    );
    v_count := array_length(v_dest_ids, 1);

    if exists (select 1 from unnest(v_dest_ids) d where d is null) then
      raise exception 'Rule "%" has an allocation with no destination account.', v_rule_name;
    end if;

    select count(distinct d) into v_distinct_count from unnest(v_dest_ids) d;
    if v_distinct_count <> v_count then
      raise exception 'Rule "%" cannot use the same destination account twice.', v_rule_name;
    end if;

    if v_source_account_id is not null and v_source_account_id = any(v_dest_ids) then
      raise exception 'Rule "%" cannot use the same source and destination account.', v_rule_name;
    end if;

    v_total_cents := round(coalesce(v_amount, 0) * 100)::integer;

    if v_allocation_mode = 'equal_split' then
      -- Recomputed server-side so the client never has to (and can't
      -- desync) — distribute the remainder cent-by-cent to the first N
      -- accounts in the given order so the sum always equals the total.
      v_base_cents := v_total_cents / v_count;
      v_remainder_cents := v_total_cents % v_count;
      v_alloc_amounts := array(
        select (case when gs <= v_remainder_cents then v_base_cents + 1 else v_base_cents end)::numeric / 100.0
        from generate_series(1, v_count) gs
      );
    else
      v_alloc_amounts := array(
        select round(coalesce((elem->>'amount')::numeric, 0), 2)
        from jsonb_array_elements(v_rule->'allocations') elem
      );

      if exists (select 1 from unnest(v_alloc_amounts) x where x <= 0) then
        raise exception 'Rule "%" needs a positive amount for every destination account.', v_rule_name;
      end if;

      select coalesce(sum(x), 0) into v_sum from unnest(v_alloc_amounts) x;
      if round(v_sum, 2) <> round(coalesce(v_amount, 0), 2) then
        raise exception 'Rule "%" custom allocation amounts (%) do not match its total (%).', v_rule_name, v_sum, v_amount;
      end if;
    end if;

    if v_rule_id is null then
      insert into public.budget_rules (
        budget_config_id, name, section, source_account_id,
        owner_member_id, amount, allocation_mode, frequency, priority, is_active,
        active_months, active_from_month, active_to_month
      )
      values (
        v_config_id,
        v_rule_name,
        (v_rule->>'section')::public.monthly_budget_section,
        v_source_account_id,
        nullif(v_rule->>'owner_member_id', '')::uuid,
        v_amount,
        v_allocation_mode,
        'monthly'::public.recurring_frequency,
        coalesce((v_rule->>'priority')::integer, 0),
        coalesce((v_rule->>'is_active')::boolean, true),
        coalesce(array(select jsonb_array_elements_text(coalesce(v_rule->'active_months', '[]'::jsonb))::smallint), '{}'::smallint[]),
        nullif(v_rule->>'active_from_month', '')::smallint,
        nullif(v_rule->>'active_to_month', '')::smallint
      )
      returning id into v_rule_id;
    else
      update public.budget_rules
         set name = v_rule_name,
             section = (v_rule->>'section')::public.monthly_budget_section,
             source_account_id = v_source_account_id,
             owner_member_id = nullif(v_rule->>'owner_member_id', '')::uuid,
             amount = v_amount,
             allocation_mode = v_allocation_mode,
             frequency = 'monthly'::public.recurring_frequency,
             priority = coalesce((v_rule->>'priority')::integer, 0),
             is_active = coalesce((v_rule->>'is_active')::boolean, true),
             active_months = coalesce(array(select jsonb_array_elements_text(coalesce(v_rule->'active_months', '[]'::jsonb))::smallint), '{}'::smallint[]),
             active_from_month = nullif(v_rule->>'active_from_month', '')::smallint,
             active_to_month = nullif(v_rule->>'active_to_month', '')::smallint,
             deleted_at = null
       where id = v_rule_id
         and budget_config_id = v_config_id;

      if not found then
        raise exception 'A budget rule does not belong to this configuration.';
      end if;
    end if;

    delete from public.budget_rule_allocations where rule_id = v_rule_id;

    insert into public.budget_rule_allocations (rule_id, destination_account_id, amount, sort_order)
    select v_rule_id, v_dest_ids[gs], v_alloc_amounts[gs], gs - 1
    from generate_series(1, v_count) gs;
  end loop;

  return v_config_id;
end;
$$;
