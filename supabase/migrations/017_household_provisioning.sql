-- ============================================================
-- Household provisioning changes
-- - Remove automatic household/account creation on auth signup
-- - Seed only categories when a household is created
-- - Provide an explicit create_household RPC for the app
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
    (p_household_id, 'Investments',    'income',  'trending-up',  '#009688', true),
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
    (p_household_id, 'Other Expenses','expense', 'circle',       '#9E9E9E', true)
    on conflict (household_id, type, name) do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name, avatar_url)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );

    return new;
end;
$$;

create or replace function public.create_household(
    p_name text
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_household public.households;
begin
    if v_user_id is null then
        raise exception 'Not authenticated';
    end if;

    if p_name is null or btrim(p_name) = '' then
        raise exception 'Household name is required';
    end if;

    insert into public.households (name, owner_id)
    values (btrim(p_name), v_user_id)
    returning * into v_household;

    insert into public.household_members (household_id, user_id, role, status)
    values (v_household.id, v_user_id, 'owner', 'accepted')
    on conflict (household_id, user_id) do update
        set role = excluded.role,
            status = excluded.status;

    update public.profiles
    set default_household_id = v_household.id
    where id = v_user_id;

    return v_household;
end;
$$;

create or replace function public.seed_categories_on_household_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.create_default_categories(new.id);
    return new;
end;
$$;

create trigger seed_categories_on_household_insert
after insert on public.households
for each row
execute function public.seed_categories_on_household_insert();
