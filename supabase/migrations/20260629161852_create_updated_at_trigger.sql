-- ============================================================
-- Generic updated_at Trigger Function
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

-- ============================================================
-- Profiles
-- ============================================================

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at();

-- ============================================================
-- Households
-- ============================================================

create trigger set_households_updated_at
before update on public.households
for each row
execute function public.update_updated_at();

-- ============================================================
-- Accounts
-- ============================================================

create trigger set_accounts_updated_at
before update on public.accounts
for each row
execute function public.update_updated_at();

-- ============================================================
-- Categories
-- ============================================================

create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.update_updated_at();

-- ============================================================
-- Transactions
-- ============================================================

create trigger set_transactions_updated_at
before update on public.transactions
for each row
execute function public.update_updated_at();