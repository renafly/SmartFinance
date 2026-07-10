-- ============================================================
-- Security hardening: RLS, RPC execution, search_path, views, storage
-- ============================================================
-- This migration intentionally keeps the existing finance semantics:
-- household members can still manage household money records, budget admins
-- keep the budget restrictions already defined in earlier policies, and
-- owner-only destructive household RPCs remain owner-only.

-- ============================================================
-- Defensive RLS coverage for public app tables
-- ============================================================

alter table if exists public.profiles enable row level security;
alter table if exists public.households enable row level security;
alter table if exists public.household_members enable row level security;
alter table if exists public.household_invitations enable row level security;
alter table if exists public.accounts enable row level security;
alter table if exists public.categories enable row level security;
alter table if exists public.transactions enable row level security;
alter table if exists public.saving_pots enable row level security;
alter table if exists public.recurring_transactions enable row level security;
alter table if exists public.attachments enable row level security;
alter table if exists public.audit_logs enable row level security;
alter table if exists public.invitation_email_logs enable row level security;
alter table if exists public.saving_pot_accounts enable row level security;
alter table if exists public.budget_configs enable row level security;
alter table if exists public.budget_rules enable row level security;
alter table if exists public.monthly_budget_runs enable row level security;
alter table if exists public.monthly_income_inputs enable row level security;

comment on table public.household_members is
    'Membership table. Policies intentionally allow household admins to manage members, while owner-only destructive actions stay enforced by RPCs.';

comment on table public.accounts is
    'Household members can manage accounts by current product design; owner/shared account semantics are enforced in application flows.';

comment on table public.transactions is
    'Transactions remain household-member managed. Cross-household access is blocked by RLS through household_id membership checks.';

comment on table public.attachments is
    'Attachment metadata is protected through transaction household membership. Storage objects are additionally restricted by bucket path policies.';

-- Views should execute with the caller privileges so underlying table RLS is
-- preserved when PostgREST exposes them. Supabase projects run on PostgreSQL
-- versions that support security_invoker views.
alter view if exists public.account_balances set (security_invoker = true);
alter view if exists public.monthly_summary set (security_invoker = true);
alter view if exists public.saving_pot_balances set (security_invoker = true);
alter view if exists public.monthly_category_spending set (security_invoker = true);

-- ============================================================
-- Least-privilege API grants
-- ============================================================

grant usage on schema public to anon, authenticated;

revoke all on table public.profiles from anon;
revoke all on table public.households from anon;
revoke all on table public.household_members from anon;
revoke all on table public.household_invitations from anon;
revoke all on table public.accounts from anon;
revoke all on table public.categories from anon;
revoke all on table public.transactions from anon;
revoke all on table public.saving_pots from anon;
revoke all on table public.recurring_transactions from anon;
revoke all on table public.attachments from anon;
revoke all on table public.audit_logs from anon;
revoke all on table public.invitation_email_logs from anon;
revoke all on table public.saving_pot_accounts from anon;
revoke all on table public.budget_configs from anon;
revoke all on table public.budget_rules from anon;
revoke all on table public.monthly_budget_runs from anon;
revoke all on table public.monthly_income_inputs from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.households to authenticated;
grant select, insert, update, delete on table public.household_members to authenticated;
grant select, insert, update, delete on table public.household_invitations to authenticated;
grant select, insert, update, delete on table public.accounts to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;
grant select, insert, update, delete on table public.saving_pots to authenticated;
grant select, insert, update, delete on table public.recurring_transactions to authenticated;
grant select, insert, update, delete on table public.attachments to authenticated;
grant select on table public.audit_logs to authenticated;
grant select, insert, update on table public.invitation_email_logs to authenticated;
grant select, insert, update, delete on table public.saving_pot_accounts to authenticated;
grant select, insert, update, delete on table public.budget_configs to authenticated;
grant select, insert, update, delete on table public.budget_rules to authenticated;
grant select, insert, update, delete on table public.monthly_budget_runs to authenticated;
grant select, insert, update, delete on table public.monthly_income_inputs to authenticated;

grant select on table public.account_balances to authenticated;
grant select on table public.monthly_summary to authenticated;
grant select on table public.saving_pot_balances to authenticated;
grant select on table public.monthly_category_spending to authenticated;

grant usage on type public.household_role to anon, authenticated;
grant usage on type public.household_member_status to authenticated;
grant usage on type public.account_type to authenticated;
grant usage on type public.transaction_type to authenticated;
grant usage on type public.recurring_frequency to authenticated;
grant usage on type public.currency_code to authenticated;
grant usage on type public.category_type to authenticated;
grant usage on type public.household_income_mode to authenticated;
grant usage on type public.remaining_cash_strategy to authenticated;
grant usage on type public.excess_cash_distribution_method to authenticated;
grant usage on type public.monthly_budget_run_status to authenticated;
grant usage on type public.monthly_budget_section to authenticated;

-- ============================================================
-- SECURITY DEFINER search_path hardening
-- ============================================================

