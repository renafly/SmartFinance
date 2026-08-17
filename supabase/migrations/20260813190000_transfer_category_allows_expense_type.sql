-- ============================================================
-- Allow a transfer's category to be an expense-type category too
-- ============================================================
-- `update_completed_transfer` previously only accepted a `category_type =
-- 'account'` category (the narrower "which external context does this
-- internal transfer relate to" tag), matching `create_transfer`'s own
-- validation for brand-new manual transfers. Monthly Budget rule
-- allocations (see 20260813180000_budget_rule_allocation_category.sql) can
-- now tag a transfer with a normal *expense*-type category instead (e.g.
-- "Investments", "Savings > PPR") so it participates in category-based Wage
-- Flow reporting the same way a manually-entered expense would.
--
-- Without this change, opening a Monthly-Budget-generated transfer in the
-- Transactions screen and saving it (even untouched) would fail outright:
-- `update_completed_transfer` re-validates and unconditionally overwrites
-- `category_id` on every save, and would reject the already-assigned
-- expense-type category with "Transfer category must be an account
-- category in this household."
--
-- This intentionally only touches *editing an already-completed* transfer.
-- `create_transfer` (brand-new manual transfers) is untouched -- it still
-- only accepts 'account'-type categories, preserving its existing behavior
-- exactly, since nothing in this feature creates a *new* manual transfer.
create or replace function public.update_completed_transfer(
  p_transfer_group_id uuid,
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount numeric,
  p_title text,
  p_notes text default null,
  p_transaction_date timestamptz default now(),
  p_category_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_household_id uuid;
  v_row_count integer;
begin
  if p_amount <= 0 then raise exception 'Transfer amount must be greater than zero'; end if;
  if p_source_account_id = p_destination_account_id then raise exception 'Source and destination accounts must be different'; end if;
  if nullif(btrim(p_title), '') is null then raise exception 'Transfer title is required'; end if;

  perform 1 from public.transactions t
  where t.transfer_group_id = p_transfer_group_id
  order by t.id
  for update;

  select min(t.household_id::text)::uuid, count(*) into v_household_id, v_row_count
  from public.transactions t
  where t.transfer_group_id = p_transfer_group_id;

  if v_row_count <> 2
    or (select count(*) from public.transactions t where t.transfer_group_id = p_transfer_group_id and t.type = 'expense') <> 1
    or (select count(*) from public.transactions t where t.transfer_group_id = p_transfer_group_id and t.type = 'income') <> 1
  then raise exception 'Transfer group is malformed or unavailable'; end if;

  if not public.is_household_member(v_household_id, (select auth.uid())) then raise exception 'Not authorized for this household'; end if;
  if (select count(*) from public.accounts a where a.id in (p_source_account_id, p_destination_account_id) and a.household_id = v_household_id) <> 2
  then raise exception 'Transfer accounts must belong to the transfer household'; end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories c
     where c.id = p_category_id
       and c.household_id = v_household_id
       and c.type in ('account', 'expense')
  ) then raise exception 'Transfer category must be an account or expense category in this household'; end if;

  update public.transactions t
  set account_id = case when t.type = 'expense' then p_source_account_id else p_destination_account_id end,
      category_id = p_category_id,
      amount = p_amount,
      title = btrim(p_title),
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      transaction_date = p_transaction_date
  where t.transfer_group_id = p_transfer_group_id;

  if not found then raise exception 'Transfer group is unavailable'; end if;
  return p_transfer_group_id;
end;
$$;
