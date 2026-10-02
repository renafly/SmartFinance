-- ============================================================
-- Household Member Management RPCs
-- ============================================================

-- Transfer household ownership to another member
create or replace function public.transfer_household_ownership(
    p_household_id uuid,
    p_new_owner_id uuid
)
returns table (
    success boolean,
    message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_current_user_id uuid := auth.uid();
    v_current_owner_id uuid;
    v_new_owner_exists boolean;
    v_new_owner_accepted boolean;
begin
    -- Validate current user is authenticated
    if v_current_user_id is null then
        return query select false, 'You must be authenticated.'::text;
        return;
    end if;

    -- Get current owner
    select owner_id into v_current_owner_id
    from public.households
    where id = p_household_id;

    if v_current_owner_id is null then
        return query select false, 'Household not found.'::text;
        return;
    end if;

    -- Verify caller is the owner
    if v_current_owner_id != v_current_user_id then
        return query select false, 'Only the household owner can transfer ownership.'::text;
        return;
    end if;

    -- Prevent transferring to self
    if p_new_owner_id = v_current_user_id then
        return query select false, 'Cannot transfer ownership to yourself.'::text;
        return;
    end if;

    -- Verify new owner is an accepted member
    select exists(
        select 1 from public.household_members
        where household_id = p_household_id
          and user_id = p_new_owner_id
          and status = 'accepted'
    ) into v_new_owner_exists;

    if not v_new_owner_exists then
        return query select false, 'New owner must be an accepted member of the household.'::text;
        return;
    end if;

    -- Update household owner
    update public.households
    set owner_id = p_new_owner_id, updated_at = now()
    where id = p_household_id;

    -- Promote new owner to 'owner' role
    update public.household_members
    set role = 'owner'
    where household_id = p_household_id and user_id = p_new_owner_id;

    -- Demote current owner to 'admin'
    update public.household_members
    set role = 'admin'
    where household_id = p_household_id and user_id = v_current_user_id;

    return query select true, 'Ownership transferred successfully.'::text;
end;
$$;

-- Remove a household member
create or replace function public.remove_household_member(
    p_household_id uuid,
    p_user_id_to_remove uuid
)
returns table (
    success boolean,
    message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_current_user_id uuid := auth.uid();
    v_is_admin boolean;
    v_target_is_owner boolean;
    v_remaining_count integer;
begin
    -- Validate current user is authenticated
    if v_current_user_id is null then
        return query select false, 'You must be authenticated.'::text;
        return;
    end if;

    -- Verify household exists
    if not exists(select 1 from public.households where id = p_household_id) then
        return query select false, 'Household not found.'::text;
        return;
    end if;

    -- Check if current user is admin or owner
    select public.is_household_admin(p_household_id, v_current_user_id)
    into v_is_admin;

    if not v_is_admin then
        return query select false, 'Only household admins or owners can remove members.'::text;
        return;
    end if;

    -- Prevent self-removal via this RPC (use leave_household instead)
    if p_user_id_to_remove = v_current_user_id then
        return query select false, 'Use leave_household to remove yourself.'::text;
        return;
    end if;

    -- Check if target user is the owner
    select role = 'owner'
    into v_target_is_owner
    from public.household_members
    where household_id = p_household_id and user_id = p_user_id_to_remove;

    if v_target_is_owner then
        return query select false, 'Cannot remove the household owner. Transfer ownership first.'::text;
        return;
    end if;

    -- Count remaining members (to prevent total removal)
    select count(*)
    into v_remaining_count
    from public.household_members
    where household_id = p_household_id and status = 'accepted' and user_id != p_user_id_to_remove;

    if v_remaining_count = 0 then
        return query select false, 'Cannot remove the last member of the household.'::text;
        return;
    end if;

    -- Remove the member
    delete from public.household_members
    where household_id = p_household_id and user_id = p_user_id_to_remove;

    return query select true, 'Member removed successfully.'::text;
end;
$$;

-- Member leaves household
create or replace function public.leave_household(p_household_id uuid)
returns table (
    success boolean,
    message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_current_user_id uuid := auth.uid();
    v_user_is_owner boolean;
    v_remaining_count integer;
    v_default_household uuid;
begin
    -- Validate current user is authenticated
    if v_current_user_id is null then
        return query select false, 'You must be authenticated.'::text;
        return;
    end if;

    -- Verify household exists
    if not exists(select 1 from public.households where id = p_household_id) then
        return query select false, 'Household not found.'::text;
        return;
    end if;

    -- Verify user is a member
    if not exists(
        select 1 from public.household_members
        where household_id = p_household_id and user_id = v_current_user_id
    ) then
        return query select false, 'You are not a member of this household.'::text;
        return;
    end if;

    -- Check if user is the owner
    select role = 'owner'
    into v_user_is_owner
    from public.household_members
    where household_id = p_household_id and user_id = v_current_user_id;

    if v_user_is_owner then
        -- Count other members to see if someone else can take over
        select count(*)
        into v_remaining_count
        from public.household_members
        where household_id = p_household_id and user_id != v_current_user_id and status = 'accepted';

        if v_remaining_count = 0 then
            return query select false, 'You cannot leave as the sole owner. Transfer ownership first.'::text;
            return;
        end if;
    end if;

    -- Clear default_household_id if this is their default
    select default_household_id into v_default_household
    from public.profiles
    where id = v_current_user_id;

    if v_default_household = p_household_id then
        update public.profiles
        set default_household_id = null
        where id = v_current_user_id;
    end if;

    -- Remove the member
    delete from public.household_members
    where household_id = p_household_id and user_id = v_current_user_id;

    return query select true, 'Left household successfully.'::text;
end;
$$;
