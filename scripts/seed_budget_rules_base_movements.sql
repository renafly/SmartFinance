-- Seed the monthly budget rules for Dias Pereira.
--
-- Every transfer starts in the shared ActivoBank account. The script is
-- idempotent: re-running it updates these named rules instead of duplicating
-- them. It aborts before changing anything if a required account, profile, or
-- active budget configuration cannot be found.
--
-- Monthly total: 3,264.00 EUR
--   Renato: 1,400.00 EUR
--   Ines:   1,400.00 EUR
--   Shared:   464.00 EUR
--
-- Rollback:
-- delete from public.budget_rules
-- where budget_config_id in (
--   select bc.id
--   from public.budget_configs bc
--   join public.households h on h.id = bc.household_id
--   where h.name = 'Dias Pereira'
-- )
-- and name in (
--   'Renato - Investment - XTB',
--   'Renato - Investment - Trade Republic',
--   'Renato - Savings - Trade Republic',
--   'Renato - Savings - Trading 212',
--   'Ines - Investment - XTB',
--   'Ines - Investment - Trade Republic',
--   'Ines - Savings - Trade Republic',
--   'Ines - Savings - Trading 212',
--   'Shared - Ferias',
--   'Shared - Prendas',
--   'Shared - Roupa',
--   'Shared - Despesas do mes',
--   'Shared - Saude'
-- );

do $$
declare
  v_household_id uuid;
  v_budget_config_id uuid;
  v_source_account_id uuid;
  v_owner_id uuid;
  v_destination_account_id uuid;
  v_existing_rule_id uuid;
  v_rule record;
begin
  select h.id
    into v_household_id
    from public.households h
   where h.name = 'Dias Pereira'
   limit 1;

  if v_household_id is null then
    raise exception 'Household "Dias Pereira" was not found.';
  end if;

  select bc.id
    into v_budget_config_id
    from public.budget_configs bc
   where bc.household_id = v_household_id
     and bc.is_active
   limit 1;

  if v_budget_config_id is null then
    raise exception 'Dias Pereira has no active monthly budget configuration.';
  end if;

  select a.id
    into v_source_account_id
    from public.accounts a
   where a.household_id = v_household_id
     and a.name = 'ActivoBank'
     and a.type = 'bank'
     and a.owner_profile_id is null
   limit 1;

  if v_source_account_id is null then
    raise exception 'Shared ActivoBank source account was not found.';
  end if;

  for v_rule in
    select *
    from (values
      (10,  'Renato - Investment - XTB',             'renafly@gmail.com',             'XTB',             'investment',  50.00::numeric, 'investments'),
      (20,  'Renato - Investment - Trade Republic',  'renafly@gmail.com',             'Trade Republic',  'investment',  50.00::numeric, 'investments'),
      (30,  'Renato - Savings - Trade Republic',     'renafly@gmail.com',             'Trade Republic',  'savings',    650.00::numeric, 'savings'),
      (40,  'Renato - Savings - Trading 212',        'renafly@gmail.com',             'Trading 212',     'savings',    650.00::numeric, 'savings'),
      (50,  'Ines - Investment - XTB',               'ines.salvado.dias@gmail.com',  'XTB',             'investment',  50.00::numeric, 'investments'),
      (60,  'Ines - Investment - Trade Republic',    'ines.salvado.dias@gmail.com',  'Trade Republic',  'investment',  50.00::numeric, 'investments'),
      (70,  'Ines - Savings - Trade Republic',       'ines.salvado.dias@gmail.com',  'Trade Republic',  'savings',    650.00::numeric, 'savings'),
      (80,  'Ines - Savings - Trading 212',          'ines.salvado.dias@gmail.com',  'Trading 212',     'savings',    650.00::numeric, 'savings'),
      (90,  'Shared - Ferias',                       null,                              'Ferias',          'bank',       200.00::numeric, 'pots'),
      (100, 'Shared - Prendas',                      null,                              'Prendas',         'bank',        50.00::numeric, 'pots'),
      (110, 'Shared - Roupa',                        null,                              'Roupa',           'bank',        50.00::numeric, 'pots'),
      (120, 'Shared - Despesas do mes',              null,                              'Despesas do mes', 'bank',       114.00::numeric, 'pots'),
      (130, 'Shared - Saude',                        null,                              'Saude',           'bank',        50.00::numeric, 'pots')
    ) as rules(priority, name, owner_email, destination_name, destination_type, amount, section)
  loop
    v_owner_id := null;

    if v_rule.owner_email is not null then
      select p.id
        into v_owner_id
        from public.profiles p
       where lower(p.email) = lower(v_rule.owner_email)
       limit 1;

      if v_owner_id is null then
        raise exception 'Profile "%" was not found.', v_rule.owner_email;
      end if;
    end if;

    select a.id
      into v_destination_account_id
      from public.accounts a
     where a.household_id = v_household_id
       and a.owner_profile_id is not distinct from v_owner_id
       and lower(a.name) = lower(v_rule.destination_name)
       and a.type = v_rule.destination_type::public.account_type
     limit 1;

    if v_destination_account_id is null then
      raise exception 'Destination account "%" (%) for rule "%" was not found.',
        v_rule.destination_name, v_rule.destination_type, v_rule.name;
    end if;

    select br.id
      into v_existing_rule_id
      from public.budget_rules br
     where br.budget_config_id = v_budget_config_id
       and br.name = v_rule.name
     limit 1;

    if v_existing_rule_id is null then
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
        is_active,
        active_months
      )
      values (
        v_budget_config_id,
        v_rule.name,
        v_rule.section::public.monthly_budget_section,
        v_source_account_id,
        v_destination_account_id,
        v_owner_id,
        v_rule.amount,
        'monthly'::public.recurring_frequency,
        v_rule.priority,
        true,
        '{}'::smallint[]
      );
    else
      update public.budget_rules
         set section = v_rule.section::public.monthly_budget_section,
             source_account_id = v_source_account_id,
             destination_account_id = v_destination_account_id,
             owner_member_id = v_owner_id,
             amount = v_rule.amount,
             frequency = 'monthly'::public.recurring_frequency,
             priority = v_rule.priority,
             is_active = true,
             active_months = '{}'::smallint[],
             active_from_month = null,
             active_to_month = null,
             deleted_at = null
       where id = v_existing_rule_id;
    end if;
  end loop;
end;
$$;
