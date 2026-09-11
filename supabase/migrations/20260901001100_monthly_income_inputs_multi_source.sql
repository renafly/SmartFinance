-- ============================================================
-- monthly_income_inputs: support multiple income sources per member
-- ============================================================
-- monthly_income_inputs was uniquely keyed by (run, member) -- exactly one
-- wage figure per household member per month, which cannot represent a
-- member having more than one income source (e.g. "Salary" + "Bonus" both
-- belonging to the same person) or genuinely shared/unowned income. This
-- migration keeps monthly_income_inputs as the persisted, per-run record of
-- "what income was actually credited" (confirm_monthly_budget_run still
-- reads it, unchanged in every other respect), but re-keys it by income
-- source instead of by member, and carries the source's name/category
-- through so generated transactions no longer depend on the brittle
-- "Monthly wage: %" title-matching trigger for categorization.

alter table public.monthly_income_inputs
  add column if not exists income_source_id uuid references public.income_sources(id) on delete set null,
  add column if not exists name text,
  add column if not exists category_id uuid references public.categories(id) on delete set null;

alter table public.monthly_income_inputs
  alter column member_id drop not null;

do $$
declare
  v_constraint_name text;
begin
  select con.conname
    into v_constraint_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
   where nsp.nspname = 'public'
     and rel.relname = 'monthly_income_inputs'
     and con.contype = 'u'
     and (
       select array_agg(attname::text order by attname)
         from unnest(con.conkey) as key(attnum)
         join pg_attribute attr on attr.attrelid = con.conrelid and attr.attnum = key.attnum
     ) = array['member_id', 'monthly_budget_run_id'];

  if v_constraint_name is not null then
    execute format('alter table public.monthly_income_inputs drop constraint %I', v_constraint_name);
  end if;
end
$$;

-- Legacy rows (income_source_id is null) keep the old one-per-member
-- guarantee; new rows are one-per-income-source. Both can coexist during
-- the transition -- historical confirmed runs are never rewritten.
create unique index if not exists idx_monthly_income_inputs_run_member
  on public.monthly_income_inputs(monthly_budget_run_id, member_id)
  where income_source_id is null;

create unique index if not exists idx_monthly_income_inputs_run_source
  on public.monthly_income_inputs(monthly_budget_run_id, income_source_id)
  where income_source_id is not null;

create index if not exists idx_monthly_income_inputs_run
  on public.monthly_income_inputs(monthly_budget_run_id);

create index if not exists idx_monthly_income_inputs_source
  on public.monthly_income_inputs(income_source_id);

-- Backfill: give every household one income_sources row per member who has
-- ever entered a wage, seeded from their most recent entry, so the new
-- Income section isn't empty for existing households. recurrence_type
-- defaults to 'monthly' -- the common case; households with a different
-- pattern (e.g. seasonal income) can adjust it after the fact.
insert into public.income_sources (
  household_id, name, amount, destination_account_id, owner_member_id,
  recurrence_type, start_date, created_by
)
select distinct on (mii.member_id, mbr.household_id)
  mbr.household_id,
  coalesce(nullif(trim(profile.full_name), ''), profile.email, 'Income') as name,
  mii.amount,
  mii.cash_account_id,
  mii.member_id,
  'monthly'::public.recurring_expense_recurrence_type,
  date_trunc('month', now())::date,
  mii.member_id
from public.monthly_income_inputs mii
join public.monthly_budget_runs mbr on mbr.id = mii.monthly_budget_run_id
join public.accounts acc on acc.id = mii.cash_account_id and acc.household_id = mbr.household_id
left join public.profiles profile on profile.id = mii.member_id
where mii.amount > 0
  and mii.member_id is not null
  and not exists (
    -- Skip households that already have at least one income source for
    -- this member (e.g. this migration re-running, or a source already
    -- created another way).
    select 1 from public.income_sources existing
    where existing.household_id = mbr.household_id
      and existing.owner_member_id = mii.member_id
      and existing.deleted_at is null
  )
order by mii.member_id, mbr.household_id, mbr.month desc, mii.created_at desc;

