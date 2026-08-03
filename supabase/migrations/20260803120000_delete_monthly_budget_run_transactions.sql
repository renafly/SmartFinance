create or replace function public.delete_monthly_budget_run_transactions(p_run_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.monthly_budget_runs%rowtype;
  v_deleted_count integer;
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
    raise exception 'Only household admins can delete monthly budget run transactions';
  end if;

  delete from public.transactions
   where monthly_budget_run_id = v_run.id;

  get diagnostics v_deleted_count = row_count;

  if v_run.status = 'confirmed' then
    update public.monthly_budget_runs
       set status = 'draft',
           updated_at = now()
     where id = v_run.id;
  end if;

  return v_deleted_count;
end;
$$;

revoke all on function public.delete_monthly_budget_run_transactions(uuid) from public;
grant execute on function public.delete_monthly_budget_run_transactions(uuid) to authenticated;
