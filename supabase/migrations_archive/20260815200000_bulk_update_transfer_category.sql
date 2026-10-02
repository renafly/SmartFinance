-- ============================================================
-- Bulk category updates for completed transfers
-- ============================================================
-- `bulk_update_transaction_category` only ever touches rows where
-- `transfer_group_id is null`, so it hard-rejects transfers -- and even if
-- it didn't, it requires the category's type to equal the selected rows'
-- literal `type` (income/expense), which doesn't fit a transfer: one leg is
-- typed 'expense' and the other 'income', but a transfer's own category is
-- an 'account' or 'expense' category shared by both legs (see
-- `update_completed_transfer` / 20260813190000_transfer_category_allows_expense_type.sql).
--
-- This adds a parallel bulk RPC for transfers: it takes transfer_group_ids
-- instead of transaction ids, validates each group is a complete, valid
-- transfer pair in the caller's household (same integrity check
-- list_transaction_movements and update_completed_transfer already apply),
-- validates the category against the transfer rule (account or expense
-- type), and then applies it to both legs of every selected group.
--
-- Returns the number of transfer groups updated (not raw rows, since two
-- rows change per group) so the result stays comparable to how many
-- transfers the caller selected in the UI.
create or replace function public.bulk_update_transfer_category(
  p_household_id uuid,
  p_transfer_group_ids uuid[],
  p_category_id uuid default null
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_requested_count integer;
  v_valid_count integer;
  v_category_type public.category_type;
begin
  if p_household_id is null then
    raise exception using errcode = '22023', message = 'Household is required.';
  end if;

  if not public.is_household_member(p_household_id, (select auth.uid())) then
    raise exception using errcode = '42501', message = 'Household membership is required.';
  end if;

  if p_transfer_group_ids is null or coalesce(array_length(p_transfer_group_ids, 1), 0) = 0 then
    raise exception using errcode = '22023', message = 'Select at least one transfer.';
  end if;

  if array_position(p_transfer_group_ids, null) is not null then
    raise exception using errcode = '22023', message = 'Transfer IDs cannot contain null values.';
  end if;

  select count(distinct transfer_group_id)::integer
  into v_requested_count
  from unnest(p_transfer_group_ids) as selected(transfer_group_id);

  if v_requested_count <> array_length(p_transfer_group_ids, 1) then
    raise exception using errcode = '22023', message = 'Transfer IDs must be unique.';
  end if;

  select count(*)::integer
  into v_valid_count
  from (
    select t.transfer_group_id
    from public.transactions t
    where t.household_id = p_household_id
      and t.transfer_group_id = any(p_transfer_group_ids)
    group by t.transfer_group_id
    having count(*) = 2
      and count(*) filter (where t.type = 'expense') = 1
      and count(*) filter (where t.type = 'income') = 1
  ) valid_groups;

  if v_valid_count <> v_requested_count then
    raise exception using errcode = '22023', message = 'Every selected item must be a valid transfer in this household.';
  end if;

  if p_category_id is not null then
    select c.type
    into v_category_type
    from public.categories c
    where c.id = p_category_id
      and c.household_id = p_household_id;

    if not found then
      raise exception using errcode = '22023', message = 'Category must belong to this household.';
    end if;

    if v_category_type::text not in ('account', 'expense') then
      raise exception using errcode = '22023', message = 'Transfer category must be an account or expense category.';
    end if;
  end if;

  update public.transactions
  set category_id = p_category_id
  where household_id = p_household_id
    and transfer_group_id = any(p_transfer_group_ids);

  return v_requested_count;
end;
$$;

revoke all on function public.bulk_update_transfer_category(uuid, uuid[], uuid) from public;
revoke all on function public.bulk_update_transfer_category(uuid, uuid[], uuid) from anon;
grant execute on function public.bulk_update_transfer_category(uuid, uuid[], uuid) to authenticated;

notify pgrst, 'reload schema';
