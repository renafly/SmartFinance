-- ============================================================
-- Monthly Budget rebuild (Phase 2) -- schema fixes
-- ============================================================
-- Additive follow-up to 20260901001200_planned_items_core.sql /
-- 20260901001300_planned_item_destinations.sql. Does not edit either of
-- those files -- see docs/e2e-encryption-plan.md-style convention of
-- layering fixes as new migrations rather than rewriting shipped ones.
--
-- 1. Closes a cardinality gap flagged as an open concern in Phase 2's
--    review: allocation_mode = 'single' must mean "0 or 1 destination"
--    unconditionally, not only when is_estimate = true. Implemented by
--    redefining check_planned_item_destinations_deferred() in place (same
--    signature, same deferred constraint trigger already wired up to it
--    in 20260901001300_planned_item_destinations.sql -- CREATE OR REPLACE
--    is enough, no trigger changes needed) to add the extra check
--    alongside the existing is_estimate one.
--
-- 2. Adds a recurrence-shape CHECK constraint on planned_items, mirroring
--    income_sources_recurrence_shape / income_sources_recurrence_months_valid
--    (see 20260901001000_income_sources.sql) for the same recurrence
--    columns. planned_items.recurrence_months is nullable (unlike
--    income_sources', which is NOT NULL DEFAULT '{}'), so every branch
--    below is written to be null-safe -- coalesce()'d or explicitly
--    is [not] null-checked -- so a NULL recurrence_months can never make
--    the whole OR-expression evaluate to NULL (which Postgres CHECK
--    treats as passing) when it shouldn't.

-- ------------------------------------------------------------
-- 1. Single-mode cardinality check
-- ------------------------------------------------------------

create or replace function public.check_planned_item_destinations_deferred()
returns trigger
language plpgsql
as $$
declare
    v_planned_item_id uuid;
    v_is_estimate boolean;
    v_allocation_mode public.planned_item_allocation_mode;
    v_amount numeric(14,2);
    v_dest_count integer;
    v_sum_amount numeric(14,2);
    v_sum_percent numeric(5,2);
begin
    v_planned_item_id := coalesce(new.planned_item_id, old.planned_item_id);

    select is_estimate, allocation_mode, amount
        into v_is_estimate, v_allocation_mode, v_amount
        from public.planned_items
        where id = v_planned_item_id;

    if not found then
        -- Parent planned_item was deleted; cascade already removed every
        -- destination row for it, so there is nothing left to check.
        return null;
    end if;

    select count(*), coalesce(sum(amount), 0), coalesce(sum(percent), 0)
        into v_dest_count, v_sum_amount, v_sum_percent
        from public.planned_item_destinations
        where planned_item_id = v_planned_item_id;

    -- Applies regardless of allocation_mode: an item flagged as an
    -- estimate may have at most one destination.
    if v_is_estimate and v_dest_count > 1 then
        raise exception 'Estimate planned items may have at most one destination (item % has %)', v_planned_item_id, v_dest_count;
    end if;

    -- Applies regardless of is_estimate: 'single' mode always means at
    -- most one destination. (Fixes an open gap from the Phase 2 review --
    -- previously only the is_estimate branch above constrained cardinality,
    -- so a non-estimate 'single'-mode item could accumulate destinations
    -- with nothing in the DB stopping it.)
    if v_allocation_mode = 'single' and v_dest_count > 1 then
        raise exception 'single allocation mode planned items may have at most one destination (item % has %)', v_planned_item_id, v_dest_count;
    end if;

    if v_allocation_mode = 'custom_amount' and v_sum_amount <> v_amount then
        raise exception 'Destination amounts (%) must sum exactly to the planned item amount (%) for item %', v_sum_amount, v_amount, v_planned_item_id;
    end if;

    if v_allocation_mode = 'custom_percent' and v_sum_percent <> 100 then
        raise exception 'Destination percentages (%) must sum exactly to 100 for item %', v_sum_percent, v_planned_item_id;
    end if;

    return null;
end;
$$;

comment on function public.check_planned_item_destinations_deferred() is
  'Deferred (INITIALLY DEFERRED) constraint trigger function on planned_item_destinations, checked once per affected planned_item_id at commit: enforces (a) is_estimate items have <= 1 destination, (b) allocation_mode = single items have <= 1 destination unconditionally, and (c) the custom_amount/custom_percent sum-exactness rules. equal_split is intentionally not sum-checked -- there is no stored per-destination figure to sum at the template level for that mode. Redefined in 20260901001700_planned_items_schema_fixes.sql to add check (b); the deferred constraint trigger created in 20260901001300_planned_item_destinations.sql already points at this function by name and did not need to change.';

-- ------------------------------------------------------------
-- 2. Recurrence-shape CHECK constraint on planned_items
-- ------------------------------------------------------------

alter table public.planned_items
    add constraint planned_items_recurrence_shape check (
        (recurrence_type = 'monthly' and coalesce(recurrence_months, '{}') = '{}' and recurrence_interval_months is null and one_time_month is null) or
        (recurrence_type = 'specific_months' and recurrence_months is not null and array_length(recurrence_months, 1) > 0 and recurrence_interval_months is null and one_time_month is null) or
        (recurrence_type = 'interval' and recurrence_interval_months is not null and recurrence_interval_months > 0 and coalesce(recurrence_months, '{}') = '{}' and one_time_month is null) or
        (recurrence_type = 'one_time' and one_time_month is not null and coalesce(recurrence_months, '{}') = '{}' and recurrence_interval_months is null)
    ),
    add constraint planned_items_recurrence_months_valid check (
        recurrence_months is null or recurrence_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]
    );

comment on constraint planned_items_recurrence_shape on public.planned_items is
  'Mirrors income_sources_recurrence_shape (20260901001000_income_sources.sql) for the same four recurrence_type branches, adapted to be null-safe since planned_items.recurrence_months is nullable (income_sources.recurrence_months is NOT NULL DEFAULT ''{}''), unlike income_sources.';
