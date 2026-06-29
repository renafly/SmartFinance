create extension if not exists pgcrypto;

create type household_role as enum (
    'owner',
    'admin',
    'member'
);

create type household_member_status as enum (
    'pending',
    'accepted'
);

create table public.households (

    id uuid primary key default gen_random_uuid(),

    name text not null,

    owner_id uuid not null
        references public.users(id)
        on delete cascade,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()

);

create table public.household_members (

    household_id uuid not null
        references public.households(id)
        on delete cascade,

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    role household_role not null,

    status household_member_status not null,

    joined_at timestamptz default now(),

    primary key (household_id, user_id)

);

create table public.household_invitations (

    id uuid primary key default gen_random_uuid(),

    household_id uuid not null
        references public.households(id)
        on delete cascade,

    email text not null,

    role household_role not null default 'member',

    token text not null unique,

    expires_at timestamptz,

    accepted_at timestamptz,

    created_at timestamptz default now()

);

alter table public.households
enable row level security;

alter table public.household_members
enable row level security;

alter table public.household_invitations
enable row level security;