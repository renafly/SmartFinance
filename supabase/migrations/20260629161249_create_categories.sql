-- ============================================================
-- Categories
-- ============================================================

create table public.categories (

    id uuid primary key default gen_random_uuid(),

    household_id uuid not null
        references public.households(id)
        on delete cascade,

    name text not null,

    type public.transaction_type not null,

    icon text,

    color text,

    parent_id uuid
        references public.categories(id)
        on delete set null,

    is_default boolean not null default false,

    sort_order integer not null default 0,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint categories_unique_name
        unique (household_id, type, name)
);