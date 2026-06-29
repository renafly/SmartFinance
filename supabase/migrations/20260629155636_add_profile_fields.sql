-- ============================================================
-- Add additional profile fields
-- ============================================================

alter table public.users
add column if not exists preferred_currency text not null default 'EUR';

alter table public.users
add column if not exists locale text not null default 'en';

alter table public.users
add column if not exists timezone text;

comment on column public.users.preferred_currency is
'ISO 4217 currency code (EUR, USD, GBP...)';

comment on column public.users.locale is
'Preferred locale (en, pt-PT, es...)';

comment on column public.users.timezone is
'IANA timezone (Europe/Lisbon, Europe/Madrid...)';