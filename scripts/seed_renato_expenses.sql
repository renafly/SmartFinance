-- Seed Renato's expense transactions from the pasted export.
--
-- Category mapping used:
-- - Outro / Outros -> Other Expenses
-- - Saude -> Healthcare
-- - Alimentacao -> Groceries
-- - Lazer -> Entertainment
-- - Transporte -> Transport
-- - Casa -> Utilities
-- - Animais -> Other Expenses
-- - Viagem -> Travel
-- - Roupa -> Shopping
--
-- Rollback:
-- delete from public.transactions where notes like '[seed-renato-expenses]%';

with params as (
  select '[seed-renato-expenses]'::text as rollback_tag
),
household as (
  select h.id
  from public.households h
  where h.name = 'Dias Pereira'
  limit 1
),
renato as (
  select p.id
  from public.profiles p
  where p.email = 'renafly@gmail.com'
  limit 1
),
renato_accounts as (
  select a.id, a.name, a.type, a.owner_profile_id
  from public.accounts a
  join household h on h.id = a.household_id
  join renato r on r.id = a.owner_profile_id
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
    ( 1, date '2026-01-01', 'Generico',                    'Outro',      'Trade Republic', 303.13::numeric ),
    ( 2, date '2026-02-01', 'Generico',                    'Outro',      'Trade Republic', 119.15::numeric ),
    ( 3, date '2026-02-01', 'Generico',                    'Outro',      'Trading212',     168.49::numeric ),
    ( 4, date '2026-03-01', 'Generico',                    'Outro',      'Trade Republic', 170.78::numeric ),
    ( 5, date '2026-03-01', 'Generico',                    'Outro',      'Trading212',     514.56::numeric ),
    ( 6, date '2026-04-01', 'Fisioterapia',                'Saude',      'Trading212',      25.14::numeric ),
    ( 7, date '2026-04-01', 'Lidl Cata',                   'Alimentacao','Trading212',      12.43::numeric ),
    ( 8, date '2026-04-01', 'Roupa despedida solteiro Tiago','Outro',    'Trading212',      25.89::numeric ),
    ( 9, date '2026-04-01', 'Prenda do Manuel',            'Lazer',      'Trading212',      26.85::numeric ),
    (10, date '2026-04-01', 'Tshirts despedida solteiro Tiago','Outro',   'Trading212',     226.44::numeric ),
    (11, date '2026-04-01', 'HBO Max',                     'Lazer',      'Trade Republic',  13.99::numeric ),
    (12, date '2026-04-01', 'Almoco sexta tiago',          'Lazer',      'Trading212',      96.60::numeric ),
    (13, date '2026-04-01', 'Almoco escritorio',           'Lazer',      'Trading212',      18.12::numeric ),
    (14, date '2026-04-01', 'beer',                        'Lazer',      'Trading212',       5.40::numeric ),
    (15, date '2026-04-01', 'Wells',                       'Saude',      'Trading212',       3.85::numeric ),
    (16, date '2026-04-01', 'Continente',                  'Viagem',     'Trade Republic',   2.10::numeric ),
    (17, date '2026-04-01', 'Almoco Sao Miguel',           'Viagem',     'Trade Republic', 177.05::numeric ),
    (18, date '2026-04-01', 'Azores brewing',              'Viagem',     'Trade Republic',  47.75::numeric ),
    (19, date '2026-04-01', 'Continente',                  'Viagem',     'Trade Republic',   2.10::numeric ),
    (20, date '2026-04-01', 'Continente',                  'Viagem',     'Trade Republic', 126.62::numeric ),
    (21, date '2026-04-01', 'Continente',                  'Viagem',     'Trade Republic',   5.20::numeric ),
    (22, date '2026-04-01', 'Bar casa da montanha',        'Viagem',     'Trade Republic',   2.80::numeric ),
    (23, date '2026-04-01', 'Aldi',                        'Alimentacao','Trading212',      19.35::numeric ),
    (24, date '2026-04-01', 'Fisioterapia',                'Saude',      'Trading212',      33.52::numeric ),
    (25, date '2026-04-01', 'Farmcia Alem Tejo',           'Saude',      'Trading212',      45.12::numeric ),
    (26, date '2026-04-01', 'Rent a car Sao miguel',       'Viagem',     'Trading212',     215.00::numeric ),
    (27, date '2026-04-01', 'Trianon',                     'Viagem',     'Trading212',       9.10::numeric ),
    (28, date '2026-04-01', 'Atalhos de Lava BAR',         'Viagem',     'Trading212',      32.00::numeric ),
    (29, date '2026-04-01', 'Adega do vulcao',             'Viagem',     'Trading212',      54.00::numeric ),
    (30, date '2026-04-01', 'Caffe 5',                     'Viagem',     'Trading212',     141.10::numeric ),
    (31, date '2026-04-01', 'Azores wine company',         'Viagem',     'Trading212',      57.00::numeric ),
    (32, date '2026-05-01', 'Relogio',                     'Roupa',      'Trading212',       5.00::numeric ),
    (33, date '2026-05-01', 'Custura',                     'Roupa',      'Trading212',      27.50::numeric ),
    (34, date '2026-05-01', 'Almoco',                      'Alimentacao','Trading212',      18.50::numeric ),
    (35, date '2026-05-01', 'Uber',                        'Transporte', 'Trading212',      12.94::numeric ),
    (36, date '2026-05-01', 'Almoco',                      'Alimentacao','Trading212',      21.68::numeric ),
    (37, date '2026-05-01', 'Fisioterapia',                'Saude',      'Trading212',      25.14::numeric ),
    (38, date '2026-05-01', 'Almoco',                      'Alimentacao','Trading212',      97.50::numeric ),
    (39, date '2026-05-01', 'HBO Max',                     'Lazer',      'Trade Republic',  13.99::numeric ),
    (40, date '2026-05-01', 'Zooplus',                     'Animais',    'Trade Republic',  71.33::numeric ),
    (41, date '2026-05-01', 'Continente',                  'Casa',       'Trade Republic',  24.22::numeric ),
    (42, date '2026-05-01', 'Botija de gas',               'Casa',       'Trading212',      43.10::numeric ),
    (43, date '2026-05-01', 'Fisioterapia',                'Saude',      'Trading212',       8.38::numeric ),
    (44, date '2026-05-01', 'Areia do gatos',              'Animais',    'Trading212',      42.56::numeric ),
    (45, date '2026-05-01', 'Metro',                       'Transporte', 'Trading212',       7.00::numeric ),
    (46, date '2026-05-01', 'Almoco mais cerveja',         'Alimentacao','Trading212',      30.70::numeric ),
    (47, date '2026-05-01', 'Lidl',                        'Alimentacao','Trading212',      16.21::numeric ),
    (48, date '2026-05-01', 'Ventoinhas casamento',        'Outro',      'Trading212',      14.40::numeric ),
    (49, date '2026-05-01', 'Combustivel mais tabaco',     'Outro',      'Trading212',      22.00::numeric ),
    (50, date '2026-05-01', 'Almoco restaurante da joana', 'Alimentacao','Trading212',      44.15::numeric ),
    (51, date '2026-05-01', 'Prenda da nocas',             'Outro',      'Trading212',      36.48::numeric ),
    (52, date '2026-06-01', 'Ferias Trading212',           'Viagem',     'Trading212',    1036.92::numeric ),
    (53, date '2026-06-01', 'Ferias Trade Republic',       'Viagem',     'Trade Republic',  58.88::numeric ),
    (54, date '2026-06-01', 'HBO Max',                     'Lazer',      'Trade Republic',  13.99::numeric ),
    (55, date '2026-06-25', 'Combustivel',                 'Casa',       'Trade Republic',  20.00::numeric ),
    (56, date '2026-06-29', 'Bola sabado',                 'Lazer',      'ActivoBank',       2.25::numeric ),
    (57, date '2026-06-29', 'lidl',                        'Outros',     'ActivoBank',      19.71::numeric ),
    (58, date '2026-06-29', 'alimentacao gatos',           'Outros',     'ActivoBank',      66.96::numeric )
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
      when 'alimentacao' then 'Groceries'
      when 'lazer' then 'Entertainment'
      when 'transporte' then 'Transport'
      when 'casa' then 'Utilities'
      when 'animais' then 'Other Expenses'
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
  renato.id as created_by
from resolved r
cross join household h
cross join renato
join (
  select *, false as is_shared from renato_accounts
  union all
  select *, true as is_shared from shared_accounts
) a
  on a.name = r.account_name
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
