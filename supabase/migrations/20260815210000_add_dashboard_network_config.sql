-- ============================================================
-- Dashboard 3D accounts network config
-- ============================================================
-- Stores which accounts/pots a profile has chosen to show as nodes in the
-- Dashboard's 3D accounts network. This is a personal display preference
-- (like `profiles.theme` / `profiles.locale`), not shared household data,
-- so it's scoped to a single profile -- one row per profile -- rather than
-- a household the way `wage_flow_categories` is. Replaces the previous
-- device-local storage version of this feature so the selection now
-- follows the user across devices/logins.

create table public.dashboard_network_configs (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null unique references public.profiles(id) on delete cascade,
    account_ids uuid[] not null default '{}',
    investment_account_ids uuid[] not null default '{}',
    savings_account_ids uuid[] not null default '{}',
    pot_ids uuid[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.dashboard_network_configs is
    'Per-profile display preference: which accounts/pots appear as nodes in the Dashboard 3D accounts network. One row per profile.';
comment on column public.dashboard_network_configs.account_ids is
    'Every-day accounts (bank, cash, credit card) selected to appear in the network.';
comment on column public.dashboard_network_configs.investment_account_ids is
    'Investment/ppr accounts selected to appear in the network.';
comment on column public.dashboard_network_configs.savings_account_ids is
    'Savings accounts selected to appear in the network.';
comment on column public.dashboard_network_configs.pot_ids is
    'Saving pots selected to appear in the network.';

create trigger set_dashboard_network_configs_updated_at
before update on public.dashboard_network_configs
for each row
execute function public.update_updated_at();

alter table public.dashboard_network_configs enable row level security;

create policy "Profiles can view their own dashboard network config"
on public.dashboard_network_configs
for select
using (auth.uid() = profile_id);

create policy "Profiles can manage their own dashboard network config"
on public.dashboard_network_configs
for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);
