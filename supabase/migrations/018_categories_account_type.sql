-- ============================================================
-- Categories: support account-type categories
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'category_type'
      and n.nspname = 'public'
  ) then
    create type public.category_type as enum (
      'income',
      'expense',
      'account'
    );
  end if;
end $$;

alter table public.categories
  alter column type type public.category_type
  using type::text::public.category_type;