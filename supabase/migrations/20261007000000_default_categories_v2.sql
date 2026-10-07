-- Default categories v2: one idempotent source of truth for the default
-- category tree, used by
--   * the new-household trigger (create_default_categories),
--   * the "Add default categories" button (restore_default_categories RPC),
--   * scripts/seed_default_categories.sql,
--   * and the one-off backfill at the bottom of this file, which brings every
--     existing household onto the same structure.
--
-- Before this, three lists disagreed: the trigger seeded 18 flat English
-- categories with non-Ionicons icon names (wallet, zap, utensils...) that
-- render as missing glyphs; the app's button seeded a different 10x3 tree but
-- skipped any main name that already existed (so e.g. the trigger's
-- "Groceries" never got subcategories); and the SQL script wiped everything.
--
-- apply_default_categories() never deletes anything and never creates
-- duplicates:
--   * every catalog entry is matched against the household's existing rows of
--     the same type by its English name, Portuguese name, or a known alias
--     (old seed names, legacy trigger names) -- case-insensitively;
--   * the best match is kept, renamed to the canonical name in the household's
--     language (when that name is free), re-iconed, re-parented and re-sorted;
--   * any further matches are duplicates: everything that references them
--     (every FK to categories.id, child categories, Wage Flow category_ids) is
--     moved to the kept row, then the duplicate is archived -- not deleted;
--   * missing entries are created;
--   * categories that match nothing in the catalog (custom ones) are left
--     untouched, except that custom children of a merged duplicate follow it.
-- Running it again is a no-op.
--
-- Note: categories_unique_name is UNIQUE (household_id, type, name) across
-- every level, so subcategory names must be unique per type -- the catalog
-- below respects that, and its names/aliases never overlap between entries.

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create or replace function public.default_category_catalog()
returns table (
    key text,
    parent_key text,
    type public.category_type,
    name_en text,
    name_pt text,
    icon text,
    sort_order integer,
    aliases text[]
)
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
    select v.key, v.parent_key, v.type::public.category_type, v.name_en, v.name_pt, v.icon, v.sort_order, v.aliases
    from (values
    -- Expense main categories ----------------------------------------------
    ('housing',         null::text, 'expense', 'Housing',                      'Habitação',                        'home-outline',                        0, array[]::text[]),
    ('utilities',       null,       'expense', 'Utilities',                    'Serviços Públicos',                'flash-outline',                       1, array[]::text[]),
    ('groceries',       null,       'expense', 'Groceries',                    'Compras de Mercearia',             'cart-outline',                        2, array['alimentação','alimentacao']),
    ('transportation',  null,       'expense', 'Transportation',               'Transportes',                      'car-outline',                         3, array['transport','transporte']),
    ('health',          null,       'expense', 'Health & Wellness',            'Saúde & Bem-estar',                'medical-outline',                     4, array['healthcare','saúde','saude']),
    ('food',            null,       'expense', 'Food & Dining',                'Alimentação & Restauração',        'restaurant-outline',                  5, array['dining & entertainment','restauração & entretenimento']),
    ('leisure',         null,       'expense', 'Leisure & Entertainment',      'Lazer & Entretenimento',           'game-controller-outline',             6, array['entertainment','entretenimento','lazer']),
    ('travel',          null,       'expense', 'Travel',                       'Viagens',                          'airplane-outline',                    7, array['viagem']),
    ('shopping',        null,       'expense', 'Shopping & Personal Care',     'Compras & Cuidados Pessoais',      'bag-outline',                         8, array['shopping','compras']),
    ('family',          null,       'expense', 'Family & Education',           'Família & Educação',               'school-outline',                      9, array['education','educação','educacao']),
    ('pets',            null,       'expense', 'Pets',                         'Animais de Estimação',             'paw-outline',                        10, array['animais','animals']),
    ('gifts',           null,       'expense', 'Gifts & Donations',            'Presentes & Donativos',            'gift-outline',                       11, array[]::text[]),
    ('savings',         null,       'expense', 'Savings & Investments',        'Poupanças & Investimentos',        'trending-up-outline',                12, array['savings','poupança','poupanças']),
    ('debt',            null,       'expense', 'Debt & Financial Obligations', 'Dívidas & Obrigações Financeiras', 'card-outline',                       13, array[]::text[]),
    ('otherExpenses',   null,       'expense', 'Other Expenses',               'Outras Despesas',                  'ellipsis-horizontal-circle-outline', 14, array['other expense','outros','outro']),
    -- Housing
    ('rent',            'housing',  'expense', 'Rent & Mortgage',              'Renda & Crédito Habitação',        'key-outline',                0, array['rent','rent/mortgage','renda/hipoteca','renda']),
    ('condo',           'housing',  'expense', 'Condo Fees',                   'Condomínio',                       'business-outline',           1, array[]::text[]),
    ('homeInsurance',   'housing',  'expense', 'Home Insurance',               'Seguro de Habitação',              'shield-checkmark-outline',   2, array[]::text[]),
    ('maintenance',     'housing',  'expense', 'Maintenance & Repairs',        'Manutenção & Reparações',          'hammer-outline',             3, array[]::text[]),
    ('furniture',       'housing',  'expense', 'Furniture & Appliances',       'Mobília & Eletrodomésticos',       'bed-outline',                4, array[]::text[]),
    -- Utilities
    ('electricity',     'utilities','expense', 'Electricity',                  'Eletricidade',                     'flash-outline',              0, array[]::text[]),
    ('gas',             'utilities','expense', 'Gas',                          'Gás',                              'flame-outline',              1, array[]::text[]),
    ('water',           'utilities','expense', 'Water',                        'Água',                             'water-outline',              2, array[]::text[]),
    ('internet',        'utilities','expense', 'Internet & TV',                'Internet & TV',                    'wifi-outline',               3, array['internet & phone','internet & telefone']),
    ('mobile',          'utilities','expense', 'Mobile Phone',                 'Telemóvel',                        'phone-portrait-outline',     4, array[]::text[]),
    -- Groceries
    ('supermarket',     'groceries','expense', 'Supermarket',                  'Supermercado',                     'basket-outline',             0, array[]::text[]),
    ('freshFood',       'groceries','expense', 'Fresh Food & Markets',         'Frescos & Mercados',               'nutrition-outline',          1, array[]::text[]),
    ('supplies',        'groceries','expense', 'Household Supplies',           'Artigos para Casa',                'cube-outline',               2, array[]::text[]),
    -- Transportation
    ('fuel',            'transportation','expense', 'Fuel',                    'Combustível',                      'speedometer-outline',        0, array[]::text[]),
    ('publicTransport', 'transportation','expense', 'Public Transport',        'Transportes Públicos',             'bus-outline',                1, array['public transit']),
    ('carMaintenance',  'transportation','expense', 'Car Maintenance',         'Manutenção do Carro',              'construct-outline',          2, array['car maintenance & insurance','manutenção & seguro do carro']),
    ('carInsurance',    'transportation','expense', 'Car Insurance',           'Seguro Automóvel',                 'shield-outline',             3, array[]::text[]),
    ('parking',         'transportation','expense', 'Parking & Tolls',         'Estacionamento & Portagens',       'location-outline',           4, array[]::text[]),
    ('taxi',            'transportation','expense', 'Taxi & Ride-hailing',     'Táxi & TVDE',                      'car-sport-outline',          5, array[]::text[]),
    -- Health & Wellness
    ('appointments',    'health',   'expense', 'Medical Appointments',         'Consultas Médicas',                'pulse-outline',              0, array['doctor & pharmacy','médico & farmácia']),
    ('pharmacy',        'health',   'expense', 'Pharmacy',                     'Farmácia',                         'medkit-outline',             1, array[]::text[]),
    ('dentalOptical',   'health',   'expense', 'Dental & Optical',             'Dentista & Ótica',                 'eye-outline',                2, array[]::text[]),
    ('healthInsurance', 'health',   'expense', 'Health Insurance',             'Seguro de Saúde',                  'shield-checkmark-outline',   3, array[]::text[]),
    ('fitness',         'health',   'expense', 'Fitness & Sports',             'Desporto & Ginásio',               'barbell-outline',            4, array['fitness']),
    -- Food & Dining
    ('restaurants',     'food',     'expense', 'Restaurants',                  'Restaurantes',                     'restaurant-outline',         0, array['restaurants & takeout','restaurantes & take-away']),
    ('takeaway',        'food',     'expense', 'Takeaway & Delivery',          'Take-away & Entregas',             'fast-food-outline',          1, array[]::text[]),
    ('coffee',          'food',     'expense', 'Coffee & Snacks',              'Cafés & Lanches',                  'cafe-outline',               2, array[]::text[]),
    -- Leisure & Entertainment
    ('streaming',       'leisure',  'expense', 'Streaming & Subscriptions',    'Streaming & Subscrições',          'play-circle-outline',        0, array[]::text[]),
    ('events',          'leisure',  'expense', 'Events & Culture',             'Eventos & Cultura',                'ticket-outline',             1, array[]::text[]),
    ('hobbies',         'leisure',  'expense', 'Hobbies',                      'Passatempos',                      'color-palette-outline',      2, array['leisure & hobbies','lazer & passatempos']),
    -- Travel
    ('flights',         'travel',   'expense', 'Flights & Transport',          'Voos & Transportes',               'airplane-outline',           0, array[]::text[]),
    ('accommodation',   'travel',   'expense', 'Accommodation',                'Alojamento',                       'bed-outline',                1, array[]::text[]),
    ('travelActivities','travel',   'expense', 'Travel Activities',            'Atividades em Viagem',             'map-outline',                2, array[]::text[]),
    -- Shopping & Personal Care
    ('clothing',        'shopping', 'expense', 'Clothing & Shoes',             'Roupa & Calçado',                  'shirt-outline',              0, array['clothing','roupa']),
    ('personalCare',    'shopping', 'expense', 'Personal Care & Beauty',       'Cuidados Pessoais & Beleza',       'cut-outline',                1, array['personal care','cuidados pessoais']),
    ('electronics',     'shopping', 'expense', 'Electronics',                  'Eletrónica',                       'laptop-outline',             2, array['electronics & gadgets','eletrónica & gadgets']),
    -- Family & Education
    ('childcare',       'family',   'expense', 'Childcare',                    'Cuidados Infantis',                'people-outline',             0, array[]::text[]),
    ('school',          'family',   'expense', 'School & Tuition',             'Escola & Propinas',                'school-outline',             1, array['tuition & courses','propinas & cursos']),
    ('courses',         'family',   'expense', 'Courses & Books',              'Cursos & Livros',                  'book-outline',               2, array[]::text[]),
    ('kidsActivities',  'family',   'expense', 'Kids'' Activities',            'Atividades para Crianças',         'happy-outline',              3, array[]::text[]),
    -- Pets
    ('petSupplies',     'pets',     'expense', 'Pet Food & Supplies',          'Comida & Acessórios para Animais', 'basket-outline',             0, array[]::text[]),
    ('vet',             'pets',     'expense', 'Vet',                          'Veterinário',                      'medkit-outline',             1, array[]::text[]),
    -- Gifts & Donations
    ('giftsGiven',      'gifts',    'expense', 'Gifts',                        'Presentes',                        'gift-outline',               0, array[]::text[]),
    ('donations',       'gifts',    'expense', 'Donations & Charity',          'Donativos & Solidariedade',        'heart-outline',              1, array[]::text[]),
    -- Savings & Investments
    ('emergencyFund',   'savings',  'expense', 'Emergency Fund',               'Fundo de Emergência',              'umbrella-outline',           0, array[]::text[]),
    ('investments',     'savings',  'expense', 'Investments',                  'Investimentos',                    'stats-chart-outline',        1, array[]::text[]),
    ('retirement',      'savings',  'expense', 'Retirement',                   'Reforma',                          'hourglass-outline',          2, array[]::text[]),
    -- Debt & Financial Obligations
    ('loans',           'debt',     'expense', 'Loan Payments',                'Pagamento de Empréstimos',         'cash-outline',               0, array[]::text[]),
    ('creditCard',      'debt',     'expense', 'Credit Card Payments',         'Pagamento de Cartão de Crédito',   'card-outline',               1, array[]::text[]),
    ('taxes',           'debt',     'expense', 'Taxes',                        'Impostos',                         'document-text-outline',      2, array['taxes & fees','impostos & taxas']),
    ('bankFees',        'debt',     'expense', 'Bank Fees',                    'Comissões Bancárias',              'receipt-outline',            3, array[]::text[]),
    -- Income (flat) -------------------------------------------------------
    ('salary',          null,       'income',  'Salary',                       'Salário',                          'wallet-outline',                      0, array['wages','salários','ordenado','vencimento']),
    ('freelance',       null,       'income',  'Freelance & Self-Employment',  'Freelance & Trabalho Independente','briefcase-outline',                   1, array[]::text[]),
    ('bonus',           null,       'income',  'Bonus & Commissions',          'Bónus & Comissões',                'trophy-outline',                      2, array['bonus','bónus']),
    ('investmentIncome',null,       'income',  'Investment Income',            'Rendimento de Investimentos',      'trending-up-outline',                 3, array['investments','investimentos']),
    ('rentalIncome',    null,       'income',  'Rental Income',                'Rendimento de Arrendamento',       'home-outline',                        4, array[]::text[]),
    ('businessIncome',  null,       'income',  'Business Income',              'Rendimento de Negócio',            'storefront-outline',                  5, array[]::text[]),
    ('giftsInheritance',null,       'income',  'Gifts & Inheritance',          'Presentes & Heranças',             'gift-outline',                        6, array[]::text[]),
    ('refunds',         null,       'income',  'Refunds & Reimbursements',     'Reembolsos',                       'receipt-outline',                     7, array[]::text[]),
    ('benefits',        null,       'income',  'Government Benefits',          'Apoios do Estado',                 'shield-checkmark-outline',            8, array[]::text[]),
    ('otherIncome',     null,       'income',  'Other Income',                 'Outros Rendimentos',               'ellipsis-horizontal-circle-outline',  9, array[]::text[])
    ) as v(key, parent_key, type, name_en, name_pt, icon, sort_order, aliases);
