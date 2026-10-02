-- ============================================================
-- unlink_planned_item_occurrence_transaction: "Unmark as paid, keep the
-- transaction" for an occurrence paid via confirm_planned_item_occurrence
-- / confirm_planned_item_month (status = 'confirmed', a transaction this
-- app generated directly against the occurrence).
-- ============================================================
-- Complements the two undo paths that already existed:
--   - unmatch_planned_item_occurrence: for status = 'matched' (an
--     existing, separately-created transaction linked via
--     planned_item_matches) -- deletes the match row only, transaction
--     untouched. Already the exact "unlink only" behavior wanted for a
--     manually-linked transaction; no changes needed there.
--   - revert_planned_item_occurrence: for status = 'confirmed' -- DELETES
--     the generated transaction and reopens the occurrence. Already the
--     exact "unlink and delete" behavior for an auto-created transaction;
--     no changes needed there either (still gated on the month being
--     'open', since it destroys data).
--
-- What was missing: "unlink and KEEP" for a 'confirmed' occurrence -- the
-- transaction confirm_planned_item_occurrence created directly (no
-- planned_item_matches row exists for it, so unmatch_planned_item_
-- occurrence does not apply). This detaches that transaction's lineage
-- columns (planned_item_occurrence_id and friends) instead of deleting
-- the row -- the transaction survives as an ordinary, now-unlinked
-- transaction (still counted in category/actual-spend totals like any
-- other categorized transaction), while the occurrence goes back to
-- 'planned' with its expected_amount active again.
--
-- Deliberately NOT gated on monthly_budget_periods.status the way
-- revert_planned_item_occurrence is -- that gate exists because reverting
-- deletes financial history; detaching lineage while keeping the
-- transaction destroys nothing, same risk profile as
-- unmatch_planned_item_occurrence (also ungated).

create or replace function public.unlink_planned_item_occurrence_transaction(p_occurrence_id uuid)
returns public.planned_item_occurrences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
    v_transaction_id uuid;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can unlink a planned item occurrence''s transaction';
    end if;

    if v_occurrence.status <> 'confirmed' then
        raise exception 'Occurrence % is %, not confirmed -- use unmatch_planned_item_occurrence for a matched occurrence instead', p_occurrence_id, v_occurrence.status;
    end if;

    select id into v_transaction_id
      from public.transactions
     where planned_item_occurrence_id = p_occurrence_id
       and planned_item_occurrence_destination_id is null
       and planned_item_transaction_role = 'plain_expense'
     for update;

    if v_transaction_id is not null then
        update public.transactions
           set planned_item_occurrence_id = null,
               planned_item_occurrence_destination_id = null,
               planned_item_transaction_role = null
         where id = v_transaction_id;
    end if;

    update public.planned_item_occurrences
       set status = 'planned',
           confirmed_at = null,
           confirmed_by = null
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;

revoke all on function public.unlink_planned_item_occurrence_transaction(uuid) from public;
grant execute on function public.unlink_planned_item_occurrence_transaction(uuid) to authenticated;