alter function public.is_household_member(uuid, uuid) set search_path = public, pg_temp;
alter function public.is_household_admin(uuid, uuid) set search_path = public, pg_temp;
alter function public.is_household_owner(uuid, uuid) set search_path = public, pg_temp;
alter function public.create_transfer(uuid, uuid, uuid, numeric, text, text, timestamptz, uuid) set search_path = public, pg_temp;
alter function public.create_transfer(uuid, uuid, uuid, numeric, text, text, timestamptz, uuid, uuid) set search_path = public, pg_temp;
alter function public.create_transfer(uuid, uuid, uuid, numeric, text, text, timestamptz, uuid, uuid, uuid, uuid, public.monthly_budget_section) set search_path = public, pg_temp;
alter function public.audit_trigger() set search_path = public, pg_temp;
alter function public.list_my_household_invitations() set search_path = public, pg_temp;
alter function public.accept_household_invitation(text) set search_path = public, pg_temp;
alter function public.decline_household_invitation(text) set search_path = public, pg_temp;
alter function public.set_default_household(uuid) set search_path = public, pg_temp;
alter function public.create_default_categories(uuid) set search_path = public, pg_temp;
alter function public.create_default_accounts(uuid) set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.transfer_household_ownership(uuid, uuid) set search_path = public, pg_temp;
alter function public.remove_household_member(uuid, uuid) set search_path = public, pg_temp;
alter function public.leave_household(uuid) set search_path = public, pg_temp;
alter function public.create_household(text) set search_path = public, pg_temp;
alter function public.seed_categories_on_household_insert() set search_path = public, pg_temp;
alter function public.delete_household(uuid) set search_path = public, pg_temp;
alter function public.get_household_invitation_details(text) set search_path = public, pg_temp;
alter function public.set_saving_pot_accounts(uuid, uuid[]) set search_path = public, pg_temp;

-- ============================================================
-- RPC execution grants
-- ============================================================
-- Keep helper/RPC functions callable only where the app needs them. Trigger
-- and seed-only functions intentionally remain ungranted to client roles.

revoke all on function public.is_household_member(uuid, uuid) from public;
revoke all on function public.is_household_admin(uuid, uuid) from public;
revoke all on function public.is_household_owner(uuid, uuid) from public;
revoke all on function public.create_transfer(uuid, uuid, uuid, numeric, text, text, timestamptz, uuid) from public;
revoke all on function public.create_transfer(uuid, uuid, uuid, numeric, text, text, timestamptz, uuid, uuid) from public;
revoke all on function public.create_transfer(uuid, uuid, uuid, numeric, text, text, timestamptz, uuid, uuid, uuid, uuid, public.monthly_budget_section) from public;
revoke all on function public.list_my_household_invitations() from public;
revoke all on function public.accept_household_invitation(text) from public;
revoke all on function public.decline_household_invitation(text) from public;
revoke all on function public.set_default_household(uuid) from public;
revoke all on function public.transfer_household_ownership(uuid, uuid) from public;
revoke all on function public.remove_household_member(uuid, uuid) from public;
revoke all on function public.leave_household(uuid) from public;
revoke all on function public.create_household(text) from public;
revoke all on function public.delete_household(uuid) from public;
revoke all on function public.get_household_invitation_details(text) from public;
revoke all on function public.set_saving_pot_accounts(uuid, uuid[]) from public;

grant execute on function public.is_household_member(uuid, uuid) to authenticated;
grant execute on function public.is_household_admin(uuid, uuid) to authenticated;
grant execute on function public.is_household_owner(uuid, uuid) to authenticated;
grant execute on function public.create_transfer(uuid, uuid, uuid, numeric, text, text, timestamptz, uuid) to authenticated;
grant execute on function public.create_transfer(uuid, uuid, uuid, numeric, text, text, timestamptz, uuid, uuid) to authenticated;
grant execute on function public.create_transfer(uuid, uuid, uuid, numeric, text, text, timestamptz, uuid, uuid, uuid, uuid, public.monthly_budget_section) to authenticated;
grant execute on function public.list_my_household_invitations() to authenticated;
grant execute on function public.accept_household_invitation(text) to authenticated;
grant execute on function public.decline_household_invitation(text) to authenticated;
grant execute on function public.set_default_household(uuid) to authenticated;
grant execute on function public.transfer_household_ownership(uuid, uuid) to authenticated;
grant execute on function public.remove_household_member(uuid, uuid) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.delete_household(uuid) to authenticated;
grant execute on function public.get_household_invitation_details(text) to anon, authenticated;
grant execute on function public.set_saving_pot_accounts(uuid, uuid[]) to authenticated;

-- ============================================================
-- Storage attachment policies
-- ============================================================
-- The app currently uploads invoice files before inserting attachment metadata,
-- using paths like:
--   {household_id}/transactions/{transaction_id}/{timestamp}-{safe_file_name}
-- Insert is therefore path-based. Select/delete are also path-bound to the
-- caller's accepted household membership. Updates are intentionally not
-- granted; client uploads use upsert=false and overwrites should stay denied.

drop policy if exists "Members can upload attachments" on storage.objects;
drop policy if exists "Members can view attachments" on storage.objects;
drop policy if exists "Members can delete attachments" on storage.objects;
drop policy if exists "Household members can upload attachment files" on storage.objects;
drop policy if exists "Household members can view attachment files" on storage.objects;
drop policy if exists "Household members can delete attachment files" on storage.objects;

create policy "Household members can upload attachment files"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'attachments'
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/transactions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    and public.is_household_member(split_part(name, '/', 1)::uuid, auth.uid())
);

create policy "Household members can view attachment files"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'attachments'
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/transactions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    and public.is_household_member(split_part(name, '/', 1)::uuid, auth.uid())
);

create policy "Household members can delete attachment files"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'attachments'
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/transactions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    and public.is_household_member(split_part(name, '/', 1)::uuid, auth.uid())
);
