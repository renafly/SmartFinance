-- ============================================================
-- Monthly Budget refactor: "Save" / "Reset" only touch income + movements
-- ============================================================
-- The simplified Monthly Budget screen (Income -> Allocate -> Preview ->
-- Save) posts exactly two kinds of planned occurrence:
--   * income    -- planned_item_occurrences.source_account_id is null
--   * movements -- an outflow with at least one occurrence destination
--                  (transfer_source / transfer_destination legs)
-- Plain recurring expenses (source account set, zero occurrence
-- destinations) are managed and paid one by one on Category Budgets
-- (confirm_planned_item_occurrence) and are no longer posted by the
-- month-wide save -- the client stops sending their legs to
-- confirm_planned_item_month (see toTransferPlanPayload in
-- planned-items-confirm.service.ts), so that function needs no change.
--
-- revert_monthly_budget_month, however, used to delete EVERY transaction
-- generated for any occurrence of the month and reset EVERY occurrence
-- back to 'planned' -- which would now also wipe out recurring expenses
-- the user marked as paid on Category Budgets. This redefinition scopes it
-- to the same set the save posts: plain-expense occurrences, and their
-- 'plain_expense' transactions, are left completely alone.
--
-- Everything else is unchanged from 20260901002300: admin check, the
-- Replenishment guard (now counted over the same scoped set), 'matched'
-- occurrences untouched, period reopened, single atomic call.

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
    v_blocked_count integer;
    v_occurrence_ids uuid[];
begin
    if not public.is_household_admin(p_household_id, auth.uid()) then
        raise exception 'Only household admins can revert a monthly budget month';
    end if;

    -- Income occurrences + movement occurrences (at least one destination).
    select coalesce(array_agg(poc.id), '{}'::uuid[]) into v_occurrence_ids
      from public.planned_item_occurrences poc
     where poc.household_id = p_household_id
       and poc.month = p_month
       and (
             poc.source_account_id is null
             or exists (
                 select 1
                   from public.planned_item_occurrence_destinations pod
                  where pod.occurrence_id = poc.id
             )
           );

    select count(*) into v_blocked_count
      from public.transactions t
      join public.replenishment_run_transactions rrt on rrt.transaction_id = t.id
     where t.household_id = p_household_id
       and t.planned_item_occurrence_id = any(v_occurrence_ids);

    if v_blocked_count > 0 then
        raise exception 'Cannot reset Monthly Budget for %: % transaction(s) generated for this month are referenced by a Replenishment (Reposição) run. Remove them from that run first, then try again.',
            to_char(p_month, 'YYYY-MM'), v_blocked_count;
    end if;

    delete from public.transactions
     where household_id = p_household_id
       and planned_item_occurrence_id = any(v_occurrence_ids);

    update public.planned_item_occurrences
       set status = 'planned',
           confirmed_at = null,
           confirmed_by = null,
           is_overridden = false
     where household_id = p_household_id
       and month = p_month
       and status in ('confirmed', 'skipped', 'cancelled')
       and id = any(v_occurrence_ids);

    update public.monthly_budget_periods
       set status = 'open',
           confirmed_at = null,
           confirmed_by = null
     where household_id = p_household_id
       and month = p_month
     returning * into v_period;

    if v_period.id is null then
        select * into v_period
          from public.monthly_budget_periods
         where household_id = p_household_id
           and month = p_month;
    end if;

    return v_period;
end;
$$;

comment on function public.revert_monthly_budget_month(uuid, date) is
  'Undoes a Monthly Budget save for this household+month: deletes the income and movement (transfer) transactions it generated, resets those occurrences back to planned, and reopens the monthly_budget_periods row. Plain recurring expenses paid on Category Budgets and matched/hand-entered transactions are never touched. See 20260929100000_monthly_budget_save_scope.sql.';

revoke all on function public.revert_monthly_budget_month(uuid, date) from public;
grant execute on function public.revert_monthly_budget_month(uuid, date) to authenticated;
