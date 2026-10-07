-- Bring a household's categories in line with the default category tree.
--
-- NON-DESTRUCTIVE and safe to re-run. This just calls
-- public.apply_default_categories() (supabase/migrations/
-- 20261007000000_default_categories_v2.sql), the same function that seeds
-- every new household and backs the app's "Add default categories" button:
--   * missing default categories/subcategories are created;
--   * existing ones (matched by English/Portuguese name or an older/legacy
--     name) are renamed, re-iconed and moved under the right parent;
--   * duplicates are merged -- their transactions, budgets, rules, planned
--     items, child categories and Wage Flow selections move to the kept
--     category, and the duplicate is archived (not deleted);
--   * custom categories that don't match a default are left alone.
--
-- The tree itself lives in public.default_category_catalog() -- edit it
-- there (in a new migration), not here.
--
-- HOW TO RUN: set the household name below (or use the "all households"
-- variant), then run this file in the Supabase SQL editor or with
-- `psql "$DATABASE_URL" -f scripts/seed_default_categories.sql`.
-- Optional second argument: 'pt' or 'en' to force the language of newly
-- created/renamed defaults (default: the household owner's profile locale).

begin;

do $$
declare
  household_uuid uuid;
begin
  select h.id into household_uuid
  from public.households h
  where h.name = 'Dias Pereira'
    and h.deleted_at is null
  limit 1;

  if household_uuid is null then
    raise exception 'No household matched -- update the household name in scripts/seed_default_categories.sql before running it.';
  end if;

  perform public.apply_default_categories(household_uuid);
end $$;

-- All households instead:
-- select public.apply_default_categories(h.id) from public.households h where h.deleted_at is null;

commit;

-- Verify afterward:
-- select c.type, p.name as parent, c.name, c.icon, c.is_archived
-- from public.categories c
-- left join public.categories p on p.id = c.parent_id
-- join public.households h on h.id = c.household_id
-- where h.name = 'Dias Pereira'
-- order by c.type, c.is_archived, coalesce(p.sort_order, c.sort_order), p.name nulls first, c.sort_order;
