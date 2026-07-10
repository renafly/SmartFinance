-- Seed budget/investment movements after the clean state.
--
-- Includes every row from the provided list except:
-- - PPR rows, because they already exist.
-- - January rows, because they are initial balances.
-- - Zero-value XTB rows, because public.transactions.amount has check (amount > 0).
--
-- Rollback:
-- delete from public.transactions
-- where notes = '[seed-budget-movements-no-ppr-no-january]';

with params as (
  select '[seed-budget-movements-no-ppr-no-january]'::text as rollback_tag
),
household as (
  select h.id
  from public.households h
  where h.name = 'Dias Pereira'
  limit 1
),
members as (
  select *
  from (values
    ('Renato', 'renafly@gmail.com'),
    ('Ines', 'ines.salvado.dias@gmail.com')
  ) as v(person, email)
),
profiles as (
  select m.person, p.id as profile_id
  from members m
  join public.profiles p on p.email = m.email
),
source_rows as (
  select *
  from (values
    (date '2026-02-01', 'Renato', 'Investimento', 'XTB',            50.00::numeric),
    (date '2026-02-01', 'Renato', 'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-02-01', 'Renato', 'PoupancaCasa', 'Trading212',    650.00::numeric),
    (date '2026-02-01', 'Renato', 'PoupancaCasa', 'Trade Republic',650.00::numeric),
    (date '2026-02-01', 'Ines',   'Investimento', 'XTB',            50.00::numeric),
    (date '2026-02-01', 'Ines',   'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-02-01', 'Ines',   'PoupancaCasa', 'Trading212',   1304.00::numeric),
    (date '2026-02-01', 'Ines',   'PoupancaCasa', 'Trade Republic',1272.00::numeric),

    (date '2026-03-01', 'Renato', 'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-03-01', 'Renato', 'PoupancaCasa', 'Trading212',    650.00::numeric),
    (date '2026-03-01', 'Renato', 'PoupancaCasa', 'Trade Republic',650.00::numeric),
    (date '2026-03-01', 'Ines',   'Investimento', 'XTB',            50.00::numeric),
    (date '2026-03-01', 'Ines',   'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-03-01', 'Ines',   'PoupancaCasa', 'Trading212',    650.00::numeric),
    (date '2026-03-01', 'Ines',   'PoupancaCasa', 'Trade Republic',950.00::numeric),

    (date '2026-04-01', 'Renato', 'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-04-01', 'Renato', 'PoupancaCasa', 'Trading212',    650.00::numeric),
    (date '2026-04-01', 'Renato', 'PoupancaCasa', 'Trade Republic',600.00::numeric),
    (date '2026-04-01', 'Ines',   'Investimento', 'XTB',            50.00::numeric),
    (date '2026-04-01', 'Ines',   'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-04-01', 'Ines',   'PoupancaCasa', 'Trading212',    650.00::numeric),
    (date '2026-04-01', 'Ines',   'PoupancaCasa', 'Trade Republic',600.00::numeric),

    (date '2026-05-01', 'Renato', 'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-05-01', 'Renato', 'PoupancaCasa', 'Trading212',   1043.79::numeric),
    (date '2026-05-01', 'Renato', 'PoupancaCasa', 'Trade Republic',650.00::numeric),
    (date '2026-05-01', 'Ines',   'Investimento', 'XTB',            50.00::numeric),
    (date '2026-05-01', 'Ines',   'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-05-01', 'Ines',   'PoupancaCasa', 'Trading212',    650.00::numeric),
    (date '2026-05-01', 'Ines',   'PoupancaCasa', 'Trade Republic',1043.79::numeric),

    (date '2026-06-01', 'Renato', 'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-06-01', 'Renato', 'PoupancaCasa', 'Trading212',    650.00::numeric),
    (date '2026-06-01', 'Renato', 'PoupancaCasa', 'Trade Republic',650.00::numeric),
    (date '2026-06-01', 'Ines',   'Investimento', 'XTB',            50.00::numeric),
    (date '2026-06-01', 'Ines',   'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-06-01', 'Ines',   'PoupancaCasa', 'Trading212',   1550.00::numeric),
    (date '2026-06-01', 'Ines',   'PoupancaCasa', 'Trade Republic',1550.00::numeric),
    (date '2026-06-01', 'Renato', 'Investimento', 'Trading212',     50.00::numeric),

    (date '2026-07-01', 'Renato', 'PoupancaCasa', 'Trading212',    650.00::numeric),
    (date '2026-07-01', 'Renato', 'PoupancaCasa', 'Trade Republic',1333.91::numeric),
    (date '2026-07-01', 'Ines',   'PoupancaCasa', 'Trade Republic',1333.91::numeric),
    (date '2026-07-01', 'Renato', 'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-07-01', 'Ines',   'Investimento', 'Trade Republic', 50.00::numeric),
    (date '2026-07-01', 'Ines',   'PoupancaCasa', 'Trading212',   1333.91::numeric),
    (date '2026-07-01', 'Renato', 'Investimento', 'XTB',            50.00::numeric),
    (date '2026-07-01', 'Ines',   'Investimento', 'XTB',            50.00::numeric),
    (date '2026-07-01', 'Renato', 'PoupancaCasa', 'Trading212',   1333.91::numeric)
  ) as v(transaction_date, person, section, platform, amount)
),
resolved as (
  select
    sr.transaction_date,
    sr.person,
    sr.section,
    sr.platform,
    sr.amount,
    case sr.platform
      when 'Trading212' then 'Trading 212'
      else sr.platform
    end as account_name,
    case sr.section
      when 'PoupancaCasa' then 'savings'
      when 'Investimento' then 'investment'
    end as account_type,
    case sr.section
      when 'PoupancaCasa' then 'PoupancaCasa - ' || sr.platform
      when 'Investimento' then 'Investimento - ' || sr.platform
    end as title
  from source_rows sr
)
insert into public.transactions (
  household_id,
  account_id,
  category_id,
  title,
  notes,
  amount,
  type,
  transaction_date,
  created_by
)
select
  h.id,
  a.id,
  c.id,
  r.title,
  p.rollback_tag,
  r.amount,
  'income'::public.transaction_type,
  r.transaction_date,
  pr.profile_id
from resolved r
join profiles pr on pr.person = r.person
cross join household h
cross join params p
join public.accounts a
  on a.household_id = h.id
 and a.owner_profile_id = pr.profile_id
 and lower(a.name) = lower(r.account_name)
 and a.type = r.account_type::public.account_type
left join public.categories c
  on c.household_id = h.id
 and c.type = 'income'
 and c.name = 'Investments'
where not exists (
  select 1
  from public.transactions t
  where t.household_id = h.id
    and t.account_id = a.id
    and t.title = r.title
    and t.amount = r.amount
    and t.type = 'income'::public.transaction_type
    and t.transaction_date::date = r.transaction_date
);
