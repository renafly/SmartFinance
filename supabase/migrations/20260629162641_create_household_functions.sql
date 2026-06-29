-- ============================================================
-- Household Permission Functions
-- ============================================================

create or replace function public.is_household_member(
    p_household_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.household_members hm
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
          and hm.status = 'accepted'
    );
$$;

create or replace function public.is_household_admin(
    p_household_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.household_members hm
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
          and hm.status = 'accepted'
          and hm.role in ('owner', 'admin')
    );
$$;

create or replace function public.is_household_owner(
    p_household_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.household_members hm
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
          and hm.status = 'accepted'
          and hm.role = 'owner'
    );
$$;