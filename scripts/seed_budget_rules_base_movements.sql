-- Seed monthly budget rules for the base investment / house-saving movements.
--
-- Budget rules do not support month-specific exclusions. Because of that, this
-- script only inserts the base monthly amount. June and December should be
-- handled as manual month adjustments or with a future schema change.
--
-- Assumptions:
-- - The active budget config for "Dias Pereira" should receive these rules.
-- - ActivoBank is the source account for these budget transfers.
-- - Destination accounts are owner-specific investment/savings accounts.
--
-- Rollback:
-- delete from public.budget_rules
-- where name in (
--   'Renato - Investimento - Trade Republic',
--   'Renato - Investimento - XTB',
--   'Renato - PPR',
--   'Ines - Investimento - XTB',
--   'Ines - Investimento - Trade Republic',
--   'Ines - PPR',
--   'Renato - PoupancaCasa - Trading212',
--   'Renato - PoupancaCasa - Trade Republic',
--   'Ines - PoupancaCasa - Trading212',
--   'Ines - PoupancaCasa - Trade Republic'
-- )
-- and budget_config_id in (
--   select bc.id
--   from public.budget_configs bc
--   join public.households h on h.id = bc.household_id
--   where h.name = 'Dias Pereira'
-- );

with household as (
  select h.id
  from public.households h
  where h.name = 'Dias Pereira'
  limit 1
),
active_config as (
  select bc.id
  from public.budget_configs bc
  join household h on h.id = bc.household_id
  where bc.is_active = true
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
source_account as (
  select a.id
  from public.accounts a
  join household h on h.id = a.household_id
  where a.name = 'ActivoBank'
    and a.type = 'bank'
    and a.owner_profile_id is null
  limit 1
),
source_rules as (
  select *
  from (values
    ( 10, 'Renato', 'investments', 'Trade Republic',  50.00::numeric, 'Renato - Investimento - Trade Republic'),
    ( 20, 'Renato', 'investments', 'XTB',             50.00::numeric, 'Renato - Investimento - XTB'),
    ( 30, 'Renato', 'ppr',         'PPR',            167.00::numeric, 'Renato - PPR'),
    ( 40, 'Ines',   'investments', 'XTB',             50.00::numeric, 'Ines - Investimento - XTB'),
    ( 50, 'Ines',   'investments', 'Trade Republic',  50.00::numeric, 'Ines - Investimento - Trade Republic'),
    ( 60, 'Ines',   'ppr',         'PPR',            167.00::numeric, 'Ines - PPR'),
    ( 70, 'Renato', 'savings',     'Trading212',     650.00::numeric, 'Renato - PoupancaCasa - Trading212'),
    ( 80, 'Renato', 'savings',     'Trade Republic', 650.00::numeric, 'Renato - PoupancaCasa - Trade Republic'),
    ( 90, 'Ines',   'savings',     'Trading212',     650.00::numeric, 'Ines - PoupancaCasa - Trading212'),
    (100, 'Ines',   'savings',     'Trade Republic', 650.00::numeric, 'Ines - PoupancaCasa - Trade Republic')
  ) as v(priority, person, section, platform, amount, name)
),
resolved_rules as (
  select
    sr.priority,
    sr.person,
    sr.section,
    sr.platform,
    sr.amount,
    sr.name,
    case sr.platform
      when 'Trading212' then 'Trading 212'
      else sr.platform
    end as destination_account_name,
    case sr.section
      when 'savings' then 'savings'
      when 'investments' then 'investment'
      when 'ppr' then 'ppr'
    end as destination_account_type
  from source_rules sr
)
insert into public.budget_rules (
  budget_config_id,
  name,
  section,
  source_account_id,
  destination_account_id,
  owner_member_id,
  amount,
  frequency,
  priority,
  is_active
)
select
  ac.id,
  rr.name,
  rr.section::public.monthly_budget_section,
  sa.id,
  destination.id,
  pr.profile_id,
  rr.amount,
  'monthly'::public.recurring_frequency,
  rr.priority,
  true
from resolved_rules rr
join profiles pr on pr.person = rr.person
cross join active_config ac
cross join source_account sa
join household h on true
join public.accounts destination
  on destination.household_id = h.id
 and destination.owner_profile_id = pr.profile_id
 and lower(destination.name) = lower(rr.destination_account_name)
 and destination.type = rr.destination_account_type::public.account_type
where not exists (
  select 1
  from public.budget_rules existing
  where existing.budget_config_id = ac.id
    and existing.name = rr.name
    and existing.source_account_id = sa.id
    and existing.destination_account_id = destination.id
    and existing.owner_member_id = pr.profile_id
    and existing.amount = rr.amount
    and existing.section = rr.section::public.monthly_budget_section
);
