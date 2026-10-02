-- ============================================================
-- Household deletion and soft-delete support
-- ============================================================

alter table public.households
add column if not exists deleted_at timestamptz;

create index if not exists idx_households_deleted_at
on public.households (deleted_at);

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
        join public.households h
            on h.id = hm.household_id
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
          and hm.status = 'accepted'
          and h.deleted_at is null
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
        join public.households h
            on h.id = hm.household_id
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
          and hm.status = 'accepted'
          and hm.role in ('owner', 'admin')
          and h.deleted_at is null
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
        join public.households h
            on h.id = hm.household_id
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
          and hm.status = 'accepted'
          and hm.role = 'owner'
          and h.deleted_at is null
    );
$$;

create or replace function public.delete_household(
    p_household_id uuid
)
returns table (
    success boolean,
    message text,
    deleted_hard boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_current_user_id uuid := auth.uid();
    v_owner_id uuid;
    v_deleted_at timestamptz;
    v_transaction_count integer := 0;
begin
    if v_current_user_id is null then
        return query select false, 'You must be authenticated.'::text, false;
        return;
    end if;

    select owner_id, deleted_at
    into v_owner_id, v_deleted_at
    from public.households
    where id = p_household_id;

    if v_owner_id is null then
        return query select false, 'Household not found.'::text, false;
        return;
    end if;

    if v_owner_id != v_current_user_id then
        return query select false, 'Only the household owner can delete the household.'::text, false;
        return;
    end if;

    if v_deleted_at is not null then
        return query select false, 'Household is already deleted.'::text, false;
        return;
    end if;

    select count(*)
    into v_transaction_count
    from public.transactions
    where household_id = p_household_id;

    if v_transaction_count = 0 then
        delete from public.households
        where id = p_household_id;

        return query select true, 'Household deleted permanently.'::text, true;
        return;
    end if;

    update public.households
    set deleted_at = now(),
        updated_at = now()
    where id = p_household_id;

    update public.profiles
    set default_household_id = null
    where default_household_id = p_household_id;

    return query select true, 'Household archived because it already has transactions.'::text, false;
end;
$$;

create or replace function public.get_household_invitation_details(
    p_token text
)
returns table (
    household_id uuid,
    household_name text,
    owner_name text,
    owner_email text,
    role public.household_role,
    expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_invite public.household_invitations%rowtype;
begin
    select *
    into v_invite
    from public.household_invitations hi
    where hi.token = p_token
      and hi.accepted_at is null
      and (hi.expires_at is null or hi.expires_at > now())
    limit 1;

    if not found then
        return;
    end if;

    return query
    select
        h.id as household_id,
        h.name as household_name,
        coalesce(p.full_name, p.email, 'Household owner') as owner_name,
        p.email as owner_email,
        v_invite.role,
        v_invite.expires_at
    from public.households h
    left join public.profiles p
      on p.id = h.owner_id
    where h.id = v_invite.household_id
      and h.deleted_at is null;
end;
$$;

revoke all on function public.get_household_invitation_details(text) from public;
grant execute on function public.get_household_invitation_details(text) to anon, authenticated;
