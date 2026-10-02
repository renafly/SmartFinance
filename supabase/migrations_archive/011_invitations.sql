-- ============================================================
-- Invitation Email Logs
-- ============================================================

create table public.invitation_email_logs (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    requested_by uuid not null references public.profiles(id) on delete cascade,
    recipient_email text not null,
    recipient_role public.household_role not null,
    invite_link text not null,
    provider text not null default 'resend',
    provider_message_id text,
    status text not null check (status in ('queued', 'sent', 'failed')),
    error_message text,
    sent_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_invitation_email_logs_household_id on public.invitation_email_logs(household_id);
create index idx_invitation_email_logs_requested_by on public.invitation_email_logs(requested_by);
create index idx_invitation_email_logs_status on public.invitation_email_logs(status);

-- ============================================================
-- Invitation RPCs
-- ============================================================

create or replace function public.list_my_household_invitations()
returns table (
    id uuid,
    household_id uuid,
    household_name text,
    email text,
    role public.household_role,
    token text,
    expires_at timestamptz,
    created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_email text;
begin
    if v_user_id is null then
        raise exception 'You must be authenticated to list invitations.';
    end if;

    select p.email into v_email
    from public.profiles p
    where p.id = v_user_id;

    if v_email is null then
        raise exception 'Profile not found for authenticated user.';
    end if;

    return query
    select
        hi.id,
        hi.household_id,
        h.name as household_name,
        hi.email,
        hi.role,
        hi.token,
        hi.expires_at,
        hi.created_at
    from public.household_invitations hi
    join public.households h on h.id = hi.household_id
    where lower(hi.email) = lower(v_email)
      and hi.accepted_at is null
      and (hi.expires_at is null or hi.expires_at > now())
    order by hi.created_at desc;
end;
$$;

create or replace function public.accept_household_invitation(
    p_token text
)
returns table (
    household_id uuid,
    role public.household_role
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_email text;
    v_invite public.household_invitations%rowtype;
begin
    if v_user_id is null then
        raise exception 'You must be authenticated to accept an invitation.';
    end if;

    select p.email into v_email
    from public.profiles p
    where p.id = v_user_id;

    if v_email is null then
        select coalesce(au.email, au.id::text || '@local.invalid')
        into v_email
        from auth.users au
        where au.id = v_user_id;
    end if;

    if v_email is null then
        raise exception 'Profile/email not found for authenticated user.';
    end if;

    -- Ensure profile row exists (invited users may not have signed up via trigger)
    insert into public.profiles (id, email, full_name, avatar_url)
    select
        au.id,
        coalesce(au.email, au.id::text || '@local.invalid'),
        coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
        au.raw_user_meta_data->>'avatar_url'
    from auth.users au
    where au.id = v_user_id
    on conflict (id) do nothing;

    select hi.* into v_invite
    from public.household_invitations hi
    where hi.token = p_token
      and hi.accepted_at is null
      and (hi.expires_at is null or hi.expires_at > now())
    limit 1
    for update;

    if not found then
        raise exception 'Invitation not found or expired.';
    end if;

    if lower(v_invite.email) <> lower(v_email) then
        raise exception 'This invitation does not belong to your account email.';
    end if;

    insert into public.household_members (
        household_id, user_id, role, status, joined_at
    )
    values (
        v_invite.household_id, v_user_id, v_invite.role, 'accepted', now()
    )
    on conflict on constraint household_members_pkey
    do update set
        role = excluded.role,
        status = 'accepted',
        joined_at = coalesce(public.household_members.joined_at, now());

    update public.household_invitations
    set accepted_at = now()
    where id = v_invite.id;

    return query
    select v_invite.household_id, v_invite.role;
end;
$$;

create or replace function public.decline_household_invitation(
    p_token text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_email text;
    v_deleted integer;
begin
    if v_user_id is null then
        raise exception 'You must be authenticated to decline an invitation.';
    end if;

    select p.email into v_email
    from public.profiles p
    where p.id = v_user_id;

    if v_email is null then
        raise exception 'Profile not found for authenticated user.';
    end if;

    delete from public.household_invitations hi
    where hi.token = p_token
      and hi.accepted_at is null
      and lower(hi.email) = lower(v_email);

    get diagnostics v_deleted = row_count;

    return v_deleted > 0;
end;
$$;

create or replace function public.set_default_household(
    p_household_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        raise exception 'You must be authenticated to set a default household.';
    end if;

    if not exists (
        select 1
        from public.household_members hm
        where hm.user_id = v_user_id
            and hm.household_id = p_household_id
            and hm.status = 'accepted'
    ) then
        raise exception 'You are not an accepted member of this household.';
    end if;

    update public.profiles
    set default_household_id = p_household_id
    where id = v_user_id;

    return p_household_id;
end;
$$;

-- ============================================================
-- RPC Grants
-- ============================================================

revoke all on function public.list_my_household_invitations() from public;
grant execute on function public.list_my_household_invitations() to authenticated;

revoke all on function public.accept_household_invitation(text) from public;
grant execute on function public.accept_household_invitation(text) to authenticated;

revoke all on function public.decline_household_invitation(text) from public;
grant execute on function public.decline_household_invitation(text) to authenticated;

revoke all on function public.set_default_household(uuid) from public;
grant execute on function public.set_default_household(uuid) to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table public.invitation_email_logs enable row level security;

create policy "Admins can view invitation email logs"
on public.invitation_email_logs
for select
using (
    public.is_household_admin(household_id, auth.uid())
);

create policy "Admins can insert invitation email logs"
on public.invitation_email_logs
for insert
with check (
    public.is_household_admin(household_id, auth.uid())
    and requested_by = auth.uid()
);

create policy "Admins can update invitation email logs"
on public.invitation_email_logs
for update
using (
    public.is_household_admin(household_id, auth.uid())
)
with check (
    public.is_household_admin(household_id, auth.uid())
);
