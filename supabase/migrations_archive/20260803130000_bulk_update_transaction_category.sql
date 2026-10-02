create or replace function public.bulk_update_transaction_category(
  p_household_id uuid,
  p_transaction_ids uuid[],
  p_category_id uuid default null
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_requested_count integer;
  v_visible_count integer;
  v_type_count integer;
  v_transaction_type public.transaction_type;
  v_category_type public.category_type;
  v_updated_count integer;
begin
  if p_household_id is null then
    raise exception using errcode = '22023', message = 'Household is required.';
  end if;

  if not public.is_household_member(p_household_id, (select auth.uid())) then
    raise exception using errcode = '42501', message = 'Household membership is required.';
  end if;

  if p_transaction_ids is null or coalesce(array_length(p_transaction_ids, 1), 0) = 0 then
    raise exception using errcode = '22023', message = 'Select at least one transaction.';
  end if;

  if array_position(p_transaction_ids, null) is not null then
    raise exception using errcode = '22023', message = 'Transaction IDs cannot contain null values.';
  end if;

  select count(distinct transaction_id)::integer
  into v_requested_count
  from unnest(p_transaction_ids) as selected(transaction_id);

  if v_requested_count <> array_length(p_transaction_ids, 1) then
    raise exception using errcode = '22023', message = 'Transaction IDs must be unique.';
  end if;

  select
    count(*)::integer,
    count(distinct t.type)::integer
  into v_visible_count, v_type_count
  from public.transactions t
  where t.household_id = p_household_id
    and t.id = any(p_transaction_ids)
    and t.transfer_group_id is null;

  if v_visible_count <> v_requested_count then
    raise exception using errcode = '22023', message = 'Every selected item must be a non-transfer transaction in this household.';
  end if;

  if v_type_count <> 1 then
    raise exception using errcode = '22023', message = 'Selected transactions must have the same type.';
  end if;

  select t.type
  into v_transaction_type
  from public.transactions t
  where t.household_id = p_household_id
    and t.id = any(p_transaction_ids)
  limit 1;

  if p_category_id is not null then
    select c.type
    into v_category_type
    from public.categories c
    where c.id = p_category_id
      and c.household_id = p_household_id;

    if not found then
      raise exception using errcode = '22023', message = 'Category must belong to this household.';
    end if;

    if v_category_type::text <> v_transaction_type::text then
      raise exception using errcode = '22023', message = 'Category type must match the selected transactions.';
    end if;
  end if;

  update public.transactions
  set category_id = p_category_id
  where household_id = p_household_id
    and id = any(p_transaction_ids)
    and transfer_group_id is null;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

revoke all on function public.bulk_update_transaction_category(uuid, uuid[], uuid) from public;
revoke all on function public.bulk_update_transaction_category(uuid, uuid[], uuid) from anon;
grant execute on function public.bulk_update_transaction_category(uuid, uuid[], uuid) to authenticated;
