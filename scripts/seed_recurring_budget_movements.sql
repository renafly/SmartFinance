-- Seed recurring budget/investment movements.
--
-- Model used:
-- - Monthly base rule for every item.
-- - Extra custom rule for June and December so those months become double.
--
-- This creates recurring_transactions only. It does not update existing rows
-- and it does not create historical transactions.
--
-- Rollback:
-- delete from public.recurring_transactions
-- where notes like '[seed-recurring-budget-movements]%';

with params as (
  select
    '[seed-recurring-budget-movements]'::text as rollback_tag,
    array[1, 2, 3, 4, 5, 7, 8, 9, 10, 11]::smallint[] as exclude_non_bonus_months
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
source_rules as (
  select *
  from (values
    ('Renato', 'Investimento', 'Trade Republic',  50.00::numeric),
    ('Renato', 'Investimento', 'XTB',             50.00::numeric),
    ('Ines',   'Investimento', 'XTB',             50.00::numeric),
    ('Ines',   'Investimento', 'Trade Republic',  50.00::numeric),
    ('Renato', 'PoupancaCasa', 'Trading212',     650.00::numeric),
    ('Renato', 'PoupancaCasa', 'Trade Republic', 650.00::numeric),
    ('Ines',   'PoupancaCasa', 'Trading212',     650.00::numeric),
    ('Ines',   'PoupancaCasa', 'Trade Republic', 650.00::numeric)
  ) as v(person, section, platform, amount)
),
resolved_rules as (
  select
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
  from source_rules sr
),
recurring_rows as (
  select
    r.*,
    'monthly'::public.recurring_frequency as frequency,
    date '2026-08-01' as next_run,
    '{}'::smallint[] as excluded_months,
    'monthly-base'::text as rule_kind,
    r.title as recurring_title
  from resolved_rules r

  union all

  select
    r.*,
    'custom'::public.recurring_frequency as frequency,
    date '2026-12-01' as next_run,
    p.exclude_non_bonus_months as excluded_months,
    'jun-dec-extra'::text as rule_kind,
    r.title || ' - extra Junho/Dezembro' as recurring_title
  from resolved_rules r
  cross join params p
)
insert into public.recurring_transactions (
  household_id,
  account_id,
  category_id,
  title,
  notes,
  amount,
  type,
  frequency,
  excluded_months,
  next_run,
  created_by
)
select
  h.id,
  a.id,
  null,
  rr.recurring_title,
  p.rollback_tag || ' ' || rr.rule_kind,
  rr.amount,
  'income'::public.transaction_type,
  rr.frequency,
  rr.excluded_months,
  rr.next_run,
  pr.profile_id
from recurring_rows rr
join profiles pr on pr.person = rr.person
cross join household h
cross join params p
join public.accounts a
  on a.household_id = h.id
 and a.owner_profile_id = pr.profile_id
 and lower(a.name) = lower(rr.account_name)
 and a.type = rr.account_type::public.account_type
where not exists (
  select 1
  from public.recurring_transactions existing
  where existing.household_id = h.id
    and existing.account_id = a.id
    and existing.title = rr.recurring_title
    and existing.amount = rr.amount
    and existing.type = 'income'::public.transaction_type
    and existing.frequency = rr.frequency
    and coalesce(existing.notes, '') = p.rollback_tag || ' ' || rr.rule_kind
);
