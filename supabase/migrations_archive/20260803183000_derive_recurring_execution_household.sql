-- Ensure scheduler-created execution rows inherit their rule's household.
-- The scheduler intentionally identifies an occurrence by rule and date; deriving
-- the household here keeps that insert atomic and prevents caller-supplied drift.

create or replace function public.validate_recurring_run_execution_household()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
    v_rule_household_id uuid;
begin
    select rule.household_id
    into v_rule_household_id
    from public.recurring_transactions rule
    where rule.id = new.recurring_transaction_id;

    if not found then
        raise exception 'Recurring execution must reference an existing rule';
    end if;

    if new.household_id is null then
        new.household_id := v_rule_household_id;
    elsif new.household_id <> v_rule_household_id then
        raise exception 'Recurring execution must belong to the rule household';
    end if;

    return new;
end;
$$;

alter function public.validate_recurring_run_execution_household()
    set search_path = public, pg_temp;

