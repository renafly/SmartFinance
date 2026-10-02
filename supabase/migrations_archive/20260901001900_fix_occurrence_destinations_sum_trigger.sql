-- ============================================================
-- Monthly Budget rebuild (Phase 2) -- fix occurrence destinations sum trigger
-- ============================================================
-- Additive follow-up to 20260901001400_planned_item_occurrences.sql.
-- Does not edit that file -- redefines
-- check_planned_item_occurrence_destinations_deferred() in place (same
-- signature, same deferred constraint trigger already wired up to it
-- there -- CREATE OR REPLACE is enough, no trigger changes needed).
--
-- Gap being fixed: a plain-expense occurrence has 0 destination rows by
-- design -- the transaction is generated directly from
-- occurrence.source_account_id with no destination row at all. The
-- trigger as originally written checked sum(amount) = expected_amount
-- unconditionally, so the moment any INSERT/UPDATE/DELETE touches that
-- occurrence's destinations (e.g. a REFRESH that transitions an
-- occurrence from N destinations down to 0), the DELETE fires the
-- trigger, sum(amount) over zero rows is coalesced to 0, expected_amount
-- is nonzero, and the check spuriously fails. Backend worked around this
-- by materializing a fake self-referencing destination row for every
-- plain-expense occurrence just to give the trigger something to sum to
-- zero difference -- a schema workaround leaking into the resolver,
-- types, the confirm RPC, and the test suite. Fixed at the source here
-- instead: the sum check is now skipped entirely when the destination
-- count for that occurrence is 0. A real split (count > 0) must still
-- sum exactly to expected_amount, unchanged -- this exactly mirrors how
-- the template-level trigger (check_planned_item_destinations_deferred,
-- see 20260901001300_planned_item_destinations.sql /
-- 20260901001700_planned_items_schema_fixes.sql) only checks sums for
-- custom_amount/custom_percent and has no opinion when there is nothing
-- to sum.

create or replace function public.check_planned_item_occurrence_destinations_deferred()
returns trigger
language plpgsql
as $$
declare
    v_occurrence_id uuid;
    v_expected_amount numeric(14,2);
    v_dest_count integer;
    v_sum_amount numeric(14,2);
begin
    v_occurrence_id := coalesce(new.occurrence_id, old.occurrence_id);

    select expected_amount into v_expected_amount
        from public.planned_item_occurrences
        where id = v_occurrence_id;

    if not found then
        -- Parent occurrence was deleted; cascade already removed every
        -- destination row for it, so there is nothing left to check.
        return null;
    end if;

    select count(*), coalesce(sum(amount), 0) into v_dest_count, v_sum_amount
        from public.planned_item_occurrence_destinations
        where occurrence_id = v_occurrence_id;

    if v_dest_count = 0 then
        -- No destinations is a valid, checkable-free state (plain-expense
        -- occurrences: the transaction is generated directly from
        -- occurrence.source_account_id, with no destination row at all).
        return null;
    end if;

    if v_sum_amount <> v_expected_amount then
        raise exception 'Occurrence destination amounts (%) must sum exactly to the expected amount (%) for occurrence %', v_sum_amount, v_expected_amount, v_occurrence_id;
    end if;

    return null;
end;
$$;

comment on function public.check_planned_item_occurrence_destinations_deferred() is
  'Deferred (INITIALLY DEFERRED) constraint trigger function on planned_item_occurrence_destinations, checked once per affected occurrence_id at commit: when destination count > 0, sum(amount) must equal planned_item_occurrences.expected_amount exactly, for every allocation mode. When destination count = 0 (plain-expense occurrences, generated directly from occurrence.source_account_id) the check is skipped entirely -- there is nothing to sum. Redefined in 20260901001900_fix_occurrence_destinations_sum_trigger.sql to add the zero-destination guard; the deferred constraint trigger created in 20260901001400_planned_item_occurrences.sql already points at this function by name and did not need to change.';
