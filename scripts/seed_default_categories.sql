-- Wipe and reseed default categories for a household.
--
-- WARNING: DESTRUCTIVE AND NOT REVERSIBLE. This deletes EVERY category
-- (income, expense, and account type; main and sub) for the target
-- household, then recreates 10 default expense categories (each with a
-- few subcategories) and 10 default income categories. Any custom
-- categories you created yourself — and any custom subcategories under
-- the old defaults — are gone once this runs. There is no companion
-- rollback_*.sql for this script (unlike the seed_*.sql scripts elsewhere
-- in this folder): once the original category rows are deleted, their
-- names/icons/ids aren't recoverable from anywhere else in the database.
--
-- BEFORE RUNNING: export a household backup from the app (Settings ->
-- Backup) so you have a copy to refer back to if needed.
--
-- Nothing else breaks: every transaction, recurring rule, automation
-- (transaction) rule, and transaction split that pointed at one of the
-- deleted categories has its category_id set to NULL first (category_id
-- is nullable on all four of those tables), so the delete step below
-- never hits a foreign-key error. Those records survive — they just
-- become "uncategorized" until you recategorize them from the app.
--
-- HOW TO RUN: update the household name below (search for 'Dias Pereira'
-- — it appears once per statement) if it isn't already yours, then run
-- this whole file — e.g. paste it into the Supabase SQL editor, or
-- `psql "$DATABASE_URL" -f scripts/seed_default_categories.sql`.
-- Everything runs inside one transaction, so if anything fails partway
-- through, nothing is left half-applied.
--
-- Note on structure: an earlier version of this script resolved the
-- household once into a temporary table and reused it across statements.
-- That doesn't survive in every SQL runner (Supabase's SQL editor doesn't
-- reliably keep a session-scoped temp table alive across a whole pasted
-- script, even inside one BEGIN/COMMIT), so this version instead resolves
-- the household fresh via a `with target_household as (...)` CTE on every
-- statement — the same pattern already used by the other seed_*.sql
-- scripts in this folder.
--
-- Keep the category names/icons below in sync with
-- src/features/categories/default-category-seed.ts and the
-- `categories.defaults*` keys in src/locales/{en,pt}/common.json. This
-- script intentionally duplicates that list as plain SQL values rather
-- than importing it, since it runs outside the app (and outside Node
-- entirely — there's no service-role key configured anywhere in this
-- repo for a standalone script to use instead).

begin;

-- 0) Fail fast if the household name below doesn't match anything, rather
-- than silently doing nothing in every later statement.
do $$
declare
  household_uuid uuid;
begin
  select h.id into household_uuid
  from public.households h
  where h.name = 'Dias Pereira'
  limit 1;

  if household_uuid is null then
    raise exception 'No household matched — update the household name in scripts/seed_default_categories.sql before running it.';
  end if;
end $$;

-- 1) Null out every reference to this household's categories first, so
-- deleting them in step 2 can never violate a foreign-key constraint.
with target_household as (
  select h.id from public.households h where h.name = 'Dias Pereira' limit 1
)
update public.transactions t
set category_id = null
from target_household th
where t.household_id = th.id
  and t.category_id is not null;

with target_household as (
  select h.id from public.households h where h.name = 'Dias Pereira' limit 1
)
update public.recurring_transactions rt
set category_id = null
from target_household th
where rt.household_id = th.id
  and rt.category_id is not null;

with target_household as (
  select h.id from public.households h where h.name = 'Dias Pereira' limit 1
)
update public.transaction_rules tr
set category_id = null
from target_household th
where tr.household_id = th.id
  and tr.category_id is not null;

with target_household as (
  select h.id from public.households h where h.name = 'Dias Pereira' limit 1
)
update public.transaction_splits ts
set category_id = null
from target_household th
where ts.household_id = th.id
  and ts.category_id is not null;

-- 2) Delete every existing category for the household — income, expense,
-- and account types; main and sub. Nothing references categories.id
-- anymore after step 1, so this is safe in a single statement regardless
-- of parent/child ordering.
with target_household as (
  select h.id from public.households h where h.name = 'Dias Pereira' limit 1
)
delete from public.categories c
using target_household th
where c.household_id = th.id;

-- 3) Recreate the 10 default main expense categories.
with target_household as (
  select h.id from public.households h where h.name = 'Dias Pereira' limit 1
)
insert into public.categories (household_id, name, type, icon, parent_id, is_default, sort_order)
select th.id, v.name, 'expense'::public.category_type, v.icon, null, true, v.sort_order
from target_household th
cross join (values
  ('Housing', 'home-outline', 0),
  ('Utilities', 'flash-outline', 1),
  ('Groceries', 'cart-outline', 2),
  ('Transportation', 'car-outline', 3),
  ('Health & Wellness', 'medical-outline', 4),
  ('Dining & Entertainment', 'restaurant-outline', 5),
  ('Shopping & Personal Care', 'bag-outline', 6),
  ('Family & Education', 'school-outline', 7),
  ('Savings & Investments', 'trending-up-outline', 8),
  ('Debt & Financial Obligations', 'card-outline', 9)
) as v(name, icon, sort_order);

