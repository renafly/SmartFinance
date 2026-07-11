-- Seed Ines's expense transactions from the pasted export.
--
-- Category mapping used:
-- - Outro / Outros -> Other Expenses
-- - Saude / Saúde -> Healthcare
-- - Alimentacao / Alimentação -> Groceries
-- - Lazer -> Entertainment
-- - Transporte -> Transport
-- - Casa -> Utilities
-- - Viagem -> Travel
-- - Roupa -> Shopping
--
-- Rollback:
-- delete from public.transactions where notes like '[seed-ines-expenses]%';

with params as (
  select '[seed-ines-expenses]'::text as rollback_tag
),
household as (
  select h.id
  from public.households h
  where h.name = 'Dias Pereira'
  limit 1
),
ines as (
  select p.id
  from public.profiles p
  where p.email = 'ines.salvado.dias@gmail.com'
  limit 1
),
ines_accounts as (
  select a.id, a.name, a.type, a.owner_profile_id
  from public.accounts a
  join household h on h.id = a.household_id
  join ines i on i.id = a.owner_profile_id
),
shared_accounts as (
  select a.id, a.name, a.type, a.owner_profile_id
  from public.accounts a
  join household h on h.id = a.household_id
  where a.owner_profile_id is null
),
categories as (
  select c.id, c.name
  from public.categories c
  join household h on h.id = c.household_id
  where c.type = 'expense'
),
source_rows as (
  select *
  from (values
    ( 1, date '2026-02-01', 'Generic',                            'Outro',       'Trade Republic', 268.00::numeric ),
    ( 2, date '2026-02-01', 'Generic',                            'Outro',       'Trading212',     319.50::numeric ),
    ( 3, date '2026-03-01', 'Generic',                            'Outro',       'Trading212',     167.20::numeric ),
    ( 4, date '2026-04-01', 'Café',                               'Alimentação', 'Trading212',       2.40::numeric ),
    ( 5, date '2026-04-01', 'Prenda pai Inês',                    'Lazer',       'Trading212',      50.12::numeric ),
    ( 6, date '2026-04-01', 'Nike Inês',                          'Roupa',       'Trading212',      38.83::numeric ),
    ( 7, date '2026-04-01', 'Continente',                         'Alimentação', 'Trading212',       3.90::numeric ),
    ( 8, date '2026-04-01', 'Aldi',                               'Alimentação', 'Trade Republic',   0.58::numeric ),
    ( 9, date '2026-04-01', 'Continente',                         'Alimentação', 'Trading212',      49.03::numeric ),
    (10, date '2026-04-01', 'Cafe',                               'Alimentação', 'Trading212',       1.58::numeric ),
    (11, date '2026-04-01', 'Jantar despedida de solteira',        'Alimentação', 'Trading212',      33.05::numeric ),
    (12, date '2026-04-01', 'Bebidas disco raquel (maior parte foi paga)', 'Alimentação', 'Trading212', 115.00::numeric ),
    (13, date '2026-04-01', 'Cafe',                               'Alimentação', 'Trading212',       0.90::numeric ),
    (14, date '2026-04-01', 'Farmacia',                           'Saúde',       'Trading212',      57.24::numeric ),
    (15, date '2026-04-01', 'Continente sushi',                   'Alimentação', 'Trading212',      25.63::numeric ),
    (16, date '2026-04-01', 'Cafe aeroporto',                     'Viagem',      'Trading212',       7.10::numeric ),
    (17, date '2026-04-01', 'Almoço galego',                      'Viagem',      'Trading212',     156.80::numeric ),
    (18, date '2026-04-01', 'Ananas',                             'Viagem',      'Trading212',      12.00::numeric ),
    (19, date '2026-04-01', 'Compras super',                      'Viagem',      'Trading212',      71.70::numeric ),
    (20, date '2026-04-01', 'Ja se sabe furnas (restaurante)',    'Viagem',      'Trading212',     148.50::numeric ),
    (21, date '2026-04-01', 'Prendas maes',                       'Viagem',      'Trading212',      29.00::numeric ),
    (22, date '2026-04-01', 'Gelados furnas',                     'Viagem',      'Trading212',       6.00::numeric ),
    (23, date '2026-04-01', 'Loja de chas prendas',               'Viagem',      'Trading212',      42.00::numeric ),
    (24, date '2026-04-01', 'Vinage',                             'Viagem',      'Trading212',       4.00::numeric ),
    (25, date '2026-04-01', 'Bar na quinta do ananas',            'Viagem',      'Trading212',       7.80::numeric ),
    (26, date '2026-04-01', 'Prendas continente',                 'Viagem',      'Trading212',      19.30::numeric ),
    (27, date '2026-04-01', 'Combustivel',                        'Viagem',      'Trading212',      31.87::numeric ),
    (28, date '2026-04-01', 'Prendas',                            'Viagem',      'Trading212',      26.94::numeric ),
    (29, date '2026-04-01', 'Lanche aeroporto',                   'Viagem',      'Trading212',      23.85::numeric ),
    (30, date '2026-04-01', 'Estacionamento',                     'Viagem',      'Trading212',      52.00::numeric ),
    (31, date '2026-04-01', 'Aguas mac',                          'Viagem',      'Trading212',       4.80::numeric ),
    (32, date '2026-05-01', 'Gasolina',                           'Outro',       'Trading212',      87.05::numeric ),
    (33, date '2026-05-01', 'lavandaria',                         'Roupa',       'Trading212',      27.85::numeric ),
    (34, date '2026-05-01', 'consulta',                           'Saúde',       'Trading212',      35.00::numeric ),
    (35, date '2026-05-01', 'cafe',                               'Alimentação', 'Trading212',       0.90::numeric ),
    (36, date '2026-05-01', 'almoco',                             'Alimentação', 'Trading212',      91.30::numeric ),
    (37, date '2026-05-01', 'cafe',                               'Alimentação', 'Trading212',       2.00::numeric ),
    (38, date '2026-05-01', 'continente',                         'Casa',        'Trading212',       5.24::numeric ),
    (39, date '2026-05-01', 'continente',                         'Casa',        'Trading212',     148.92::numeric ),
    (40, date '2026-05-01', 'jantar',                             'Alimentação', 'Trading212',      21.08::numeric ),
    (41, date '2026-05-01', 'Cafes',                              'Alimentação', 'Trading212',       7.13::numeric ),
    (42, date '2026-05-01', 'Almoço',                             'Alimentação', 'Trading212',       9.90::numeric ),
    (43, date '2026-05-01', 'Jantar rena e nocas e rui',          'Alimentação', 'Trading212',      75.00::numeric ),
    (44, date '2026-05-01', 'Jantar kaprixu',                     'Alimentação', 'Trading212',      24.27::numeric ),
    (45, date '2026-05-01', 'Almoço',                             'Alimentação', 'Trading212',       8.65::numeric ),
    (46, date '2026-05-01', 'Jantar marta e joana',               'Alimentação', 'Trading212',      43.00::numeric ),
    (47, date '2026-06-01', 'Ferias Trading 212',                 'Viagem',      'Trading212',     413.17::numeric ),
    (48, date '2026-06-01', 'Minimercado',                        'Alimentação', 'Trading212',       7.00::numeric ),
    (49, date '2026-06-25', 'Estacionamento',                     'Transporte',  'ActivoBank',       2.40::numeric ),
    (50, date '2026-06-25', 'Lavagem do carro',                   'Transporte',  'ActivoBank',       6.00::numeric ),
    (51, date '2026-06-25', 'Areia dos gatos',                    'Transporte',  'ActivoBank',       3.70::numeric ),
    (52, date '2026-06-29', 'Lavagem do carro da ines',           'Outros',      'Trading212',       6.00::numeric ),
    (53, date '2026-06-29', 'Areia gatos',                        'Outros',      'Trading212',       3.70::numeric ),
    (54, date '2026-06-29', 'Pensos renato',                      'Saude',       'Trading212',      16.00::numeric ),
    (55, date '2026-06-29', 'Pequeno almoço',                     'Alimentacao', 'Trading212',      21.70::numeric ),
    (56, date '2026-06-29', 'Levantamento',                       'Outros',      'ActivoBank',      10.50::numeric ),
    (57, date '2026-06-29', 'Almoço galvao',                      'Alimentacao', 'ActivoBank',      41.45::numeric ),
    (58, date '2026-06-29', 'Almoço ilheu',                       'Alimentacao', 'Trading212',      61.50::numeric ),
    (59, date '2026-06-30', 'Comida gatos',                       'Alimentacao', 'Trading212',      13.40::numeric ),
    (60, date '2026-06-30', 'Luz',                                'Casa',        'ActivoBank',      42.84::numeric ),
    (61, date '2026-06-30', 'GoogleAccount',                      'Casa',        'ActivoBank',      16.99::numeric )
  ) as v(row_no, transaction_date, title, source_category, platform, amount)
),
resolved as (
  select
    sr.row_no,
    sr.transaction_date,
    sr.title,
    sr.source_category,
    sr.platform,
    sr.amount,
    case lower(sr.source_category)
      when 'outro' then 'Other Expenses'
      when 'outros' then 'Other Expenses'
      when 'saude' then 'Healthcare'
      when 'saúde' then 'Healthcare'
      when 'alimentacao' then 'Groceries'
      when 'alimentação' then 'Groceries'
      when 'lazer' then 'Entertainment'
      when 'transporte' then 'Transport'
      when 'casa' then 'Utilities'
      when 'viagem' then 'Travel'
      when 'roupa' then 'Shopping'
      else 'Other Expenses'
    end as category_name,
    case sr.platform
      when 'Trade Republic' then 'Trade Republic'
      when 'Trading212' then 'Trading 212'
      when 'ActivoBank' then 'ActivoBank'
      else sr.platform
    end as account_name,
    case sr.platform
      when 'ActivoBank' then 'bank'
      else 'savings'
    end as account_type
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
  h.id as household_id,
  a.id as account_id,
  c.id as category_id,
  r.title,
  p.rollback_tag || ' row=' || lpad(r.row_no::text, 3, '0'),
  r.amount,
  'expense'::public.transaction_type,
  r.transaction_date,
  ines.id as created_by
from resolved r
cross join household h
cross join ines
join (
  select *, false as is_shared from ines_accounts
  union all
  select *, true as is_shared from shared_accounts
) a
  on lower(a.name) = lower(r.account_name)
 and a.type = r.account_type::public.account_type
 and (
   (r.platform = 'ActivoBank' and a.is_shared)
   or (r.platform <> 'ActivoBank' and not a.is_shared)
 )
join categories c
  on c.name = r.category_name
cross join params p
where not exists (
  select 1
  from public.transactions t
  where t.household_id = h.id
    and t.account_id = a.id
    and t.title = r.title
    and t.amount = r.amount
    and t.type = 'expense'::public.transaction_type
    and t.transaction_date::date = r.transaction_date
    and coalesce(t.notes, '') = p.rollback_tag || ' row=' || lpad(r.row_no::text, 3, '0')
);
