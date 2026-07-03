-- ============================================================
-- Extensions
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- Enums
-- ============================================================

create type public.household_role as enum (
    'owner',
    'admin',
    'member'
);

create type public.household_member_status as enum (
    'pending',
    'accepted'
);

create type public.account_type as enum (
    'cash',
    'bank',
    'credit_card',
    'savings',
    'investment'
);

create type public.transaction_type as enum (
    'income',
    'expense'
);

create type public.recurring_frequency as enum (
    'daily',
    'weekly',
    'monthly',
    'yearly'
);

create type public.currency_code as enum (
    'EUR',
    'USD',
    'GBP'
);

-- ============================================================
-- Shared Utility: updated_at trigger function
-- ============================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;
