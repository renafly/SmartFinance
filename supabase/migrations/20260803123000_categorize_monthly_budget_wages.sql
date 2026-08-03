-- Categorize income created by monthly budget runs as Wages.

create or replace function public.create_default_categories(
    p_household_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    insert into public.categories (household_id, name, type, icon, color, is_default)
    values
    -- Income
    (p_household_id, 'Salary',         'income',  'wallet',        '#4CAF50', true),
    (p_household_id, 'Wages',          'income',  'wallet',        '#16A34A', true),
    (p_household_id, 'Bonus',          'income',  'gift',          '#8BC34A', true),
    (p_household_id, 'Investments',    'income',  'trending-up',   '#009688', true),
    (p_household_id, 'Other Income',   'income',  'plus-circle',   '#2196F3', true),
    -- Expenses
    (p_household_id, 'Groceries',      'expense', 'shopping-cart', '#FF9800', true),
    (p_household_id, 'Restaurants',    'expense', 'utensils',      '#F44336', true),
    (p_household_id, 'Transport',      'expense', 'car',           '#3F51B5', true),
    (p_household_id, 'Fuel',           'expense', 'fuel',          '#795548', true),
    (p_household_id, 'Rent',           'expense', 'home',          '#9C27B0', true),
    (p_household_id, 'Utilities',      'expense', 'zap',           '#FFC107', true),
    (p_household_id, 'Shopping',       'expense', 'shopping-bag',  '#E91E63', true),
    (p_household_id, 'Healthcare',     'expense', 'heart-pulse',   '#F06292', true),
    (p_household_id, 'Entertainment',  'expense', 'film',          '#673AB7', true),
    (p_household_id, 'Education',      'expense', 'book-open',     '#00BCD4', true),
    (p_household_id, 'Travel',         'expense', 'plane',         '#607D8B', true),
    (p_household_id, 'Savings',        'expense', 'piggy-bank',    '#4CAF50', true),
    (p_household_id, 'Other Expenses', 'expense', 'circle',        '#9E9E9E', true)
    on conflict (household_id, type, name) do nothing;
end;
$$;

-- Existing households need the category immediately; new households receive it
-- through create_default_categories.
insert into public.categories (household_id, name, type, icon, color, is_default)
select households.id, 'Wages', 'income', 'wallet', '#16A34A', true
from public.households
on conflict (household_id, type, name) do nothing;

create or replace function public.categorize_monthly_budget_wage()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    if new.category_id is null
       and new.monthly_budget_run_id is not null
       and new.budget_section = 'income'
       and new.type = 'income'
       and new.transfer_group_id is null
       and new.title like 'Monthly wage:%' then
        select category.id
          into new.category_id
          from public.categories as category
         where category.household_id = new.household_id
           and category.type = 'income'
           and category.name = 'Wages'
         limit 1;
    end if;

    return new;
end;
$$;

drop trigger if exists categorize_monthly_budget_wage_on_insert on public.transactions;
create trigger categorize_monthly_budget_wage_on_insert
before insert on public.transactions
for each row
execute function public.categorize_monthly_budget_wage();

-- Apply the category to wages created by monthly runs before this migration.
update public.transactions as wage_transaction
   set category_id = category.id
  from public.categories as category
 where wage_transaction.category_id is null
   and wage_transaction.monthly_budget_run_id is not null
   and wage_transaction.budget_section = 'income'
   and wage_transaction.type = 'income'
   and wage_transaction.transfer_group_id is null
   and wage_transaction.title like 'Monthly wage:%'
   and category.household_id = wage_transaction.household_id
   and category.type = 'income'
   and category.name = 'Wages';
