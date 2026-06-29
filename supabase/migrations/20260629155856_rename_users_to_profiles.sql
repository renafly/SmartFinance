-- ============================================================
-- Rename users table to profiles
-- ============================================================

alter table public.users
rename to profiles;

-- Rename RLS policies

alter policy "Users can view own profile"
on public.profiles
rename to "Profiles can view own profile";

alter policy "Users can insert own profile"
on public.profiles
rename to "Profiles can insert own profile";

alter policy "Users can update own profile"
on public.profiles
rename to "Profiles can update own profile";