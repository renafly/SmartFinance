-- ============================================================
-- Update Auth Trigger
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    new_household_id uuid;
begin

    -- ========================================================
    -- Create Profile
    -- ========================================================

    insert into public.profiles (
        id,
        email,
        full_name,
        avatar_url
    )
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );

    -- ========================================================
    -- Create Household
    -- ========================================================

    insert into public.households (
        name,
        owner_id
    )
    values (
        concat(
            coalesce(new.raw_user_meta_data->>'full_name', 'My'),
            '''s Household'
        ),
        new.id
    )
    returning id
    into new_household_id;

    -- ========================================================
    -- Add Owner
    -- ========================================================

    insert into public.household_members (
        household_id,
        user_id,
        role,
        status
    )
    values (
        new_household_id,
        new.id,
        'owner',
        'accepted'
    );

    -- ========================================================
    -- Default Accounts
    -- ========================================================

    perform public.create_default_accounts(
        new_household_id
    );

    -- ========================================================
    -- Default Categories
    -- ========================================================

    perform public.create_default_categories(
        new_household_id
    );

    return new;

end;
$$;