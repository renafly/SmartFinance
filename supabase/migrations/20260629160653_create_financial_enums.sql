-- ============================================================
-- Financial Enums
-- ============================================================

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

create type public.budget_period as enum (
    'weekly',
    'monthly',
    'yearly'
);

create type public.recurring_frequency as enum (
    'daily',
    'weekly',
    'monthly',
    'yearly'
);