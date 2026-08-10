-- Regression test for scheduler inserts that omit household_id.
-- Run against a migrated local database with at least one recurring rule.

begin;

do $$
declare
    v_rule public.recurring_transactions%rowtype;
    v_execution_household_id uuid;
begin
    select *
    into v_rule
    from public.recurring_transactions
    order by created_at, id
    limit 1;

    if not found then
        raise exception 'Test fixture requires at least one recurring transaction';
    end if;

    insert into public.recurring_run_executions (
        recurring_transaction_id,
        scheduled_for,
        status
    )
    values (
        v_rule.id,
        v_rule.next_run + 10000,
        'pending'
    )
    returning household_id into v_execution_household_id;

    if v_execution_household_id is distinct from v_rule.household_id then
        raise exception 'Execution household was not derived from its recurring rule';
    end if;
end;
$$;

rollback;