$$;

COMMENT ON FUNCTION public.default_category_catalog() IS 'The default category tree (EN/PT names, Ionicons icon, order, and match aliases for older/legacy names). Single source of truth -- read by apply_default_categories().';

-- ---------------------------------------------------------------------------
-- Merge one category into another (same household + type)
-- ---------------------------------------------------------------------------
create or replace function public.merge_category_into(p_from uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
    v_from public.categories;
    v_to public.categories;
    r record;
begin
    if p_from is null or p_to is null or p_from = p_to then
        return;
    end if;

    select * into v_from from public.categories where id = p_from;
    select * into v_to from public.categories where id = p_to;

    if v_from.id is null or v_to.id is null then
        return;
    end if;

    if v_from.household_id <> v_to.household_id or v_from.type <> v_to.type then
        raise exception 'Can only merge categories of the same household and type.';
    end if;

    -- If the target is currently a child of the category being merged away,
    -- lift it to that category's parent first so the generic parent_id
    -- rewrite below can't make it its own parent.
    update public.categories
       set parent_id = v_from.parent_id
     where id = p_to
       and parent_id = p_from;

    -- One budget per category per month: when both have one for the same
    -- month, the target's wins.
    delete from public.category_budgets b
     where b.category_id = p_from
       and exists (
           select 1 from public.category_budgets o
            where o.category_id = p_to
              and o.effective_month = b.effective_month
       );

    -- Repoint every foreign key that references categories.id (including
    -- categories.parent_id, which moves the duplicate's children over).
    -- Discovered from the system catalog so a future FK is never missed.
    for r in
        select cl.relname as table_name, att.attname as column_name
          from pg_constraint con
          join pg_class cl on cl.oid = con.conrelid
          join pg_namespace ns on ns.oid = cl.relnamespace
          cross join lateral unnest(con.conkey, con.confkey) as k(attnum, fattnum)
          join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
          join pg_attribute fatt on fatt.attrelid = con.confrelid and fatt.attnum = k.fattnum
         where con.contype = 'f'
           and con.confrelid = 'public.categories'::regclass
           and ns.nspname = 'public'
           and fatt.attname = 'id'
    loop
        execute format('update public.%I set %I = $1 where %I = $2', r.table_name, r.column_name, r.column_name)
          using p_to, p_from;
    end loop;

    -- Wage Flow stores category ids in a text[] (no FK).
    update public.wage_flow_categories w
       set category_ids = array(
               select distinct x
                 from unnest(array_replace(w.category_ids, p_from::text, p_to::text)) as x
           )
     where w.household_id = v_from.household_id
       and p_from::text = any (w.category_ids);

    update public.categories
       set is_archived = true,
           is_default = false
     where id = p_from;
end;
$$;

COMMENT ON FUNCTION public.merge_category_into(uuid, uuid) IS 'Moves everything that references p_from (all FKs to categories.id, child categories, Wage Flow category_ids) onto p_to, then archives p_from. Same household and type only. Where both have a category budget for the same month, p_from''s is dropped.';

-- ---------------------------------------------------------------------------
-- Apply the catalog to one household (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.apply_default_categories(p_household_id uuid, p_locale text default null)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
    v_lang text;
    v_locale text := p_locale;
    r record;
    v_target text;
    v_names text[];
    v_parent uuid;
    v_canonical uuid;
    v_dup uuid;
    v_claimed uuid[] := array[]::uuid[];
    v_ids jsonb := '{}'::jsonb;
begin
    if p_household_id is null
       or not exists (select 1 from public.households where id = p_household_id) then
        return;
    end if;

    -- Serialize concurrent runs for the same household.
    perform pg_advisory_xact_lock(hashtext('apply_default_categories'), hashtext(p_household_id::text));

    if v_locale is null then
        select p.locale into v_locale
          from public.households h
          join public.profiles p on p.id = h.owner_id
         where h.id = p_household_id;
    end if;
    v_lang := case when lower(coalesce(v_locale, '')) like 'pt%' then 'pt' else 'en' end;

    -- Parents first, so every subcategory can resolve its parent's id.
    for r in
        select * from public.default_category_catalog() c
         order by (c.parent_key is not null), c.type, c.sort_order
    loop
        v_target := case when v_lang = 'pt' then r.name_pt else r.name_en end;
        v_names := array[lower(r.name_en), lower(r.name_pt)]
                   || coalesce((select array_agg(lower(a)) from unnest(r.aliases) as a), array[]::text[]);
        v_parent := case when r.parent_key is null then null else (v_ids ->> r.parent_key)::uuid end;

        -- Best existing match: exact name in the household's language, then
        -- the other language, then an alias; active before archived; older first.
        v_canonical := null;
        select c.id
          into v_canonical
          from public.categories c
         where c.household_id = p_household_id
           and c.type = r.type
           and lower(btrim(c.name)) = any (v_names)
           and not (c.id = any (v_claimed))
         order by (lower(btrim(c.name)) = lower(v_target)) desc,
                  (lower(btrim(c.name)) in (lower(r.name_en), lower(r.name_pt))) desc,
                  c.is_archived asc,
                  c.is_default desc,
                  c.created_at asc
         limit 1;

        if v_canonical is null then
            insert into public.categories (household_id, name, type, icon, parent_id, is_default, sort_order)
            values (p_household_id, v_target, r.type, r.icon, v_parent, true, r.sort_order)
            on conflict (household_id, type, name) do nothing
            returning id into v_canonical;

            if v_canonical is null then
                raise exception 'Default category "%" collides with another existing category.', v_target;
            end if;
        else
            -- Fold any other matches into the kept row.
            for v_dup in
                select c.id
                  from public.categories c
                 where c.household_id = p_household_id
                   and c.type = r.type
                   and lower(btrim(c.name)) = any (v_names)
                   and c.id <> v_canonical
                   and not (c.id = any (v_claimed))
            loop
                perform public.merge_category_into(v_dup, v_canonical);
            end loop;

            update public.categories c
               set name = case
                       when exists (
                           select 1 from public.categories o
                            where o.household_id = p_household_id
                              and o.type = r.type
                              and o.id <> v_canonical
                              and lower(o.name) = lower(v_target)
                       ) then c.name
                       else v_target
                   end,
                   icon = r.icon,
                   parent_id = v_parent,
                   sort_order = r.sort_order,
                   is_default = true
             where c.id = v_canonical;
        end if;

        -- Keep the tree two levels deep: if a row became a subcategory, any
        -- children it had (e.g. custom subs under the old flat "Restaurants")
        -- move up to its new parent.
        if v_parent is not null then
            update public.categories
               set parent_id = v_parent
             where parent_id = v_canonical;
        end if;

        v_claimed := v_claimed || v_canonical;
        v_ids := v_ids || jsonb_build_object(r.key, v_canonical);
    end loop;
end;
$$;

COMMENT ON FUNCTION public.apply_default_categories(uuid, text) IS 'Idempotently brings a household''s categories in line with default_category_catalog(): matches existing rows by EN/PT name or alias, renames/re-icons/re-parents them, merges duplicates (merge_category_into -- archive, not delete), and creates anything missing. Names use p_locale, else the owner''s profile locale (pt* -> Portuguese, otherwise English). Never touches unmatched custom categories.';

-- ---------------------------------------------------------------------------
-- Existing entry points now delegate to the catalog
-- ---------------------------------------------------------------------------
create or replace function public.create_default_categories(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
    perform public.apply_default_categories(p_household_id);
end;
$$;

-- App-facing RPC behind the Categories screen's "Add default categories".
create or replace function public.restore_default_categories(p_household_id uuid, p_locale text default null)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
    if auth.uid() is null or not public.is_household_member(p_household_id, auth.uid()) then
        raise exception 'You do not have access to this household.' using errcode = '42501';
    end if;

    perform public.apply_default_categories(p_household_id, p_locale);
end;
$$;

COMMENT ON FUNCTION public.restore_default_categories(uuid, text) IS 'Member-only wrapper around apply_default_categories(): adds missing default categories and fixes names/icons/structure without creating duplicates.';

-- Monthly wages now land in Salary ("Wages" is merged into it by the
-- backfill); still falls back to a "Wages" category if one is around.
create or replace function public.categorize_monthly_budget_wage()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
    if new.category_id is null
       and new.monthly_budget_run_id is not null
       and new.budget_section = 'income'
       and new.type = 'income'
       and new.transfer_group_id is null
       and new.title like 'Monthly wage:%' then
        select category.id
          into new.category_id
          from public.categories as category
         where category.household_id = new.household_id
           and category.type = 'income'
           and lower(category.name) in ('salary', 'salário', 'wages')
         order by category.is_archived asc,
                  (lower(category.name) = 'wages') asc,
                  category.created_at asc
         limit 1;
    end if;

    return new;
end;
$$;

-- Deleting a category moves its transactions to "Other Expenses"/"Other
-- Income" -- now also recognised by their Portuguese names.
create or replace function public.reassign_transactions_before_category_delete()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
    v_fallback_category_id uuid;
begin
    select c.id
      into v_fallback_category_id
      from public.categories c
     where c.household_id = old.household_id
       and c.type = old.type
       and c.id <> old.id
       and (
         (old.type = 'income' and lower(c.name) in ('other income', 'outros rendimentos'))
         or
         (old.type = 'expense' and lower(c.name) in ('other expenses', 'other expense', 'outras despesas'))
       )
     order by c.is_archived asc, c.is_default desc, c.sort_order asc, c.created_at asc
     limit 1;

    if v_fallback_category_id is null then
        update public.transactions t
           set category_id = null
         where t.category_id = old.id;
    else
        update public.transactions t
           set category_id = v_fallback_category_id
         where t.category_id = old.id;
    end if;

    return old;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions: only the member-checked RPC is callable from the app.
-- (create_default_categories used to be callable by anyone for any
-- household; only the household-insert trigger needs it.)
-- ---------------------------------------------------------------------------
revoke all on function public.default_category_catalog() from public, anon, authenticated;
revoke all on function public.merge_category_into(uuid, uuid) from public, anon, authenticated;
revoke all on function public.apply_default_categories(uuid, text) from public, anon, authenticated;
revoke all on function public.create_default_categories(uuid) from public, anon, authenticated;
revoke all on function public.restore_default_categories(uuid, text) from public, anon;
grant execute on function public.restore_default_categories(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill every existing household.
-- ---------------------------------------------------------------------------
do $$
declare
    v_household_id uuid;
begin
    for v_household_id in
        select h.id from public.households h where h.deleted_at is null order by h.created_at
    loop
        perform public.apply_default_categories(v_household_id);
    end loop;
end;
$$;
