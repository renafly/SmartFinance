-- ============================================================
-- Auth Trigger: handle_new_user
-- Seeds profile, household, default accounts and categories on signup.
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
    insert into public.categories (household_id, name, type, icon, color, is_default)
    values
    -- Income
    (p_household_id, 'Salary',        'income',  'wallet',       '#4CAF50', true),
    (p_household_id, 'Bonus',         'income',  'gift',         '#8BC34A', true),
    (p_household_id, 'Investments',   'income',  'trending-up',  '#009688', true),
    (p_household_id, 'Other Income',  'income',  'plus-circle',  '#2196F3', true),
    -- Expenses
    (p_household_id, 'Groceries',     'expense', 'shopping-cart','#FF9800', true),
    (p_household_id, 'Restaurants',   'expense', 'utensils',     '#F44336', true),
    (p_household_id, 'Transport',     'expense', 'car',          '#3F51B5', true),
    (p_household_id, 'Fuel',          'expense', 'fuel',         '#795548', true),
    (p_household_id, 'Rent',          'expense', 'home',         '#9C27B0', true),
    (p_household_id, 'Utilities',     'expense', 'zap',          '#FFC107', true),
    (p_household_id, 'Shopping',      'expense', 'shopping-bag', '#E91E63', true),
    (p_household_id, 'Healthcare',    'expense', 'heart-pulse',  '#F06292', true),
    (p_household_id, 'Entertainment', 'expense', 'film',         '#673AB7', true),
    (p_household_id, 'Education',     'expense', 'book-open',    '#00BCD4', true),
    (p_household_id, 'Travel',        'expense', 'plane',        '#607D8B', true),
    (p_household_id, 'Savings',       'expense', 'piggy-bank',   '#4CAF50', true),
    (p_household_id, 'Other Expenses','expense', 'circle',       '#9E9E9E', true);
end;
$$;

create or replace function public.create_default_accounts(
    p_household_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.accounts (household_id, name, type, currency, initial_balance, icon, color)
    values
        (p_household_id, 'Cash',         'cash', 'EUR'::public.currency_code, 0, 'wallet',   '#4CAF50'),
        (p_household_id, 'Bank Account', 'bank', 'EUR'::public.currency_code, 0, 'landmark', '#2196F3');
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    new_household_id uuid;
begin

    -- Create profile
    insert into public.profiles (id, email, full_name, avatar_url)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );

    -- Create household
    insert into public.households (name, owner_id)
    values (
        concat(coalesce(new.raw_user_meta_data->>'full_name', 'My'), '''s Household'),
        new.id
    )
    returning id into new_household_id;

    -- Add as owner
    insert into public.household_members (household_id, user_id, role, status)
    values (new_household_id, new.id, 'owner', 'accepted');

    -- Set default household
    update public.profiles
    set default_household_id = new_household_id
    where id = new.id;

    -- Seed defaults
    perform public.create_default_accounts(new_household_id);
    perform public.create_default_categories(new_household_id);

    return new;

end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();
