-- ============================================================
-- Recurring movement execution automation
-- ============================================================
-- The contract migration owns the tables, policies, types, and indexes.

create or replace function public.next_recurring_occurrence(
  p_date date,
  p_frequency public.recurring_frequency,
  p_excluded_months smallint[] default '{}'
)
returns date
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_next date;
begin
  case p_frequency
    when 'daily' then return p_date + 1;
    when 'weekly' then return p_date + 7;
    when 'yearly' then return (p_date + interval '1 year')::date;
    when 'monthly' then return (p_date + interval '1 month')::date;
    when 'custom' then
      v_next := (p_date + interval '1 month')::date;

      while extract(month from v_next)::smallint = any(coalesce(p_excluded_months, '{}')) loop
        v_next := (v_next + interval '1 month')::date;
      end loop;

      return v_next;
    else
      raise exception 'Unsupported recurring frequency: %', p_frequency;
  end case;
end;
$$;

create or replace function public.execute_due_recurring_movements(
  p_as_of_date date default timezone('Europe/Lisbon', now())::date
)
returns table(completed_count integer, skipped_count integer, failed_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rule public.recurring_transactions%rowtype;
  v_execution_id uuid;
  v_execution_status public.recurring_execution_status;
  v_destination_account_id uuid;
  v_transfer_group_id uuid;
  v_source_transaction_id uuid;
  v_destination_transaction_id uuid;
  v_source_balance numeric(14,2);
  v_scheduled_at timestamptz;
  v_next_run date;
begin
  completed_count := 0;
  skipped_count := 0;
  failed_count := 0;

  <<due_rules>>
  loop
    select rt.*
    into v_rule
    from public.recurring_transactions rt
    where rt.is_active
      and rt.next_run <= p_as_of_date
    order by rt.next_run, rt.created_at, rt.id
    limit 1
    for update skip locked;

    exit when not found;
    insert into public.recurring_run_executions (
      recurring_transaction_id,
      scheduled_for,
      status
    )
    values (v_rule.id, v_rule.next_run, 'pending')
    on conflict (recurring_transaction_id, scheduled_for) do nothing
    returning id into v_execution_id;

    if v_execution_id is null then
      select id, status
      into v_execution_id, v_execution_status
      from public.recurring_run_executions
      where recurring_transaction_id = v_rule.id
        and scheduled_for = v_rule.next_run
      for update;

      if v_execution_status in ('completed', 'skipped') then
        continue;
      end if;

      update public.recurring_run_executions
      set status = 'pending', skip_reason = null, error_message = null,
          transaction_ids = '{}', started_at = now(), finished_at = null
      where id = v_execution_id;
    end if;

    v_scheduled_at := v_rule.next_run::timestamp at time zone 'Europe/Lisbon';
    v_next_run := public.next_recurring_occurrence(
      v_rule.next_run,
      v_rule.frequency,
      v_rule.excluded_months
    );

    begin
      select a.initial_balance
      into v_source_balance
      from public.accounts a
      where a.id = v_rule.account_id
        and a.household_id = v_rule.household_id
        and not a.is_archived
      for update;

      if not found then
        update public.recurring_run_executions
        set status = 'skipped', skip_reason = 'source_account_unavailable', finished_at = now()
        where id = v_execution_id;

        update public.recurring_transactions
        set next_run = v_next_run, last_run = v_rule.next_run
        where id = v_rule.id;

        skipped_count := skipped_count + 1;
        continue;
      end if;

      if v_rule.rule_kind = 'transfer' then
        if v_rule.destination_pot_id is not null then
          select a.id
          into v_destination_account_id
          from public.saving_pot_accounts spa
          join public.accounts a on a.id = spa.account_id
          where spa.pot_id = v_rule.destination_pot_id
            and a.household_id = v_rule.household_id
            and not a.is_archived
          order by a.created_at, a.id
          limit 1;
        else
          v_destination_account_id := v_rule.destination_account_id;
        end if;

        if v_destination_account_id is null
          or v_destination_account_id = v_rule.account_id
          or not exists (
            select 1
            from public.accounts a
            where a.id = v_destination_account_id
              and a.household_id = v_rule.household_id
              and not a.is_archived
          ) then
          update public.recurring_run_executions
          set status = 'skipped', skip_reason = 'destination_account_unavailable', finished_at = now()
          where id = v_execution_id;

          update public.recurring_transactions
          set next_run = v_next_run, last_run = v_rule.next_run
          where id = v_rule.id;

          skipped_count := skipped_count + 1;
          continue;
        end if;
      end if;

      if v_rule.rule_kind = 'transfer' or v_rule.type = 'expense' then
        select a.initial_balance + coalesce(sum(
          case when t.type = 'income' then t.amount else -t.amount end
        ), 0)
        into v_source_balance
        from public.accounts a
        left join public.transactions t on t.account_id = a.id
        where a.id = v_rule.account_id
        group by a.id, a.initial_balance;

        if v_source_balance < v_rule.amount then
          update public.recurring_run_executions
          set status = 'skipped', skip_reason = 'insufficient_funds', finished_at = now()
          where id = v_execution_id;

          update public.recurring_transactions
          set next_run = v_next_run, last_run = v_rule.next_run
          where id = v_rule.id;

          skipped_count := skipped_count + 1;
          continue;
        end if;
      end if;

      if v_rule.rule_kind = 'transfer' then
        v_transfer_group_id := gen_random_uuid();

        insert into public.transactions (
          household_id, account_id, category_id, transfer_group_id,
          recurring_execution_id, title, notes, amount, type,
          transaction_date, created_by
        )
        values (
          v_rule.household_id, v_rule.account_id, v_rule.category_id, v_transfer_group_id,
          v_execution_id, v_rule.title, v_rule.notes, v_rule.amount, 'expense',
          v_scheduled_at, v_rule.created_by
        )
        returning id into v_source_transaction_id;

        insert into public.transactions (
          household_id, account_id, category_id, transfer_group_id, pot_id,
          recurring_execution_id, title, notes, amount, type,
          transaction_date, created_by
        )
        values (
          v_rule.household_id, v_destination_account_id, v_rule.category_id,
          v_transfer_group_id, v_rule.destination_pot_id, v_execution_id,
          v_rule.title, v_rule.notes, v_rule.amount, 'income',
          v_scheduled_at, v_rule.created_by
        )
        returning id into v_destination_transaction_id;

        update public.recurring_run_executions
        set status = 'completed', transaction_ids = array[v_source_transaction_id, v_destination_transaction_id],
            finished_at = now()
        where id = v_execution_id;
      else
        insert into public.transactions (
          household_id, account_id, category_id, pot_id, recurring_execution_id,
          title, notes, amount, type, transaction_date, created_by
        )
        values (
          v_rule.household_id, v_rule.account_id, v_rule.category_id, v_rule.pot_id,
          v_execution_id, v_rule.title, v_rule.notes, v_rule.amount, v_rule.type,
          v_scheduled_at, v_rule.created_by
        )
        returning id into v_source_transaction_id;

        update public.recurring_run_executions
        set status = 'completed', transaction_ids = array[v_source_transaction_id], finished_at = now()
        where id = v_execution_id;
      end if;

      update public.recurring_transactions
      set next_run = v_next_run, last_run = v_rule.next_run
      where id = v_rule.id;

      completed_count := completed_count + 1;
    exception when others then
      update public.recurring_run_executions
      set status = 'failed', error_message = left(sqlerrm, 1000), finished_at = now()
      where id = v_execution_id;

      -- A malformed rule must not block every later scheduled movement.
      update public.recurring_transactions
      set next_run = v_next_run, last_run = v_rule.next_run
      where id = v_rule.id;

      failed_count := failed_count + 1;
    end;
  end loop;

  return next;
end;
$$;

revoke all on table public.recurring_run_executions from anon;
revoke all on function public.next_recurring_occurrence(date, public.recurring_frequency, smallint[]) from public;
revoke all on function public.execute_due_recurring_movements(date) from public;

grant select on table public.recurring_run_executions to authenticated;
grant execute on function public.next_recurring_occurrence(date, public.recurring_frequency, smallint[]) to authenticated;
grant execute on function public.execute_due_recurring_movements(date) to service_role;

comment on function public.execute_due_recurring_movements(date) is
  'Service-role-only recurring scheduler. Called by the protected execute-recurring-movements Edge Function.';
