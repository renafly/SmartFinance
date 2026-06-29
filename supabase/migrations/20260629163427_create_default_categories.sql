-- ============================================================
-- Create Default Categories Function
-- ============================================================

create or replace function public.create_default_categories(
    p_household_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

    insert into public.categories (
        household_id,
        name,
        type,
        icon,
        color,
        is_default
    )
    values

    -- Income
    (p_household_id, 'Salary', 'income', 'wallet', '#4CAF50', true),
    (p_household_id, 'Bonus', 'income', 'gift', '#8BC34A', true),
    (p_household_id, 'Investments', 'income', 'trending-up', '#009688', true),
    (p_household_id, 'Other Income', 'income', 'plus-circle', '#2196F3', true),

    -- Expenses
    (p_household_id, 'Groceries', 'expense', 'shopping-cart', '#FF9800', true),
    (p_household_id, 'Restaurants', 'expense', 'utensils', '#F44336', true),
    (p_household_id, 'Transport', 'expense', 'car', '#3F51B5', true),
    (p_household_id, 'Fuel', 'expense', 'fuel', '#795548', true),
    (p_household_id, 'Rent', 'expense', 'home', '#9C27B0', true),
    (p_household_id, 'Utilities', 'expense', 'zap', '#FFC107', true),
    (p_household_id, 'Shopping', 'expense', 'shopping-bag', '#E91E63', true),
    (p_household_id, 'Healthcare', 'expense', 'heart-pulse', '#F06292', true),
    (p_household_id, 'Entertainment', 'expense', 'film', '#673AB7', true),
    (p_household_id, 'Education', 'expense', 'book-open', '#00BCD4', true),
    (p_household_id, 'Travel', 'expense', 'plane', '#607D8B', true),
    (p_household_id, 'Savings', 'expense', 'piggy-bank', '#4CAF50', true),
    (p_household_id, 'Other Expenses', 'expense', 'circle', '#9E9E9E', true);

end;
$$;