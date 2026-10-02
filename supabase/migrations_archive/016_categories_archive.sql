-- ============================================================
-- Categories archive support
-- ============================================================

alter table public.categories
    add column if not exists is_archived boolean not null default false;

create index if not exists idx_categories_household_type_archived
    on public.categories (household_id, type, is_archived, sort_order);
