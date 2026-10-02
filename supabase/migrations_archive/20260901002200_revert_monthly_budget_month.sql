-- ============================================================
-- Bulk revert of a whole Monthly Budget month
-- ============================================================
-- revert_planned_item_occurrence (20260901001800_planned_item_rpcs.sql)
-- only ever reverts ONE occurrence at a time, and only while its month is
-- still 'open' -- there was no way to undo an entire confirmed month in
-- one action; a household that confirmed the wrong month, or wants to
-- redo it, had no path back except deleting each generated transaction by
-- hand and separately reverting each occurrence one by one.
--
-- revert_monthly_budget_month deletes every transaction
-- confirm_planned_item_month generated for (p_household_id, p_month),
-- resets every 'confirmed' occurrence for that month back to 'planned'
-- (mirroring revert_planned_item_occurrence's own status reset), and
-- reopens the monthly_budget_periods row so the month can be edited and
-- re-confirmed from scratch.
--
-- Safe by construction, not by a status check: every transaction this
-- deletes carries transactions.planned_item_occurrence_id, a column only
-- confirm_planned_item_month ever sets (see that function's own comment
-- block) -- a transaction the household entered by hand, or matched to an
-- is_estimate occurrence via match_planned_item_occurrence, never has it
-- set (matching is a separate planned_item_matches row; the real
-- transaction it points at is never touched by planned-items code, see
-- unmatch_planned_item_occurrence's own comment). 'matched'/'skipped'/
-- 'cancelled' occurrences are therefore left exactly as they are -- only
-- 'confirmed' ones (the only status that can ever have generated
-- transactions, since skip/cancel both require status = 'planned') are
-- reset. Unlike revert_planned_item_occurrence, this does not require the
-- month to already be 'open' -- reopening a 'committed'/'closed' month is
-- the entire point of calling it -- and it is a safe no-op when there is
-- nothing to revert (an 'open' month with no confirmed occurrences).

create or replace function public.revert_monthly_budget_month(
    p_household_id uuid,
    p_month date
)
returns public.monthly_budget_periods
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_period public.monthly_budget_periods%rowtype;
begin
    if not public.is_household_admin(p_household_id, auth.uid()) then
        raise exception 'Only household admins can revert a monthly budget month';
    end if;

    delete from public.transactions
     where household_id = p_household_id
       and planned_item_occurrence_id in (
             select id
               from public.planned_item_occurrences
              where household_id = p_household_id
                and month = p_month
           );

    update public.planned_item_occurrences
       set status = 'planned',
           confirmed_at = null,
           confirmed_by = null
     where household_id = p_household_id
       and month = p_month
       and status = 'confirmed';

    update public.monthly_budget_periods
       set status = 'open',
           confirmed_at = null,
           confirmed_by = null
     where household_id = p_household_id
       and month = p_month
     returning * into v_period;

    if v_period.id is null then
        -- Nothing to reopen -- the month was never committed in the
        -- first place. Report its current (or default 'open', absent)
        -- state rather than erroring, same "no-op is fine" spirit as
        -- confirm_planned_item_month's own already-committed handling.
        select * into v_period
          from public.monthly_budget_periods
         where household_id = p_household_id
           and month = p_month;
    end if;

    return v_period;
end;
$$;

comment on function public.revert_monthly_budget_month(uuid, date) is
  'Deletes every transaction confirm_planned_item_month generated for this household+month, resets their occurrences back to planned, and reopens the monthly_budget_periods row. Never touches a hand-entered or matched transaction -- see the migration file''s own comment for why that is safe by construction.';

revoke all on function public.revert_monthly_budget_month(uuid, date) from public;
grant execute on function public.revert_monthly_budget_month(uuid, date) to authenticated;
