-- Seed the missing transactions from the exported SmartFinance state.
-- Assumptions:
-- - 2026-01 values are already reflected in account initial_balance.
-- - "Renato / PoupancaDespesa" accounts are already represented in initial balance,
--   so no transactions are inserted for Ferias, Prendas, Despesas do mes, Saude, Roupa.
-- - This script is idempotent: it skips rows that already exist with the same
--   household, account, title, amount, type, and transaction_date.
-- - Every inserted row gets a rollback tag in notes: [seed-missing-transactions]

with params as (
  select '[seed-missing-transactions]'::text as rollback_tag
),
target_household as (
  select h.id
  from public.households h
  where h.name = 'Dias Pereira'
  limit 1
),
members as (
  select p.id, p.email, p.full_name
  from public.profiles p
  where p.email in (
    'renafly@gmail.com',
    'ines.salvado.dias@gmail.com'
  )
),
accounts as (
  select a.id, a.name, a.type, a.owner_profile_id
  from public.accounts a
  join target_household th on th.id = a.household_id
),
source_rows as (
  select *
  from (values
    ('2026-02-01'::date, 'Renato Pereira', 'Trade Republic', 'investment', 'Investimento - Trade Republic', 50::numeric),
    ('2026-02-01'::date, 'Renato Pereira', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 650::numeric),
    ('2026-02-01'::date, 'Renato Pereira', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 650::numeric),
    ('2026-02-01'::date, 'Inês Dias', 'XTB', 'investment', 'Investimento - XTB', 50::numeric),
    ('2026-02-01'::date, 'Inês Dias', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 1304::numeric),
    ('2026-02-01'::date, 'Inês Dias', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 1272::numeric),

    ('2026-03-01'::date, 'Renato Pereira', 'Trade Republic', 'investment', 'Investimento - Trade Republic', 50::numeric),
    ('2026-03-01'::date, 'Renato Pereira', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 650::numeric),
    ('2026-03-01'::date, 'Renato Pereira', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 650::numeric),
    ('2026-03-01'::date, 'Inês Dias', 'XTB', 'investment', 'Investimento - XTB', 50::numeric),
    ('2026-03-01'::date, 'Inês Dias', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 650::numeric),
    ('2026-03-01'::date, 'Inês Dias', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 950::numeric),

    ('2026-04-01'::date, 'Renato Pereira', 'Trade Republic', 'investment', 'Investimento - Trade Republic', 50::numeric),
    ('2026-04-01'::date, 'Renato Pereira', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 650::numeric),
    ('2026-04-01'::date, 'Renato Pereira', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 600::numeric),
    ('2026-04-01'::date, 'Inês Dias', 'XTB', 'investment', 'Investimento - XTB', 50::numeric),
    ('2026-04-01'::date, 'Inês Dias', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 650::numeric),
    ('2026-04-01'::date, 'Inês Dias', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 600::numeric),

    ('2026-05-01'::date, 'Renato Pereira', 'Trade Republic', 'investment', 'Investimento - Trade Republic', 50::numeric),
    ('2026-05-01'::date, 'Renato Pereira', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 1043.79::numeric),
    ('2026-05-01'::date, 'Renato Pereira', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 650::numeric),
    ('2026-05-01'::date, 'Inês Dias', 'XTB', 'investment', 'Investimento - XTB', 50::numeric),
    ('2026-05-01'::date, 'Inês Dias', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 650::numeric),
    ('2026-05-01'::date, 'Inês Dias', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 1043.79::numeric),

    ('2026-06-01'::date, 'Renato Pereira', 'Trade Republic', 'investment', 'Investimento - Trade Republic', 50::numeric),
    ('2026-06-01'::date, 'Renato Pereira', 'Trading 212', 'investment', 'Investimento - Trading212', 50::numeric),
    ('2026-06-01'::date, 'Renato Pereira', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 650::numeric),
    ('2026-06-01'::date, 'Renato Pereira', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 650::numeric),
    ('2026-06-01'::date, 'Inês Dias', 'XTB', 'investment', 'Investimento - XTB', 50::numeric),
    ('2026-06-01'::date, 'Inês Dias', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 1550::numeric),
    ('2026-06-01'::date, 'Inês Dias', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 1550::numeric),

    ('2026-07-01'::date, 'Renato Pereira', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 1333.91::numeric),
    ('2026-07-01'::date, 'Renato Pereira', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 1333.91::numeric),
    ('2026-07-01'::date, 'Renato Pereira', 'Trade Republic', 'investment', 'Investimento - Trade Republic', 50::numeric),
    ('2026-07-01'::date, 'Renato Pereira', 'XTB', 'investment', 'Investimento - XTB', 50::numeric),
    ('2026-07-01'::date, 'Renato Pereira', 'PPR', 'ppr', 'Investimento - PPR', 167::numeric),
    ('2026-07-01'::date, 'Inês Dias', 'Trading 212', 'savings', 'PoupancaCasa - Trading212', 1333.91::numeric),
    ('2026-07-01'::date, 'Inês Dias', 'Trade Republic', 'savings', 'PoupancaCasa - Trade Republic', 1333.91::numeric),
    ('2026-07-01'::date, 'Inês Dias', 'Trade Republic', 'investment', 'Investimento - Trade Republic', 50::numeric),
    ('2026-07-01'::date, 'Inês Dias', 'XTB', 'investment', 'Investimento - XTB', 50::numeric),
    ('2026-07-01'::date, 'Inês Dias', 'PPR', 'ppr', 'Investimento - PPR', 167::numeric)
  ) as t(transaction_date, owner_full_name, account_name, account_type, title, amount)
),
resolved as (
  select
    sr.transaction_date,
    sr.owner_full_name,
    sr.account_name,
    sr.account_type,
    sr.title,
    sr.amount,
    a.id as account_id,
    m.id as created_by
  from source_rows sr
  join members m
    on m.full_name = sr.owner_full_name
  join accounts a
    on a.name = sr.account_name
   and a.type = sr.account_type::public.account_type
   and (a.owner_profile_id = m.id or (a.owner_profile_id is null and sr.owner_full_name is null))
)
insert into public.transactions (
  household_id,
  account_id,
  title,
  notes,
  amount,
  type,
  transaction_date,
  created_by
)
select
  th.id,
  r.account_id,
  r.title,
  p.rollback_tag,
  r.amount,
  case
    when r.title ilike 'PoupancaCasa%' then 'income'::public.transaction_type
    when r.account_type = 'investment' or r.account_type = 'ppr' then 'income'::public.transaction_type
    else 'income'::public.transaction_type
  end,
  r.transaction_date,
  r.created_by
from resolved r
cross join target_household th
cross join params p
where not exists (
  select 1
  from public.transactions t
  where t.household_id = th.id
    and t.account_id = r.account_id
    and t.title = r.title
    and t.amount = r.amount
    and t.type = case
      when r.title ilike 'PoupancaCasa%' then 'income'::public.transaction_type
      when r.account_type = 'investment' or r.account_type = 'ppr' then 'income'::public.transaction_type
      else 'income'::public.transaction_type
    end
    and t.transaction_date::date = r.transaction_date
);
