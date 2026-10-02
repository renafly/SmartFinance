-- ============================================================
-- Category delete behavior for existing transactions
-- ============================================================
-- When deleting a category, reassign transactions to a same-type
-- fallback category ("Other Income" / "Other Expenses") in the same
-- household when available. If no fallback exists, set category_id to null.

create or replace function public.reassign_transactions_before_category_delete()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    v_fallback_category_id uuid;
begin
    select c.id
      into v_fallback_category_id
      from public.categories c
     where c.household_id = old.household_id
       and c.type = old.type
       and c.id <> old.id
       and (
         (old.type = 'income' and lower(c.name) = 'other income')
         or
         (old.type = 'expense' and lower(c.name) in ('other expenses', 'other expense'))
       )
     order by c.is_default desc, c.sort_order asc, c.created_at asc
     limit 1;

    if v_fallback_category_id is null then
        update public.transactions t
           set category_id = null
         where t.category_id = old.id;
    else
        update public.transactions t
           set category_id = v_fallback_category_id
         where t.category_id = old.id;
    end if;

    return old;
end;
$$;

drop trigger if exists reassign_transactions_before_category_delete
on public.categories;

create trigger reassign_transactions_before_category_delete
before delete on public.categories
for each row
execute function public.reassign_transactions_before_category_delete();
