-- ============================================================
-- Monthly Budget rebuild -- Phase 6: one-time data migration
-- ============================================================
-- supabase/scripts/migrate_to_planned_items.sql
--
-- WHAT THIS IS: a hand-run, dry-run-capable data CONVERSION script, not a
-- numbered Supabase migration. It does not run automatically on `supabase
-- db push` / `db reset` -- an operator runs it deliberately, once, after
-- reviewing a dry-run report, using a role that can bypass RLS (the
-- Supabase SQL editor as `postgres`, or any `service_role` connection).
-- It never touches, alters, or drops budget_rules, budget_rule_allocations,
-- recurring_expenses, recurring_expense_matches, income_sources or
-- monthly_budget_runs -- those tables are left exactly as they are, so the
-- old Monthly Budget screens keep working until the app is cut over and
-- those tables are dropped in a later, separate migration.
--
-- USAGE
--   select public.migrate_budget_data_to_planned_items();        -- dry run (default)
--   select public.migrate_budget_data_to_planned_items(true);    -- dry run, explicit
--   select public.migrate_budget_data_to_planned_items(false);   -- apply for real
--
-- Read every `raise notice` in a dry run before ever passing `false`. Every
-- line prefixed `SKIP` or `ISSUE` is a data-quality problem this script
-- found and refused to guess its way through; some are informational
-- (falls back to a default category, still converts the row), some block
-- conversion of that one row entirely until the source data is fixed.
--
-- ------------------------------------------------------------
-- CONVERSION MAP (source -> target)
-- ------------------------------------------------------------
--  budget_rules (of the household's *currently active* budget_config only,
--    see note below)             -> planned_items (direction='outflow',
--                                    is_estimate=false, definition_version=1)
--  budget_rule_allocations       -> planned_item_destinations
--  recurring_expenses            -> planned_items (direction='outflow',
--                                    is_estimate=true, allocation_mode='single',
--                                    zero planned_item_destinations rows)
--  recurring_expense_matches     -> a synthesized historical
--                                    planned_item_occurrences row (see below)
--                                    + planned_item_matches
--  income_sources                -> planned_items (direction='inflow',
--                                    allocation_mode='single')
--                                    + exactly one planned_item_destinations row
--  monthly_budget_runs           -> monthly_budget_periods
--    ('draft'->'open', 'confirmed'->'committed', 'cancelled'->not migrated)
--  transactions.generated_by_rule_id -- left completely untouched. No
--    attempt is made to backfill planned_item_occurrence_id /
--    planned_item_occurrence_destination_id / planned_item_transaction_role
--    on historical transactions; old lineage stays exactly as it is.
--
-- ------------------------------------------------------------
-- JUDGMENT CALLS THIS SCRIPT MAKES (the design doc left these open)
-- ------------------------------------------------------------
--
-- 1. ONLY THE ACTIVE budget_config's RULES ARE MIGRATED.
--    A household can have more than one budget_configs row (only one
--    is_active at a time -- see 022_monthly_budget.sql /
--    save_monthly_budget_configuration). Creating a new config does NOT
--    soft-delete the old config's budget_rules, so a household can be
--    sitting on rules from an abandoned, superseded budget setup that the
--    UI never shows any more. planned_items has no budget_config concept
--    at all (it is directly household-scoped) -- migrating every
--    inactive config's rules too would silently resurrect abandoned
--    configurations as live planned items. Only budget_rules belonging to
--    `budget_configs.is_active = true` are converted. If this is wrong for
--    a given household, re-point that household's desired budget_configs
--    row to is_active = true before running this script for real.
--
-- 2. CATEGORY_ID FALLBACK: planned_items.category_id is NOT NULL, but
--    budget_rules had no item-level category (only budget_rule_allocations
--    .category_id, nullable, per destination) and recurring_expenses /
--    income_sources both have a *nullable* category_id. Resolution order,
--    per row:
--      a. budget_rules: if every budget_rule_allocations row for the rule
--         shares the exact same category_id (and it's non-null), use it.
--      b. recurring_expenses / income_sources: use the row's own
--         category_id if set.
--      c. Otherwise, fall back to the household's seeded catch-all default
--         category for the matching direction -- the category where
--         is_default = true and name ilike 'other %' (i.e. "Other
--         Expenses" for outflow, "Other Income" for inflow; both are
--         seeded by create_default_categories() in
--         017_household_provisioning.sql for every household). This is
--         chosen over "any is_default category of that type" because a
--         household typically has a dozen is_default categories per type
--         (Groceries, Rent, Transport, ... are all is_default = true) --
--         "Other Expenses"/"Other Income" are the only ones that are
--         actually meant as a genuine fallback bucket.
--      d. If even that catch-all category doesn't exist any more (renamed
--         or deleted by the household), the row is flagged and SKIPPED --
--         never guessed at with an arbitrary category.
--    Falling back to (c) is still reported as an ISSUE line (not silent)
--    so a household can be told "N rows were bucketed into Other
--    Expenses/Other Income and may want a more specific category."
--
--    NOTE: income_sources.category_id is ALSO nullable in the real schema
--    (confirmed by reading 20260901001000_income_sources.sql), even though
--    it wasn't called out as needing this treatment in the original task
--    description -- it gets the exact same fallback-or-flag handling as
--    budget_rules/recurring_expenses, using the 'income' catch-all.
--
-- 3. MONTHLY_BUDGET_RUNS.status = 'cancelled' -> NOT MIGRATED AT ALL. A
--    cancelled run never generated a single transaction and holds no
--    committed state (see confirm_monthly_budget_run -- only a 'draft' run
--    can be confirmed, and a cancelled run's preview_snapshot was never
--    applied). monthly_budget_periods.status = 'closed' is purely derived
--    and application code never sets 'open'/'committed'/'closed' to
--    represent "the user gave up on this month" -- there is no state in
--    the new enum that means that. Creating an 'open' period row for a
--    long-past cancelled month would misleadingly resurrect it as
--    something the new UI thinks still needs action. So: no
--    monthly_budget_periods row is created for a cancelled run at all --
--    the household simply has no period row for that month, identical to
--    a month nobody has touched yet in the new system. This is reported
--    as an ISSUE line so the operator can see exactly which
--    household/months were dropped this way.
--    ('draft' -> 'open' and 'confirmed' -> 'committed' are the two
--    unambiguous cases; 'committed' rows get confirmed_at backfilled from
--    monthly_budget_runs.updated_at as a best-effort approximation --
--    the old table has no dedicated confirmed_at column -- confirmed_by
--    is left null, since no old column records who confirmed a run.)
--
-- 4. active_months / active_from_month / active_to_month (a "calendar
--    month-of-year, recurs every year" window -- see
--    isBudgetRuleActiveForMonth() in
--    src/features/monthly-budget/services/monthly-budget.service.ts) has
--    no direct equivalent in planned_items.recurrence_type -- the new enum
--    is 'monthly' | 'specific_months' | 'interval' | 'one_time', no
--    "month-of-year window" shape. Since a window like "active_from=5,
--    active_to=9" means exactly the same thing as the explicit set
--    {5,6,7,8,9}, it is expanded (wraparound-aware, e.g. active_from=11,
--    active_to=2 -> {11,12,1,2}) into planned_items.recurrence_type =
--    'specific_months' with that explicit recurrence_months array -- no
--    semantic loss, just a different (but equivalent) representation.
--    budget_rules.active_months, when non-empty, wins outright over the
--    from/to window (mirrors the old code's own precedence). Neither set
--    -> recurrence_type = 'monthly'. budget_rules has no start_date/
--    end_date at all (unlike recurring_expenses/income_sources), so
--    start_month/end_month are always left NULL for budget_rules-derived
--    planned_items -- no data existed to put there.
--
-- 5. recurring_expenses HAS NO owner_member_id COLUMN. The task brief that
--    kicked off this script listed owner_member_id as a recurring_expenses
--    column; reading the actual migration
--    (20260901000800_recurring_expense_forecasts.sql) shows it does not
--    exist on that table (only income_sources and budget_rules have it).
--    recurring_expenses-derived planned_items therefore always get
--    owner_member_id = null (shared/unowned), which is the correct
--    "no data available" value, not a bug.
--
-- 6. E2E ENCRYPTION (*_enc / enc_version) COLUMNS ARE NOT CARRIED OVER.
--    budget_rules.amount_enc / budget_rule_allocations.amount_enc are
--    ciphertext the server can never decrypt (see
--    20260814120000_e2e_encryption_foundation.sql) -- and per that
--    migration's own design, the plaintext `amount` column is
--    deliberately NEVER dropped even for an encrypted household, so
--    plaintext `amount` remains a reliable source of truth for this
--    script regardless of a household's encryption status. Every row this
--    script writes gets enc_version = 0 / *_enc = null (plaintext-only) --
--    a household that has already enabled E2E encryption will need a
--    follow-up, client-side migration pass (extending
--    src/features/security/services/e2e-migration.service.ts to cover the
--    new planned_items / planned_item_destinations tables) to re-encrypt
--    the converted rows. That pass is out of scope for this script, which
--    cannot hold or use a household data key.
--
-- 7. budget_rules.priority AND .frequency ARE NOT CARRIED OVER.
--    priority has no analog on planned_items (execution ordering is a
--    concept the new engine does not model the same way) and is simply
--    dropped. frequency is, in current practice, always 'monthly' --
--    save_monthly_budget_configuration (the only write path since
--    20260711000400_soft_delete_monthly_budget_rules.sql) hard-codes it --
--    so it is not read at all for the mapping; instead, any surviving row
--    where frequency <> 'monthly' (only possible via data that predates or
--    bypassed that RPC) is flagged as an ISSUE and skipped rather than
--    guessed at, since planned_items has no non-monthly cadence concept
--    to map it onto.
--
-- ------------------------------------------------------------
-- IDEMPOTENCY
-- ------------------------------------------------------------
-- The new tables use fresh gen_random_uuid() ids unrelated to the old
-- ids, so re-running this script must not be able to tell "already
-- converted" apart from "not converted yet" by id alone. Two mechanisms,
-- layered:
--
--   a. `planned_items_migration_map` (created by this script) --
--      (source_table, source_id) -> planned_item_id, UNIQUE on
--      (source_table, source_id). Before converting a budget_rules /
--      recurring_expenses / income_sources row, this table is checked; a
--      hit means "already converted", and the row (and everything
--      cascading from it -- its allocations/destinations) is skipped
--      entirely, not re-processed. This is also how STEP 4
--      (recurring_expense_matches) finds the already-migrated parent
--      planned_item for a match without caring what its new id happens to
--      be.
--   b. Every child insert also uses the target table's own natural
--      UNIQUE constraint with ON CONFLICT ... DO NOTHING, as a second,
--      independent safety net: planned_item_destinations
--      (planned_item_id, destination_account_id), planned_item_occurrences
--      (planned_item_id, month), planned_item_matches (transaction_id).
--      monthly_budget_periods (household_id, month) gets the same
--      treatment directly (no map-table entry needed -- the natural key
--      already is the old row's household_id + month).
--
-- Re-running this script (dry run or apply) after a partial or full prior
-- apply run is always safe: already-converted rows are silently skipped,
-- not duplicated and not re-updated.
--
-- ------------------------------------------------------------
-- TRANSACTION SAFETY
-- ------------------------------------------------------------
-- `migrate_budget_data_to_planned_items` is one PL/pgSQL function body,
-- invoked as a single top-level SQL statement (`select
-- migrate_budget_data_to_planned_items(false)`); Postgres already gives a
-- single statement's execution one implicit transaction -- any unhandled
-- exception anywhere in the function aborts and rolls back every write it
-- made in that call. This script deliberately does NOT catch exceptions
-- per row in apply mode -- data-quality problems are caught by explicit
-- checks (see above) and handled with `continue` (skip that row, keep
-- going), never by try/catch. A genuinely unexpected error (e.g. a new-
-- schema constraint this script failed to anticipate) is allowed to
-- propagate and abort the *entire* apply run, rolling back every insert
-- made so far in that call -- the safe default for a one-time conversion.
-- If that happens, fix the underlying data (or this script) and re-run;
-- the idempotency mechanism above means nothing already committed from an
-- earlier, successful call will be touched again.
--
-- ------------------------------------------------------------
-- DATA-QUALITY ISSUES THIS SCRIPT CAN FLAG (dry run and apply both)
-- ------------------------------------------------------------
--   - budget_rules.amount <= 0 (new schema requires amount > 0)
--   - budget_rules.frequency <> 'monthly' (no non-monthly concept in the
--     new schema)
--   - a budget_rule with zero budget_rule_allocations rows
--   - a budget_rule whose allocations don't all share one category_id,
--     and the household has no "Other Expenses" fallback category
--   - a recurring_expenses / income_sources row with category_id null and
--     no "Other Expenses"/"Other Income" fallback category available
--   - a recurring_expense_matches row whose parent recurring_expense was
--     not converted (so no planned_item exists to attach an occurrence to)
--   - a transaction_id that appears more than once across
--     recurring_expense_matches (planned_item_matches.transaction_id is
--     UNIQUE in the new schema; the old table already enforces this too,
--     so this is expected to always report zero -- checked anyway,
--     per spec, as an explicit audit rather than an assumption)
--   - a monthly_budget_runs row with status = 'cancelled' (reported, not
--     migrated -- see judgment call #3 above)
--   - (informational, not blocking) every row that fell back to a
--     household's "Other Expenses"/"Other Income" default category
-- ============================================================

-- ------------------------------------------------------------
-- 0. Idempotency tracking table
-- ------------------------------------------------------------
create table if not exists public.planned_items_migration_map (
    id uuid primary key default gen_random_uuid(),
    source_table text not null,
    source_id uuid not null,
    planned_item_id uuid not null references public.planned_items(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (source_table, source_id)
);

comment on table public.planned_items_migration_map is
  'Idempotency ledger for supabase/scripts/migrate_to_planned_items.sql: (source_table, source_id) -> the planned_items row it was converted into. Lets the migration be re-run safely -- a hit here means "already converted, skip". Not exposed to anon/authenticated (no grants, RLS enabled with no policies) -- this is a one-time operator tool, not app data.';

alter table public.planned_items_migration_map enable row level security;

-- ------------------------------------------------------------
-- 1. Helper: household's catch-all default category for a direction
-- ------------------------------------------------------------
create or replace function public.migration_default_category(
    p_household_id uuid,
    p_type public.category_type
) returns uuid
language sql
stable
set search_path = public, pg_temp
as $$
    select id
    from public.categories
    where household_id = p_household_id
      and type = p_type
      and is_default = true
      and name ilike 'other %'
    order by created_at
    limit 1;
$$;

comment on function public.migration_default_category(uuid, public.category_type) is
  'Migration helper (supabase/scripts/migrate_to_planned_items.sql): the household''s seeded catch-all category for a direction (the is_default=true row named "Other Expenses"/"Other Income" from create_default_categories(), 017_household_provisioning.sql). Used only as a last-resort category_id fallback when a row being converted to planned_items has no usable category of its own. Returns null if the household has none (e.g. renamed or deleted it) -- callers must treat null as "cannot resolve, flag for manual review".';

-- ------------------------------------------------------------
-- 2. Helper: budget_rules month-of-year window -> planned_items recurrence
-- ------------------------------------------------------------
create or replace function public.migration_budget_rule_recurrence(
    p_active_months smallint[],
    p_active_from smallint,
    p_active_to smallint,
    out o_recurrence_type public.planned_item_recurrence_type,
    out o_recurrence_months smallint[]
)
language plpgsql
set search_path = public, pg_temp
as $$
declare
    v_clean smallint[];
begin
    -- budget_rules.active_months has no DB-level 1..12 check (unlike
    -- recurring_expenses/income_sources.recurrence_months), so filter
    -- defensively -- planned_items.recurrence_months IS constrained to
    -- 1..12 (planned_items_recurrence_months_valid).
    v_clean := array(
        select distinct m
        from unnest(coalesce(p_active_months, '{}'::smallint[])) m
        where m between 1 and 12
        order by m
    );

    if array_length(v_clean, 1) > 0 then
        o_recurrence_type := 'specific_months';
        o_recurrence_months := v_clean;
        return;
    end if;

    if p_active_from is not null and p_active_to is not null
       and p_active_from between 1 and 12 and p_active_to between 1 and 12 then
        o_recurrence_type := 'specific_months';
        if p_active_from <= p_active_to then
            o_recurrence_months := array(
                select generate_series(p_active_from, p_active_to)::smallint
            );
        else
            -- Wraps the year boundary, e.g. active_from=11, active_to=2 -> {11,12,1,2}.
            o_recurrence_months := array(
                select (((n - 1 + p_active_from - 1) % 12) + 1)::smallint
                from generate_series(1, (12 - p_active_from + 1 + p_active_to)) n
            );
        end if;
        return;
    end if;

    o_recurrence_type := 'monthly';
    o_recurrence_months := null;
end;
$$;

comment on function public.migration_budget_rule_recurrence(smallint[], smallint, smallint) is
  'Migration helper (supabase/scripts/migrate_to_planned_items.sql): expands a budget_rules "month-of-year window" (active_months / active_from_month / active_to_month -- see isBudgetRuleActiveForMonth() in monthly-budget.service.ts) into the equivalent planned_items recurrence_type/recurrence_months. active_months wins over the from/to window when both are set, mirroring the old code''s own precedence. Non-empty active_months or a from/to window both become recurrence_type=specific_months with an explicit month list (wraparound-aware); neither set becomes recurrence_type=monthly.';

-- ------------------------------------------------------------
-- 3. Main entry point
-- ------------------------------------------------------------
create or replace function public.migrate_budget_data_to_planned_items(
    p_dry_run boolean default true
) returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
    -- STEP 1: budget_rules
    v_rule record;
    v_alloc record;
    v_alloc_count integer;
    v_distinct_category integer;
    v_category_id uuid;
    v_issue_reason text;
    v_recurrence_type public.planned_item_recurrence_type;
    v_recurrence_months smallint[];
    v_allocation_mode public.planned_item_allocation_mode;
    v_new_item_id uuid;

    -- STEP 2 / 3: recurring_expenses / income_sources
    v_re record;
    v_is record;

    -- STEP 4: recurring_expense_matches
    v_dup record;
    v_match record;
    v_occ_id uuid;
    v_new_match_id uuid;
    v_pi_amount numeric(14,2);
    v_pi_source_account uuid;
    v_pi_category uuid;
    v_pi_is_estimate boolean;
    v_pi_def_version integer;

    -- STEP 5: monthly_budget_runs
    v_run record;
    v_new_status public.monthly_budget_period_status;

    -- Verification
    v_hh record;
    v_section_total record;
    v_new_total record;
    v_re_total numeric(14,2);
    v_re_n integer;
    v_is_total numeric(14,2);
    v_is_n integer;

    -- Counters
    v_items_migrated integer := 0;
    v_items_skipped integer := 0;
    v_dest_migrated integer := 0;
    v_occ_migrated integer := 0;
    v_match_migrated integer := 0;
    v_periods_migrated integer := 0;
    v_issue_count integer := 0;
begin
    if p_dry_run then
        raise notice '================================================================';
        raise notice 'DRY RUN -- no writes will occur. Re-run with p_dry_run := false to apply.';
        raise notice '================================================================';
    else
        raise notice '================================================================';
        raise notice 'APPLY MODE -- writes ARE being committed by this call.';
        raise notice '================================================================';
    end if;

    -- ============================================================
    -- STEP 1: budget_rules -> planned_items (+ budget_rule_allocations
    -- -> planned_item_destinations), active budget_config only.
    -- ============================================================
    raise notice '--- STEP 1: budget_rules -> planned_items ---';

    for v_rule in
        select br.*, bc.household_id as household_id
        from public.budget_rules br
        join public.budget_configs bc on bc.id = br.budget_config_id
        where bc.is_active = true
        order by br.budget_config_id, br.priority, br.created_at
    loop
        v_issue_reason := null;
        v_category_id := null;

        if exists (
            select 1 from public.planned_items_migration_map
            where source_table = 'budget_rules' and source_id = v_rule.id
        ) then
            continue; -- already converted in a previous run
        end if;

        if v_rule.amount is null or v_rule.amount <= 0 then
            v_issue_reason := format('amount is %s, but planned_items requires amount > 0', v_rule.amount);
        elsif v_rule.frequency is distinct from 'monthly'::public.recurring_frequency then
            v_issue_reason := format('frequency = %L is not monthly; planned_items has no non-monthly cadence concept for outflow rules', v_rule.frequency);
        end if;

        select count(*) into v_alloc_count
        from public.budget_rule_allocations
        where rule_id = v_rule.id;

        if v_issue_reason is null and v_alloc_count = 0 then
            v_issue_reason := 'rule has zero budget_rule_allocations rows -- nothing to build a destination from';
        end if;

        if v_issue_reason is null then
            select count(distinct category_id) into v_distinct_category
            from public.budget_rule_allocations
            where rule_id = v_rule.id;

            if v_distinct_category = 1 then
                select category_id into v_category_id
                from public.budget_rule_allocations
                where rule_id = v_rule.id
                limit 1;
            end if;

            if v_category_id is null then
                v_category_id := public.migration_default_category(v_rule.household_id, 'expense');
                if v_category_id is not null then
                    raise notice 'ISSUE budget_rules.id=% (name=%): allocations do not share one non-null category -- falling back to household default "Other Expenses" category %',
                        v_rule.id, v_rule.name, v_category_id;
                    v_issue_count := v_issue_count + 1;
                else
                    v_issue_reason := 'allocations do not share one category, and the household has no "Other Expenses" fallback category -- needs manual category assignment';
                end if;
            end if;
        end if;

        if v_issue_reason is not null then
            raise notice 'SKIP budget_rules.id=% (name=%, section=%): %', v_rule.id, v_rule.name, v_rule.section, v_issue_reason;
            v_issue_count := v_issue_count + 1;
            v_items_skipped := v_items_skipped + 1;
            continue;
        end if;

        select o_recurrence_type, o_recurrence_months
            into v_recurrence_type, v_recurrence_months
            from public.migration_budget_rule_recurrence(v_rule.active_months, v_rule.active_from_month, v_rule.active_to_month);

        v_allocation_mode := case v_rule.allocation_mode
            when 'equal_split' then 'equal_split'::public.planned_item_allocation_mode
            when 'custom' then 'custom_amount'::public.planned_item_allocation_mode
        end;

        if p_dry_run then
            raise notice 'WOULD MIGRATE budget_rules.id=% (name=%, section=%, amount=%, % allocation(s)) -> planned_items(outflow, category=%, allocation_mode=%, recurrence_type=%, recurrence_months=%)',
                v_rule.id, v_rule.name, v_rule.section, v_rule.amount, v_alloc_count, v_category_id, v_allocation_mode, v_recurrence_type, v_recurrence_months;
            v_items_migrated := v_items_migrated + 1;
            continue;
        end if;

        insert into public.planned_items (
            household_id, name, direction, amount, source_account_id, category_id,
            owner_member_id, is_estimate, allocation_mode, recurrence_type, recurrence_months,
            is_active, deleted_at, created_by, created_at, updated_at
        ) values (
            v_rule.household_id, v_rule.name, 'outflow', v_rule.amount, v_rule.source_account_id, v_category_id,
            v_rule.owner_member_id, false, v_allocation_mode, v_recurrence_type, v_recurrence_months,
            v_rule.is_active, v_rule.deleted_at, null, v_rule.created_at, v_rule.updated_at
        ) returning id into v_new_item_id;

        insert into public.planned_items_migration_map (source_table, source_id, planned_item_id)
        values ('budget_rules', v_rule.id, v_new_item_id)
        on conflict (source_table, source_id) do nothing;

        for v_alloc in
            select * from public.budget_rule_allocations where rule_id = v_rule.id order by sort_order
        loop
            insert into public.planned_item_destinations (
                planned_item_id, destination_account_id, amount, category_id, sort_order
            ) values (
                v_new_item_id,
                v_alloc.destination_account_id,
                -- §8: amount is only carried over for a 'custom' rule (-> custom_amount);
                -- an 'equal_split' rule's destinations get amount = null, since the new
                -- schema computes the equal split at resolution time instead of storing it.
                case when v_rule.allocation_mode = 'custom' then v_alloc.amount else null end,
                v_alloc.category_id,
                v_alloc.sort_order
            )
            on conflict (planned_item_id, destination_account_id) do nothing;
            v_dest_migrated := v_dest_migrated + 1;
        end loop;

        v_items_migrated := v_items_migrated + 1;
    end loop;

    -- ============================================================
    -- STEP 2: recurring_expenses -> planned_items (is_estimate outflow,
    -- zero destinations).
    -- ============================================================
    raise notice '--- STEP 2: recurring_expenses -> planned_items ---';

    for v_re in select * from public.recurring_expenses order by household_id, created_at
    loop
        v_issue_reason := null;
        v_category_id := v_re.category_id;

        if exists (
            select 1 from public.planned_items_migration_map
            where source_table = 'recurring_expenses' and source_id = v_re.id
        ) then
            continue;
        end if;

        if v_category_id is null then
            v_category_id := public.migration_default_category(v_re.household_id, 'expense');
            if v_category_id is not null then
                raise notice 'ISSUE recurring_expenses.id=% (name=%): category_id is null -- falling back to household default "Other Expenses" category %',
                    v_re.id, v_re.name, v_category_id;
                v_issue_count := v_issue_count + 1;
            else
                v_issue_reason := 'category_id is null, and the household has no "Other Expenses" fallback category -- needs manual category assignment';
            end if;
        end if;

        if v_issue_reason is not null then
            raise notice 'SKIP recurring_expenses.id=% (name=%): %', v_re.id, v_re.name, v_issue_reason;
            v_issue_count := v_issue_count + 1;
            v_items_skipped := v_items_skipped + 1;
            continue;
        end if;

        raise notice 'NOTE recurring_expenses.id=% (name=%): account_id was informational-only in the old schema; it becomes the AUTHORITATIVE source_account_id on the new planned_items row -- review this account assignment before relying on it.',
            v_re.id, v_re.name;

        if p_dry_run then
            raise notice 'WOULD MIGRATE recurring_expenses.id=% (name=%, amount=%) -> planned_items(outflow, is_estimate, category=%, recurrence_type=%)',
                v_re.id, v_re.name, v_re.amount, v_category_id, v_re.recurrence_type;
            v_items_migrated := v_items_migrated + 1;
            continue;
        end if;

        insert into public.planned_items (
            household_id, name, notes, direction, amount, source_account_id, category_id,
            owner_member_id, is_estimate, allocation_mode, recurrence_type, recurrence_months,
            recurrence_interval_months, start_month, end_month, is_active, deleted_at,
            created_by, created_at, updated_at
        ) values (
            v_re.household_id, v_re.name, v_re.notes, 'outflow', v_re.amount, v_re.account_id, v_category_id,
            null, true, 'single', v_re.recurrence_type::text::public.planned_item_recurrence_type, v_re.recurrence_months,
            v_re.recurrence_interval_months::smallint,
            date_trunc('month', v_re.start_date)::date,
            case when v_re.end_date is null then null else date_trunc('month', v_re.end_date)::date end,
            not v_re.is_paused, v_re.deleted_at,
            v_re.created_by, v_re.created_at, v_re.updated_at
        ) returning id into v_new_item_id;

        insert into public.planned_items_migration_map (source_table, source_id, planned_item_id)
        values ('recurring_expenses', v_re.id, v_new_item_id)
        on conflict (source_table, source_id) do nothing;

        -- Deliberately zero planned_item_destinations rows: recurring_expenses
        -- never had a destination concept, and allocation_mode='single' permits
        -- 0 or 1 destination (schema_fixes migration), so this is valid by
        -- construction -- no destination row to insert here at all.

        v_items_migrated := v_items_migrated + 1;
    end loop;

    -- ============================================================
    -- STEP 3: income_sources -> planned_items (inflow) + exactly one
    -- planned_item_destinations row.
    -- ============================================================
    raise notice '--- STEP 3: income_sources -> planned_items ---';

    for v_is in select * from public.income_sources order by household_id, created_at
    loop
        v_issue_reason := null;
        v_category_id := v_is.category_id;

        if exists (
            select 1 from public.planned_items_migration_map
            where source_table = 'income_sources' and source_id = v_is.id
        ) then
            continue;
        end if;

        if v_category_id is null then
            v_category_id := public.migration_default_category(v_is.household_id, 'income');
            if v_category_id is not null then
                raise notice 'ISSUE income_sources.id=% (name=%): category_id is null -- falling back to household default "Other Income" category %',
                    v_is.id, v_is.name, v_category_id;
                v_issue_count := v_issue_count + 1;
            else
                v_issue_reason := 'category_id is null, and the household has no "Other Income" fallback category -- needs manual category assignment';
            end if;
        end if;

        if v_issue_reason is not null then
            raise notice 'SKIP income_sources.id=% (name=%): %', v_is.id, v_is.name, v_issue_reason;
            v_issue_count := v_issue_count + 1;
            v_items_skipped := v_items_skipped + 1;
            continue;
        end if;

        if p_dry_run then
            raise notice 'WOULD MIGRATE income_sources.id=% (name=%, amount=%) -> planned_items(inflow, category=%) + 1 destination(account=%)',
                v_is.id, v_is.name, v_is.amount, v_category_id, v_is.destination_account_id;
            v_items_migrated := v_items_migrated + 1;
            continue;
        end if;

        insert into public.planned_items (
            household_id, name, notes, direction, amount, source_account_id, category_id,
            owner_member_id, is_estimate, allocation_mode, recurrence_type, recurrence_months,
            recurrence_interval_months, one_time_month, start_month, end_month, is_active, deleted_at,
            created_by, created_at, updated_at
        ) values (
            v_is.household_id, v_is.name, v_is.notes, 'inflow', v_is.amount, null, v_category_id,
            v_is.owner_member_id, false, 'single', v_is.recurrence_type::text::public.planned_item_recurrence_type, v_is.recurrence_months,
            v_is.recurrence_interval_months::smallint,
            case when v_is.one_time_month is null then null else date_trunc('month', v_is.one_time_month)::date end,
            date_trunc('month', v_is.start_date)::date,
            case when v_is.end_date is null then null else date_trunc('month', v_is.end_date)::date end,
            not v_is.is_paused, v_is.deleted_at,
            v_is.created_by, v_is.created_at, v_is.updated_at
        ) returning id into v_new_item_id;

        insert into public.planned_items_migration_map (source_table, source_id, planned_item_id)
        values ('income_sources', v_is.id, v_new_item_id)
        on conflict (source_table, source_id) do nothing;

        insert into public.planned_item_destinations (
            planned_item_id, destination_account_id, category_id, sort_order
        ) values (
            v_new_item_id, v_is.destination_account_id, v_is.category_id, 0
        )
        on conflict (planned_item_id, destination_account_id) do nothing;
        v_dest_migrated := v_dest_migrated + 1;

        v_items_migrated := v_items_migrated + 1;
    end loop;

    -- ============================================================
    -- STEP 4: recurring_expense_matches -> planned_item_occurrences (a
    -- synthesized historical occurrence) + planned_item_matches.
    -- ============================================================
    raise notice '--- STEP 4: recurring_expense_matches -> planned_item_occurrences + planned_item_matches ---';

    -- Audit: duplicate transaction_id. recurring_expense_matches already
    -- carries `unique (transaction_id)` at the DB level (see
    -- 20260901000800_recurring_expense_forecasts.sql), so this is expected
    -- to always report zero rows -- checked explicitly anyway, as a
    -- defense-in-depth audit rather than an assumption.
    for v_dup in
        select transaction_id, count(*) as n
        from public.recurring_expense_matches
        group by transaction_id
        having count(*) > 1
    loop
        raise notice 'ISSUE duplicate transaction_id % appears % times across recurring_expense_matches -- planned_item_matches.transaction_id is UNIQUE in the new schema and cannot represent this; resolve manually before converting these rows.',
            v_dup.transaction_id, v_dup.n;
        v_issue_count := v_issue_count + 1;
    end loop;

    for v_match in
        select rem.*, re.household_id as household_id
        from public.recurring_expense_matches rem
        join public.recurring_expenses re on re.id = rem.recurring_expense_id
        order by rem.occurrence_month, rem.matched_at
    loop
        if exists (
            select 1 from public.planned_item_matches where transaction_id = v_match.transaction_id
        ) then
            continue; -- already converted in a previous run
        end if;

        select planned_item_id into v_new_item_id
        from public.planned_items_migration_map
        where source_table = 'recurring_expenses' and source_id = v_match.recurring_expense_id;

        if v_new_item_id is null then
            raise notice 'SKIP recurring_expense_matches.id=% (recurring_expense_id=%, occurrence_month=%): parent recurring_expense was not converted to a planned_item in STEP 2 -- cannot create a matching occurrence for it.',
                v_match.id, v_match.recurring_expense_id, v_match.occurrence_month;
            v_issue_count := v_issue_count + 1;
            continue;
        end if;

        if p_dry_run then
            raise notice 'WOULD MIGRATE recurring_expense_matches.id=% -> planned_item_occurrences(planned_item=%, month=%, ending status=matched) + planned_item_matches(transaction_id=%)',
                v_match.id, v_new_item_id, v_match.occurrence_month, v_match.transaction_id;
            v_occ_migrated := v_occ_migrated + 1;
            v_match_migrated := v_match_migrated + 1;
            continue;
        end if;

        select amount, source_account_id, category_id, is_estimate, definition_version
            into v_pi_amount, v_pi_source_account, v_pi_category, v_pi_is_estimate, v_pi_def_version
            from public.planned_items
            where id = v_new_item_id;

        -- Materialize the historical occurrence first (FK target for the
        -- match below), starting at 'planned' -- it is flipped to
        -- 'matched' only once the match row itself exists, per the design.
        insert into public.planned_item_occurrences (
            planned_item_id, household_id, month, status, expected_amount,
            source_account_id, category_id, is_estimate, source_definition_version
        ) values (
            v_new_item_id, v_match.household_id, v_match.occurrence_month, 'planned', v_pi_amount,
            v_pi_source_account, v_pi_category, v_pi_is_estimate, v_pi_def_version
        )
        on conflict (planned_item_id, month) do nothing;

        -- No planned_item_occurrence_destinations row is inserted here:
        -- recurring_expenses-derived items have zero planned_item_destinations
        -- (STEP 2), and the deferred sum-check trigger on
        -- planned_item_occurrence_destinations only ever fires for a
        -- occurrence_id that actually has a row change in that table -- with
        -- none inserted, the sum-must-equal-expected_amount check simply
        -- never runs for this occurrence, which is correct: there is nothing
        -- to sum for a single-leg (no-destination) planned item.
        select id into v_occ_id
        from public.planned_item_occurrences
        where planned_item_id = v_new_item_id and month = v_match.occurrence_month;

        insert into public.planned_item_matches (
            occurrence_id, transaction_id, matched_by, matched_at
        ) values (
            v_occ_id, v_match.transaction_id, v_match.matched_by, v_match.matched_at
        )
        on conflict (transaction_id) do nothing
        returning id into v_new_match_id;

        if v_new_match_id is not null then
            update public.planned_item_occurrences
                set status = 'matched', confirmed_at = v_match.matched_at, confirmed_by = v_match.matched_by
                where id = v_occ_id;
            v_match_migrated := v_match_migrated + 1;
        end if;

        v_occ_migrated := v_occ_migrated + 1;
    end loop;

    -- ============================================================
    -- STEP 5: monthly_budget_runs -> monthly_budget_periods.
    -- ============================================================
    raise notice '--- STEP 5: monthly_budget_runs -> monthly_budget_periods ---';

    for v_run in select * from public.monthly_budget_runs order by household_id, month
    loop
        if exists (
            select 1 from public.monthly_budget_periods
            where household_id = v_run.household_id and month = v_run.month
        ) then
            continue; -- already converted in a previous run
        end if;

        if v_run.status = 'cancelled' then
            raise notice 'ISSUE monthly_budget_runs.id=% (household=%, month=%): status=cancelled -- not migrated. A cancelled run generated no transactions and holds no committed state; monthly_budget_periods has no state meaning "abandoned", so no period row is created for this household/month at all (equivalent to a month nobody has touched yet).',
                v_run.id, v_run.household_id, v_run.month;
            v_issue_count := v_issue_count + 1;
            continue;
        end if;

        v_new_status := case v_run.status
            when 'draft' then 'open'::public.monthly_budget_period_status
            when 'confirmed' then 'committed'::public.monthly_budget_period_status
        end;

        if p_dry_run then
            raise notice 'WOULD MIGRATE monthly_budget_runs.id=% (household=%, month=%, status=%) -> monthly_budget_periods(status=%)',
                v_run.id, v_run.household_id, v_run.month, v_run.status, v_new_status;
            v_periods_migrated := v_periods_migrated + 1;
            continue;
        end if;

        insert into public.monthly_budget_periods (
            household_id, month, status, confirmed_at, confirmed_by
        ) values (
            v_run.household_id, v_run.month, v_new_status,
            -- confirmed_at approximated from updated_at (no dedicated column
            -- existed on the old table); confirmed_by has no old-schema source.
            case when v_new_status = 'committed' then v_run.updated_at else null end,
            null
        )
        on conflict (household_id, month) do nothing;

        v_periods_migrated := v_periods_migrated + 1;
    end loop;

    -- ============================================================
    -- VERIFICATION: old-system vs new-system totals per household.
    -- Runs in both dry-run and apply mode.
    -- ============================================================
    raise notice '--- VERIFICATION: old vs new totals per household (eyeball before trusting an apply run) ---';

    for v_hh in
        select distinct household_id from (
            select bc.household_id from public.budget_configs bc where bc.is_active
            union
            select household_id from public.recurring_expenses
            union
            select household_id from public.income_sources
            union
            select household_id from public.planned_items
        ) x
        order by household_id
    loop
        raise notice 'household %:', v_hh.household_id;

        for v_section_total in
            select br.section, sum(br.amount) as total, count(*) as n
            from public.budget_rules br
            join public.budget_configs bc on bc.id = br.budget_config_id
            where bc.household_id = v_hh.household_id
              and bc.is_active
              and br.is_active
              and br.deleted_at is null
            group by br.section
            order by br.section
        loop
            raise notice '  [OLD] budget_rules section=% : total=% (% active rules)',
                v_section_total.section, v_section_total.total, v_section_total.n;
        end loop;

        select coalesce(sum(amount), 0), count(*) into v_re_total, v_re_n
        from public.recurring_expenses
        where household_id = v_hh.household_id and not is_paused and deleted_at is null;
        raise notice '  [OLD] recurring_expenses (active) : total=% (% rows)', v_re_total, v_re_n;

        select coalesce(sum(amount), 0), count(*) into v_is_total, v_is_n
        from public.income_sources
        where household_id = v_hh.household_id and not is_paused and deleted_at is null;
        raise notice '  [OLD] income_sources (active) : total=% (% rows)', v_is_total, v_is_n;

        for v_new_total in
            select direction, is_estimate, sum(amount) as total, count(*) as n
            from public.planned_items
            where household_id = v_hh.household_id and is_active and deleted_at is null
            group by direction, is_estimate
            order by direction, is_estimate
        loop
            raise notice '  [NEW] planned_items direction=% is_estimate=% : total=% (% rows)',
                v_new_total.direction, v_new_total.is_estimate, v_new_total.total, v_new_total.n;
        end loop;
    end loop;

    raise notice '================================================================';
    raise notice 'SUMMARY (%): planned_items migrated=%, skipped=%, destinations=%, occurrences=%, matches=%, periods=%, issues flagged=%',
        case when p_dry_run then 'DRY RUN -- nothing written' else 'APPLIED' end,
        v_items_migrated, v_items_skipped, v_dest_migrated, v_occ_migrated, v_match_migrated, v_periods_migrated, v_issue_count;
    raise notice '================================================================';
end;
$$;

comment on function public.migrate_budget_data_to_planned_items(boolean) is
  'One-time data conversion (Monthly Budget rebuild, Phase 6): budget_rules/budget_rule_allocations/recurring_expenses/recurring_expense_matches/income_sources/monthly_budget_runs -> planned_items/planned_item_destinations/planned_item_occurrences/planned_item_matches/monthly_budget_periods. p_dry_run=true (default) only raises NOTICE lines (row counts + every flagged data-quality issue) and writes nothing; p_dry_run=false performs the real inserts, wrapped by the calling statement''s implicit transaction. Idempotent -- safe to call again after a partial or full prior run, see planned_items_migration_map. Old tables are never modified. See the file header in supabase/scripts/migrate_to_planned_items.sql for every mapping/judgment-call decision.';

-- Not meant to be reachable through the app / PostgREST -- no grants to
-- anon/authenticated. Run manually, as a role that can bypass RLS
-- (`postgres` in the Supabase SQL editor, or a service_role connection).
revoke all on function public.migrate_budget_data_to_planned_items(boolean) from public, anon, authenticated;
revoke all on function public.migration_default_category(uuid, public.category_type) from public, anon, authenticated;
revoke all on function public.migration_budget_rule_recurrence(smallint[], smallint, smallint) from public, anon, authenticated;
