-- ============================================================
-- Persist the user's selected theme on their profile so it can be
-- loaded from the database (source of truth) on login, alongside the
-- existing locale and preferred_currency columns.
-- ============================================================

alter table public.profiles
add column if not exists theme text not null default 'dark';

alter table public.profiles
drop constraint if exists profiles_theme_is_valid;

alter table public.profiles
add constraint profiles_theme_is_valid
check (theme in ('light', 'dark', 'blue', 'ultra', 'system'));

comment on column public.profiles.theme is 'Preferred UI theme (light, dark, blue, ultra, system).';
