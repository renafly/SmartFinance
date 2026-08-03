-- Transaction automation primitives: reusable rules, normalized merchants,
-- split allocations, and household-scoped tags.

alter table public.transactions
  add column if not exists merchant_name text;

create unique index if not exists accounts_id_household_unique
  on public.accounts(id, household_id);
create unique index if not exists categories_id_household_unique
  on public.categories(id, household_id);
create unique index if not exists transactions_id_household_unique
  on public.transactions(id, household_id);

create table public.transaction_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  match_type text not null check (match_type in ('exact', 'contains', 'prefix')),
  pattern text not null check (length(btrim(pattern)) between 1 and 240),
  normalized_pattern text not null check (length(btrim(normalized_pattern)) between 1 and 240),
  transaction_type public.transaction_type,
  account_id uuid,
  category_id uuid,
  merchant_name text,
  priority integer not null default 100 check (priority between 0 and 10000),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, household_id)
    references public.accounts(id, household_id) on delete cascade,
  foreign key (category_id, household_id)
    references public.categories(id, household_id) on delete restrict
);

create table public.merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  alias text not null check (length(btrim(alias)) between 1 and 240),
  normalized_alias text not null check (length(btrim(normalized_alias)) between 1 and 240),
  merchant_name text not null check (length(btrim(merchant_name)) between 1 and 160),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, normalized_alias)
);

create table public.transaction_tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  color text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, name),
  unique (id, household_id)
);

create table public.transaction_tag_assignments (
  household_id uuid not null references public.households(id) on delete cascade,
  transaction_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (transaction_id, tag_id),
  foreign key (transaction_id, household_id)
    references public.transactions(id, household_id) on delete cascade,
  foreign key (tag_id, household_id)
    references public.transaction_tags(id, household_id) on delete cascade
);

create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  transaction_id uuid not null,
  category_id uuid,
  amount numeric(14,2) not null check (amount > 0),
  notes text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (transaction_id, household_id)
    references public.transactions(id, household_id) on delete cascade,
  foreign key (category_id, household_id)
    references public.categories(id, household_id) on delete restrict
);

create index idx_transaction_rules_household_active
  on public.transaction_rules(household_id, is_active, priority, created_at);
create index idx_merchant_aliases_household
  on public.merchant_aliases(household_id, normalized_alias);
create index idx_transaction_tags_household
  on public.transaction_tags(household_id, name);
create index idx_transaction_tag_assignments_household
  on public.transaction_tag_assignments(household_id, tag_id);
create index idx_transaction_splits_transaction
  on public.transaction_splits(transaction_id, sort_order);
create unique index idx_transaction_splits_unique_order
  on public.transaction_splits(transaction_id, sort_order);

create trigger set_transaction_rules_updated_at before update on public.transaction_rules
for each row execute function public.update_updated_at();
create trigger set_merchant_aliases_updated_at before update on public.merchant_aliases
for each row execute function public.update_updated_at();
create trigger set_transaction_tags_updated_at before update on public.transaction_tags
for each row execute function public.update_updated_at();
create trigger set_transaction_splits_updated_at before update on public.transaction_splits
for each row execute function public.update_updated_at();

alter table public.transaction_rules enable row level security;
alter table public.merchant_aliases enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.transaction_tag_assignments enable row level security;
alter table public.transaction_splits enable row level security;

create policy "Members can manage transaction rules" on public.transaction_rules
for all to authenticated
using (public.is_household_member(household_id, (select auth.uid())))
with check (
  public.is_household_member(household_id, (select auth.uid()))
  and (account_id is null or exists (
    select 1 from public.accounts a
    where a.id = account_id and a.household_id = transaction_rules.household_id
  ))
  and (category_id is null or exists (
    select 1 from public.categories c
    where c.id = category_id and c.household_id = transaction_rules.household_id
  ))
);

create policy "Members can manage merchant aliases" on public.merchant_aliases
for all to authenticated
using (public.is_household_member(household_id, (select auth.uid())))
with check (public.is_household_member(household_id, (select auth.uid())));

create policy "Members can manage transaction tags" on public.transaction_tags
for all to authenticated
using (public.is_household_member(household_id, (select auth.uid())))
with check (public.is_household_member(household_id, (select auth.uid())));

create policy "Members can manage transaction tag assignments" on public.transaction_tag_assignments
for all to authenticated
using (public.is_household_member(household_id, (select auth.uid())))
with check (
  public.is_household_member(household_id, (select auth.uid()))
  and exists (
    select 1 from public.transactions t
    where t.id = transaction_tag_assignments.transaction_id
      and t.household_id = transaction_tag_assignments.household_id
  )
);

create policy "Members can manage transaction splits" on public.transaction_splits
for all to authenticated
using (public.is_household_member(household_id, (select auth.uid())))
with check (
  public.is_household_member(household_id, (select auth.uid()))
  and exists (
    select 1 from public.transactions t
    where t.id = transaction_splits.transaction_id
      and t.household_id = transaction_splits.household_id
  )
  and (category_id is null or exists (
    select 1 from public.categories c
    where c.id = transaction_splits.category_id
      and c.household_id = transaction_splits.household_id
  ))
);

-- Data API access is explicit as required by current Supabase projects.
grant select, insert, update, delete on table public.transaction_rules to authenticated;
grant select, insert, update, delete on table public.merchant_aliases to authenticated;
grant select, insert, update, delete on table public.transaction_tags to authenticated;
grant select, insert, update, delete on table public.transaction_tag_assignments to authenticated;
grant select, insert, update, delete on table public.transaction_splits to authenticated;

comment on table public.transaction_rules is 'Household rules that classify and normalize transactions.';
comment on table public.merchant_aliases is 'Household-specific mappings from bank descriptions to canonical merchants.';
comment on table public.transaction_tags is 'Reusable household transaction labels.';
comment on table public.transaction_splits is 'Category allocations whose total is validated against the parent transaction by the application.';
