-- ============================================================
-- Monthly Budget rule allocations: optional category
-- ============================================================
-- Lets a household optionally tag a budget rule allocation (e.g.
-- "Investments -> XTB -> EUR50") with a normal transaction category, so the
-- transactions generated when the Monthly Budget runs carry that category
-- exactly like a manually-entered transaction would -- no separate
-- Monthly-Budget-only category concept, just the existing `categories`
-- table and the existing `transactions.category_id` column, threaded
-- through the existing rule -> allocation -> transfer -> transaction
-- pipeline. Entirely optional: a null category_id preserves the exact
-- behavior that existed before this migration at every step.

alter table public.budget_rule_allocations
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists idx_budget_rule_allocations_category
  on public.budget_rule_allocations(category_id);

-- Saving a configuration now accepts an optional `category_id` per
-- allocation object in p_rules:
--   { ..., "allocations": [{ "destination_account_id": uuid, "amount": numeric,
--     "category_id": uuid | null }, ...] }
-- A non-null category_id is validated to belong to the same household as
-- the budget config -- the destination account ids a few lines below aren't
-- given the same explicit check (they rely on the FK + RLS + the
-- household-scoped account picker in the UI), but category ids are cheap
-- and important enough to verify explicitly here, since assigning another
-- household's category would otherwise silently leak into this household's
-- generated transactions and category-based reports.
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
  v_alloc_category_ids uuid[];
  v_category_id uuid;
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
    v_alloc_category_ids := array(
      select nullif(elem->>'category_id', '')::uuid
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

    foreach v_category_id in array v_alloc_category_ids
    loop
      if v_category_id is not null and not exists (
        select 1 from public.categories
         where id = v_category_id
           and household_id = p_household_id
      ) then
        raise exception 'Rule "%" has an allocation category that does not belong to this household.', v_rule_name;
      end if;
    end loop;

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

    insert into public.budget_rule_allocations (rule_id, destination_account_id, amount, category_id, sort_order)
    select v_rule_id, v_dest_ids[gs], v_alloc_amounts[gs], v_alloc_category_ids[gs], gs - 1
    from generate_series(1, v_count) gs;
  end loop;

  return v_config_id;
end;
$$;

-- Applying a confirmed run now threads each transfer's optional
-- `categoryId` (read off the same JSON transfer objects the preview
-- already builds -- see MonthlyBudgetTransfer in monthly-budget.service.ts)
-- onto BOTH legs of the generated transfer, so the category shows up no
-- matter which leg (source or destination) the user opens from the
-- Transactions list. A null categoryId preserves the exact two-insert
-- shape this function had before -- category_id simply isn't included, so
-- new rows default to null exactly like every column that already wasn't
-- being set.
create or replace function public.confirm_monthly_budget_run(
    p_run_id uuid,
    p_transfers jsonb,
    p_preview jsonb
)
returns public.monthly_budget_runs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_run public.monthly_budget_runs%rowtype;
    v_income record;
    v_transfer jsonb;
    v_transfer_group_id uuid;
    v_source_account_id uuid;
    v_destination_account_id uuid;
    v_generated_by_rule_id uuid;
    v_category_id uuid;
    v_amount numeric;
    v_title text;
    v_section public.monthly_budget_section;
    v_month_key text;
    v_notes text;
begin
    select *
      into v_run
      from public.monthly_budget_runs
     where id = p_run_id
     for update;

    if not found then
        raise exception 'Monthly budget run not found';
    end if;

    if not public.is_household_admin(v_run.household_id, auth.uid()) then
        raise exception 'Only household admins can confirm a monthly budget run';
    end if;

    -- A retry after a successful commit is a no-op. The row lock also prevents
    -- two concurrent confirmations from generating duplicate transactions.
    if v_run.status = 'confirmed' then
        return v_run;
    end if;

    if v_run.status <> 'draft' then
        raise exception 'Only draft monthly budget runs can be confirmed';
    end if;

    if p_transfers is null or jsonb_typeof(p_transfers) <> 'array' then
        raise exception 'Monthly budget transfers must be a JSON array';
    end if;
    if p_preview is null or jsonb_typeof(p_preview) <> 'object' then
        raise exception 'Monthly budget preview must be a JSON object';
    end if;
    if coalesce(jsonb_array_length(p_preview -> 'validationIssues'), 0) > 0 then
        raise exception 'Monthly budget preview contains validation issues';
    end if;
    if coalesce(p_preview -> 'transfers', '[]'::jsonb) <> p_transfers then
        raise exception 'Monthly budget transfers do not match the saved preview';
    end if;

    v_month_key := to_char(v_run.month, 'YYYY-MM');

    -- Recover safely from confirmations performed by the previous client-side
    -- loop, which could leave partial rows while the run remained a draft.
    delete from public.transactions
     where monthly_budget_run_id = v_run.id;

    -- Credit wages that are available in this run before applying allocations.
    for v_income in
        select
            income.member_id,
            income.cash_account_id,
            income.amount,
            income.available_month,
            coalesce(nullif(trim(profile.full_name), ''), profile.email, income.member_id::text) as member_label
        from public.monthly_income_inputs income
        join public.accounts account
          on account.id = income.cash_account_id
         and account.household_id = v_run.household_id
        left join public.profiles profile on profile.id = income.member_id
        where income.monthly_budget_run_id = v_run.id
          and income.available_month = v_run.month
        order by income.created_at, income.member_id
    loop
        if not public.is_household_member(v_run.household_id, v_income.member_id) then
            raise exception 'Monthly wage member does not belong to this household';
        end if;
        if v_income.amount < 0 then
            raise exception 'Monthly wage amount cannot be negative';
        end if;

        if v_income.amount > 0 then
            insert into public.transactions (
                household_id,
                account_id,
                monthly_budget_run_id,
                budget_section,
                title,
                notes,
                amount,
                type,
                transaction_date,
                created_by
            ) values (
                v_run.household_id,
                v_income.cash_account_id,
                v_run.id,
                'income',
                'Monthly wage: ' || v_income.member_label,
                'Monthly budget ' || v_month_key || ' · Wage · ' || v_income.member_label,
                v_income.amount,
                'income',
                v_run.month::timestamptz,
                v_income.member_id
            );
        end if;
    end loop;

    -- Apply the already validated preview in rule priority order. Both legs get
    -- the same run metadata and readable note for database inspection.
    for v_transfer in select value from jsonb_array_elements(p_transfers)
    loop
        v_source_account_id := nullif(v_transfer ->> 'sourceAccountId', '')::uuid;
        v_destination_account_id := nullif(v_transfer ->> 'destinationAccountId', '')::uuid;
        v_generated_by_rule_id := nullif(v_transfer ->> 'generatedByRuleId', '')::uuid;
        v_category_id := nullif(v_transfer ->> 'categoryId', '')::uuid;
        v_amount := (v_transfer ->> 'amount')::numeric;
        v_title := nullif(trim(v_transfer ->> 'title'), '');
        v_section := (v_transfer ->> 'section')::public.monthly_budget_section;

        if v_amount is null or v_amount <= 0 then
            raise exception 'Budget transfer amount must be greater than zero';
        end if;
        if v_title is null then
            raise exception 'Budget transfer title is required';
        end if;
        if v_section is null then
            raise exception 'Budget transfer section is required';
        end if;
        if coalesce(v_transfer ->> 'destinationKind', 'account') <> 'account'
           or nullif(v_transfer ->> 'destinationPotId', '') is not null then
            raise exception 'Budget transfers must use account destinations';
        end if;
        if v_source_account_id is null or v_destination_account_id is null
           or v_source_account_id = v_destination_account_id then
            raise exception 'Budget transfer must use two different accounts';
        end if;
        if not exists (
            select 1 from public.accounts
             where id = v_source_account_id and household_id = v_run.household_id
        ) or not exists (
            select 1 from public.accounts
             where id = v_destination_account_id and household_id = v_run.household_id
        ) then
            raise exception 'Budget transfer account does not belong to this household';
        end if;
        if v_generated_by_rule_id is not null and not exists (
            select 1
              from public.budget_rules rule
             where rule.id = v_generated_by_rule_id
               and rule.budget_config_id = v_run.budget_config_id
        ) then
            raise exception 'Budget transfer rule does not belong to this run configuration';
        end if;
        if v_category_id is not null and not exists (
            select 1 from public.categories
             where id = v_category_id
               and household_id = v_run.household_id
        ) then
            raise exception 'Budget transfer category does not belong to this household';
        end if;

        v_transfer_group_id := gen_random_uuid();
        v_notes := 'Monthly budget ' || v_month_key || ' · ' ||
            case when v_section = 'remaining_cash' then 'Remaining cash distribution' else 'Allocation · ' || v_title end;

        insert into public.transactions (
            household_id, account_id, transfer_group_id,
            monthly_budget_run_id, generated_by_rule_id, budget_section, category_id,
            title, notes, amount, type, transaction_date, created_by
        ) values (
            v_run.household_id, v_source_account_id, v_transfer_group_id,
            v_run.id, v_generated_by_rule_id, v_section, v_category_id,
            v_title, v_notes, v_amount, 'expense', v_run.month::timestamptz, auth.uid()
        );

        insert into public.transactions (
            household_id, account_id, transfer_group_id,
            monthly_budget_run_id, generated_by_rule_id, budget_section, category_id,
            title, notes, amount, type, transaction_date, created_by
        ) values (
            v_run.household_id, v_destination_account_id, v_transfer_group_id,
            v_run.id, v_generated_by_rule_id, v_section, v_category_id,
            v_title, v_notes, v_amount, 'income', v_run.month::timestamptz, auth.uid()
        );
    end loop;

    -- Deferred wages are real receipts in this run, but they are inserted only
    -- after allocations so they cannot fund the current month's rules.
    for v_income in
        select
            income.member_id,
            income.cash_account_id,
            income.amount,
            income.available_month,
            coalesce(nullif(trim(profile.full_name), ''), profile.email, income.member_id::text) as member_label
        from public.monthly_income_inputs income
        join public.accounts account
          on account.id = income.cash_account_id
         and account.household_id = v_run.household_id
        left join public.profiles profile on profile.id = income.member_id
        where income.monthly_budget_run_id = v_run.id
          and income.available_month <> v_run.month
        order by income.created_at, income.member_id
    loop
        if not public.is_household_member(v_run.household_id, v_income.member_id) then
            raise exception 'Monthly wage member does not belong to this household';
        end if;
        if v_income.amount < 0 then
            raise exception 'Monthly wage amount cannot be negative';
        end if;

        if v_income.amount > 0 then
            insert into public.transactions (
                household_id, account_id, monthly_budget_run_id, budget_section,
                title, notes, amount, type, transaction_date, created_by
            ) values (
                v_run.household_id, v_income.cash_account_id, v_run.id, 'income',
                'Monthly wage: ' || v_income.member_label,
                'Monthly budget ' || v_month_key || ' · Wage · ' || v_income.member_label ||
                    ' · Available ' || to_char(v_income.available_month, 'YYYY-MM'),
                v_income.amount, 'income', v_run.month::timestamptz, v_income.member_id
            );
        end if;
    end loop;

    update public.monthly_budget_runs
       set status = 'confirmed',
           preview_snapshot = p_preview
     where id = v_run.id
     returning * into v_run;

    return v_run;
end;
$$;
