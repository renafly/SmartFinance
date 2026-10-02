-- ============================================================
-- Allow the "All main categories" dynamic marker in wage_flow_categories
-- ============================================================
-- wage_flow_categories.category_ids was declared `uuid[]`, but the app
-- stores a reserved sentinel string, `__all_main_categories__`
-- (see ALL_MAIN_CATEGORIES_ID in src/features/financial-insights/wage-flow.ts),
-- inside that same array to mean "every main category, resolved dynamically
-- at evaluation time" -- not a real category id. A `uuid[]` column rejects
-- that value outright (invalid input syntax for type uuid), which broke
-- saving a Wage Flow category with "All main categories" selected. Widen the
-- column to `text[]` so it can hold both real category uuids (still always
-- valid uuid strings in practice) and the sentinel marker.

alter table public.wage_flow_categories
    alter column category_ids type text[] using category_ids::text[];

comment on column public.wage_flow_categories.category_ids is
    'Matches non-transfer expenses in these categories (subcategories of a selected parent are included automatically at query time). May also contain the reserved marker __all_main_categories__, meaning every main category, resolved dynamically at query time so newly created main categories are picked up automatically.';
