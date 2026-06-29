-- ============================================================
-- Update Accounts Currency to Enum
-- ============================================================

alter table public.accounts
alter column currency drop default;

alter table public.accounts
alter column currency
type public.currency_code
using currency::public.currency_code;

alter table public.accounts
alter column currency
set default 'EUR'::public.currency_code;