-- confirm_monthly_budget_run: same signature and behavior, only the income
-- crediting section changes -- prefer the income source's own name/category
-- when present, and tolerate a null member_id (shared/unowned income),
-- falling back to the confirming admin as created_by in that case.
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
    v_amount numeric;
    v_title text;
    v_section public.monthly_budget_section;
    v_month_key text;
    v_notes text;
    v_income_title text;
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

    -- Credit income that is available in this run before applying allocations.
    for v_income in
        select
            income.member_id,
            income.cash_account_id,
            income.amount,
            income.available_month,
            income.name,
            income.category_id,
            coalesce(nullif(trim(profile.full_name), ''), profile.email, 'Shared') as member_label
        from public.monthly_income_inputs income
        join public.accounts account
          on account.id = income.cash_account_id
         and account.household_id = v_run.household_id
        left join public.profiles profile on profile.id = income.member_id
        where income.monthly_budget_run_id = v_run.id
          and income.available_month = v_run.month
        order by income.created_at, income.member_id
    loop
        if v_income.member_id is not null
           and not public.is_household_member(v_run.household_id, v_income.member_id) then
            raise exception 'Monthly income member does not belong to this household';
        end if;
        if v_income.amount < 0 then
            raise exception 'Monthly income amount cannot be negative';
        end if;

        if v_income.amount > 0 then
            v_income_title := coalesce(nullif(trim(v_income.name), ''), 'Monthly wage: ' || v_income.member_label);

            insert into public.transactions (
                household_id,
                account_id,
                category_id,
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
                v_income.category_id,
                v_run.id,
                'income',
                v_income_title,
                'Monthly budget ' || v_month_key || ' · Income · ' || v_income_title,
                v_income.amount,
                'income',
                v_run.month::timestamptz,
                coalesce(v_income.member_id, auth.uid())
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

        v_transfer_group_id := gen_random_uuid();
        v_notes := 'Monthly budget ' || v_month_key || ' · ' ||
            case when v_section = 'remaining_cash' then 'Remaining cash distribution' else 'Allocation · ' || v_title end;

        insert into public.transactions (
            household_id, account_id, transfer_group_id,
            monthly_budget_run_id, generated_by_rule_id, budget_section,
            title, notes, amount, type, transaction_date, created_by
        ) values (
            v_run.household_id, v_source_account_id, v_transfer_group_id,
            v_run.id, v_generated_by_rule_id, v_section,
            v_title, v_notes, v_amount, 'expense', v_run.month::timestamptz, auth.uid()
        );

        insert into public.transactions (
            household_id, account_id, transfer_group_id,
            monthly_budget_run_id, generated_by_rule_id, budget_section,
            title, notes, amount, type, transaction_date, created_by
        ) values (
            v_run.household_id, v_destination_account_id, v_transfer_group_id,
            v_run.id, v_generated_by_rule_id, v_section,
            v_title, v_notes, v_amount, 'income', v_run.month::timestamptz, auth.uid()
        );
    end loop;

    -- Deferred income is a real receipt in this run, but it is inserted only
    -- after allocations so it cannot fund the current month's rules.
    for v_income in
        select
            income.member_id,
            income.cash_account_id,
            income.amount,
            income.available_month,
            income.name,
            income.category_id,
            coalesce(nullif(trim(profile.full_name), ''), profile.email, 'Shared') as member_label
        from public.monthly_income_inputs income
        join public.accounts account
          on account.id = income.cash_account_id
         and account.household_id = v_run.household_id
        left join public.profiles profile on profile.id = income.member_id
        where income.monthly_budget_run_id = v_run.id
          and income.available_month <> v_run.month
        order by income.created_at, income.member_id
    loop
        if v_income.member_id is not null
           and not public.is_household_member(v_run.household_id, v_income.member_id) then
            raise exception 'Monthly income member does not belong to this household';
        end if;
        if v_income.amount < 0 then
            raise exception 'Monthly income amount cannot be negative';
        end if;

        if v_income.amount > 0 then
            v_income_title := coalesce(nullif(trim(v_income.name), ''), 'Monthly wage: ' || v_income.member_label);

            insert into public.transactions (
                household_id, account_id, category_id, monthly_budget_run_id, budget_section,
                title, notes, amount, type, transaction_date, created_by
            ) values (
                v_run.household_id, v_income.cash_account_id, v_income.category_id, v_run.id, 'income',
                v_income_title,
                'Monthly budget ' || v_month_key || ' · Income · ' || v_income_title ||
                    ' · Available ' || to_char(v_income.available_month, 'YYYY-MM'),
                v_income.amount, 'income', v_run.month::timestamptz, coalesce(v_income.member_id, auth.uid())
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

revoke all on function public.confirm_monthly_budget_run(uuid, jsonb, jsonb) from public;
grant execute on function public.confirm_monthly_budget_run(uuid, jsonb, jsonb) to authenticated;
