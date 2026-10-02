-- ============================================================
-- Recoverable monthly-budget rules
-- ============================================================

alter table public.budget_rules
  add column if not exists deleted_at timestamptz;

create index if not exists idx_budget_rules_active_config
  on public.budget_rules(budget_config_id, priority, created_at)
  where deleted_at is null;

drop policy if exists "Members can view budget rules" on public.budget_rules;

create policy "Members can view active budget rules"
on public.budget_rules
for select
using (
  deleted_at is null
  and exists (
    select 1
    from public.budget_configs bc
    where bc.id = budget_config_id
      and public.is_household_member(bc.household_id, auth.uid())
  )
);

-- Saving a configuration must be one transaction. The former client-side
-- delete-and-insert sequence could leave an empty rule list after any failure.
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

    if v_rule_id is null then
      insert into public.budget_rules (
        budget_config_id, name, section, source_account_id, destination_account_id,
        destination_pot_id, owner_member_id, amount, frequency, priority, is_active,
        active_months, active_from_month, active_to_month
      )
      values (
        v_config_id,
        trim(v_rule->>'name'),
        (v_rule->>'section')::public.monthly_budget_section,
        (v_rule->>'source_account_id')::uuid,
        (v_rule->>'destination_account_id')::uuid,
        null,
        nullif(v_rule->>'owner_member_id', '')::uuid,
        (v_rule->>'amount')::numeric,
        'monthly'::public.recurring_frequency,
        coalesce((v_rule->>'priority')::integer, 0),
        coalesce((v_rule->>'is_active')::boolean, true),
        coalesce(array(select jsonb_array_elements_text(coalesce(v_rule->'active_months', '[]'::jsonb))::smallint), '{}'::smallint[]),
        nullif(v_rule->>'active_from_month', '')::smallint,
        nullif(v_rule->>'active_to_month', '')::smallint
      );
    else
      update public.budget_rules
         set name = trim(v_rule->>'name'),
             section = (v_rule->>'section')::public.monthly_budget_section,
             source_account_id = (v_rule->>'source_account_id')::uuid,
             destination_account_id = (v_rule->>'destination_account_id')::uuid,
             destination_pot_id = null,
             owner_member_id = nullif(v_rule->>'owner_member_id', '')::uuid,
             amount = (v_rule->>'amount')::numeric,
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
  end loop;

  return v_config_id;
end;
$$;

create or replace function public.restore_budget_rule(p_rule_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.budget_rules br
     set deleted_at = null
    from public.budget_configs bc
   where br.id = p_rule_id
     and br.budget_config_id = bc.id
     and br.deleted_at is not null
     and public.is_household_admin(bc.household_id, auth.uid());

  return found;
end;
$$;

create or replace function public.purge_soft_deleted_budget_rules()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted_count integer;
begin
  delete from public.budget_rules
   where deleted_at < now() - interval '30 days';

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

revoke all on function public.purge_soft_deleted_budget_rules() from public, anon, authenticated;
grant execute on function public.save_monthly_budget_configuration(uuid, uuid, text, public.household_income_mode, public.remaining_cash_strategy, numeric, public.excess_cash_distribution_method, jsonb) to authenticated;
grant execute on function public.restore_budget_rule(uuid) to authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'purge-soft-deleted-budget-rules-weekly',
  '30 3 * * 6',
  'select public.purge_soft_deleted_budget_rules()'
);
