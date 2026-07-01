-- ============================================================
-- Households
-- ============================================================

create table public.households (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    owner_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================================================
-- Household Members
-- ============================================================

create table public.household_members (
    household_id uuid not null references public.households(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    role public.household_role not null,
    status public.household_member_status not null,
    joined_at timestamptz default now(),
    primary key (household_id, user_id)
);

-- ============================================================
-- Household Invitations
-- ============================================================

create table public.household_invitations (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    email text not null,
    role public.household_role not null default 'member',
    token text not null unique,
    expires_at timestamptz,
    accepted_at timestamptz,
    created_at timestamptz default now()
);

-- ============================================================
-- Deferred FK: profiles.default_household_id
-- Must come after both profiles and households exist.
-- ============================================================

alter table public.profiles
add column default_household_id uuid
references public.households(id)
on delete set null;

create index idx_profiles_default_household_id on public.profiles(default_household_id);

-- ============================================================
-- Triggers
-- ============================================================

create trigger set_households_updated_at
before update on public.households
for each row
execute function public.update_updated_at();

-- ============================================================
-- Permission Functions
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

-- ============================================================
-- RLS
-- ============================================================

alter table public.households enable row level security;

create policy "Members can view household"
on public.households
for select
using (
    public.is_household_member(id, auth.uid())
);

create policy "Owners can update household"
on public.households
for update
using (
    public.is_household_owner(id, auth.uid())
);

alter table public.household_members enable row level security;

create policy "Members can view household members"
on public.household_members
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Admins can manage household members"
on public.household_members
for all
using (
    public.is_household_admin(household_id, auth.uid())
)
with check (
    public.is_household_admin(household_id, auth.uid())
);

alter table public.household_invitations enable row level security;

create policy "Members can view invitations"
on public.household_invitations
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Admins can manage invitations"
on public.household_invitations
for all
using (
    public.is_household_admin(household_id, auth.uid())
)
with check (
    public.is_household_admin(household_id, auth.uid())
);

-- Cross-household profile visibility (requires household_members to exist)
create policy "Members can view household profiles"
on public.profiles
for select
using (
    auth.uid() = id
    or exists (
        select 1
        from public.household_members hm_viewer
        join public.household_members hm_target
            on hm_target.household_id = hm_viewer.household_id
            and hm_target.status = 'accepted'
        where hm_viewer.user_id = auth.uid()
            and hm_viewer.status = 'accepted'
            and hm_target.user_id = profiles.id
    )
);