-- 4) Recreate their subcategories, linked to the mains just created above
-- (visible here already — same transaction, so a plain join by name works).
with target_household as (
  select h.id from public.households h where h.name = 'Dias Pereira' limit 1
)
insert into public.categories (household_id, name, type, icon, parent_id, is_default, sort_order)
select th.id, v.sub_name, 'expense'::public.category_type, v.sub_icon, m.id, true, v.sort_order
from target_household th
join public.categories m
  on m.household_id = th.id
 and m.type = 'expense'
 and m.parent_id is null
join (values
  ('Housing', 'Rent/Mortgage', 'key-outline', 0),
  ('Housing', 'Home Insurance', 'shield-checkmark-outline', 1),
  ('Housing', 'Maintenance & Repairs', 'build-outline', 2),
  ('Utilities', 'Electricity', 'flash-outline', 0),
  ('Utilities', 'Water', 'water-outline', 1),
  ('Utilities', 'Internet & Phone', 'wifi-outline', 2),
  ('Groceries', 'Supermarket', 'basket-outline', 0),
  ('Groceries', 'Household Supplies', 'file-tray-outline', 1),
  ('Transportation', 'Fuel', 'speedometer-outline', 0),
  ('Transportation', 'Public Transit', 'bus-outline', 1),
  ('Transportation', 'Car Maintenance & Insurance', 'build-outline', 2),
  ('Health & Wellness', 'Doctor & Pharmacy', 'medkit-outline', 0),
  ('Health & Wellness', 'Health Insurance', 'shield-checkmark-outline', 1),
  ('Health & Wellness', 'Fitness', 'fitness-outline', 2),
  ('Dining & Entertainment', 'Restaurants & Takeout', 'fast-food-outline', 0),
  ('Dining & Entertainment', 'Streaming & Subscriptions', 'play-circle-outline', 1),
  ('Dining & Entertainment', 'Leisure & Hobbies', 'game-controller-outline', 2),
  ('Shopping & Personal Care', 'Clothing', 'shirt-outline', 0),
  ('Shopping & Personal Care', 'Personal Care', 'sparkles-outline', 1),
  ('Shopping & Personal Care', 'Electronics & Gadgets', 'phone-portrait-outline', 2),
  ('Family & Education', 'Childcare', 'people-outline', 0),
  ('Family & Education', 'Tuition & Courses', 'book-outline', 1),
  ('Family & Education', 'Kids'' Activities', 'happy-outline', 2),
  ('Savings & Investments', 'Emergency Fund', 'umbrella-outline', 0),
  ('Savings & Investments', 'Investments', 'stats-chart-outline', 1),
  ('Savings & Investments', 'Retirement', 'hourglass-outline', 2),
  ('Debt & Financial Obligations', 'Loan Payments', 'cash-outline', 0),
  ('Debt & Financial Obligations', 'Credit Card Payments', 'card-outline', 1),
  ('Debt & Financial Obligations', 'Taxes & Fees', 'document-text-outline', 2)
) as v(main_name, sub_name, sub_icon, sort_order)
  on v.main_name = m.name;

-- 5) Recreate the 10 default income categories (flat — no subcategories).
with target_household as (
  select h.id from public.households h where h.name = 'Dias Pereira' limit 1
)
insert into public.categories (household_id, name, type, icon, parent_id, is_default, sort_order)
select th.id, v.name, 'income'::public.category_type, v.icon, null, true, v.sort_order
from target_household th
cross join (values
  ('Salary', 'cash-outline', 0),
  ('Freelance & Self-Employment', 'briefcase-outline', 1),
  ('Bonus & Commissions', 'trophy-outline', 2),
  ('Investment Income', 'trending-up-outline', 3),
  ('Rental Income', 'home-outline', 4),
  ('Business Income', 'business-outline', 5),
  ('Gifts & Inheritance', 'gift-outline', 6),
  ('Refunds & Reimbursements', 'receipt-outline', 7),
  ('Government Benefits', 'shield-checkmark-outline', 8),
  ('Other Income', 'ellipsis-horizontal-circle-outline', 9)
) as v(name, icon, sort_order);

commit;

-- Verify afterward:
-- select type, name, parent_id
-- from public.categories c
-- join public.households h on h.id = c.household_id
-- where h.name = 'Dias Pereira'
-- order by type, coalesce(parent_id::text, id::text), sort_order;
