-- Regression test for the split-transaction funding-source feature
-- (public.transaction_allocations / public.save_transaction_allocations).
--
-- Unlike recurring_execution_household.sql, this test does not depend on
-- pre-existing seed data: it builds its own auth user, profile, household,
-- accounts and saving pot inside the transaction, and rolls everything
-- back at the end, so it is safe to run against any migrated database.
--
-- save_transaction_allocations() is `security invoker` and gates on
-- is_household_member(household_id, auth.uid()), so after the fixtures are
-- created (as the superuser session, bypassing RLS) we impersonate the
-- fixture user via the standard Supabase local-testing pattern
-- (request.jwt.claim.sub / request.jwt.claims + `set local role
-- authenticated`) before exercising the RPC the same way the app does.

begin;

do $$
declare
    v_user_id uuid := gen_random_uuid();
    v_household_id uuid;
    v_account_a uuid;
    v_account_b uuid;
    v_account_c uuid; -- the pot's own backing account
    v_pot_id uuid;
    v_transaction_id uuid;
    v_allocation_count int;
    v_is_split boolean;
    v_account_balance numeric;
    v_pot_balance numeric;
    v_error_caught boolean;
    v_movement_allocations jsonb;
begin
    -- ------------------------------------------------------------
    -- Fixtures (run as the superuser session, bypassing RLS)
    -- ------------------------------------------------------------
    insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin,
        confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
        '00000000-0000-0000-0000-000000000000',
        v_user_id, 'authenticated', 'authenticated',
        'split-allocations-test@example.com',
        crypt('password123', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}', '{}', false,
        '', '', '', ''
    );

    insert into public.profiles (id, email, full_name)
    values (v_user_id, 'split-allocations-test@example.com', 'Split Test User');

    insert into public.households (name, owner_id)
    values ('Split Allocations Test Household', v_user_id)
    returning id into v_household_id;

    insert into public.household_members (household_id, user_id, role, status)
    values (v_household_id, v_user_id, 'owner', 'accepted');

    insert into public.accounts (household_id, name, type, currency)
    values (v_household_id, 'Test Checking', 'bank', 'EUR')
    returning id into v_account_a;

    insert into public.accounts (household_id, name, type, currency)
    values (v_household_id, 'Test Savings', 'savings', 'EUR')
    returning id into v_account_b;

    insert into public.accounts (household_id, name, type, currency)
    values (v_household_id, 'Pot Backing Account', 'savings', 'EUR')
    returning id into v_account_c;

    insert into public.saving_pots (household_id, name, created_by)
    values (v_household_id, 'Test Pot', v_user_id)
    returning id into v_pot_id;

    insert into public.saving_pot_accounts (pot_id, account_id)
    values (v_pot_id, v_account_c);

    -- Impersonate the fixture user for the rest of the test.
    perform set_config('request.jwt.claim.sub', v_user_id::text, true);
    perform set_config(
        'request.jwt.claims',
        json_build_object('sub', v_user_id, 'role', 'authenticated')::text,
        true
    );
    set local role authenticated;

    insert into public.transactions (
        household_id, account_id, title, amount, type, created_by
    ) values (
        v_household_id, v_account_a, 'Split grocery run', 100.00, 'expense', v_user_id
    )
    returning id into v_transaction_id;

    -- ------------------------------------------------------------
    -- 1. Happy path: two-way split, values sum exactly to the total.
    -- ------------------------------------------------------------
    perform public.save_transaction_allocations(
        v_transaction_id,
        jsonb_build_array(
            jsonb_build_object('source_type', 'account', 'account_id', v_account_a, 'pot_id', null, 'amount', 60.00),
            jsonb_build_object('source_type', 'account', 'account_id', v_account_b, 'pot_id', null, 'amount', 40.00)
        )
    );

    select count(*) into v_allocation_count
    from public.transaction_allocations
    where transaction_id = v_transaction_id;

    if v_allocation_count <> 2 then
        raise exception 'Expected 2 allocation rows after a valid split save, got %', v_allocation_count;
    end if;

    select is_split into v_is_split from public.transactions where id = v_transaction_id;
    if not v_is_split then
        raise exception 'Transaction was not flagged is_split=true after a valid split save';
    end if;

    select current_balance into v_account_balance
    from public.account_balances
    where id = v_account_b;

    if v_account_balance is distinct from -40.00 then
        raise exception 'account_balances did not reflect the split allocation for account B (expected -40.00, got %)', v_account_balance;
    end if;

    -- ------------------------------------------------------------
    -- 2. Sum mismatch is rejected.
    -- ------------------------------------------------------------
    v_error_caught := false;
    begin
        perform public.save_transaction_allocations(
            v_transaction_id,
            jsonb_build_array(
                jsonb_build_object('source_type', 'account', 'account_id', v_account_a, 'pot_id', null, 'amount', 60.00),
                jsonb_build_object('source_type', 'account', 'account_id', v_account_b, 'pot_id', null, 'amount', 30.00)
            )
        );
    exception when others then
        v_error_caught := true;
    end;
    if not v_error_caught then
        raise exception 'save_transaction_allocations accepted allocations that did not sum to the transaction amount';
    end if;

    -- ------------------------------------------------------------
    -- 3. Duplicate source is rejected.
    -- ------------------------------------------------------------
    v_error_caught := false;
    begin
        perform public.save_transaction_allocations(
            v_transaction_id,
            jsonb_build_array(
                jsonb_build_object('source_type', 'account', 'account_id', v_account_a, 'pot_id', null, 'amount', 50.00),
                jsonb_build_object('source_type', 'account', 'account_id', v_account_a, 'pot_id', null, 'amount', 50.00)
            )
        );
    exception when others then
        v_error_caught := true;
    end;
    if not v_error_caught then
        raise exception 'save_transaction_allocations accepted duplicate account sources on the same transaction';
    end if;

    -- ------------------------------------------------------------
    -- 4. A pot allocation cannot also target one of that pot's own
    --    backing accounts on the same transaction (double-counting guard).
    -- ------------------------------------------------------------
    v_error_caught := false;
    begin
        perform public.save_transaction_allocations(
            v_transaction_id,
            jsonb_build_array(
                jsonb_build_object('source_type', 'pot', 'account_id', null, 'pot_id', v_pot_id, 'amount', 50.00),
                jsonb_build_object('source_type', 'account', 'account_id', v_account_c, 'pot_id', null, 'amount', 50.00)
            )
        );
    exception when others then
        v_error_caught := true;
    end;
    if not v_error_caught then
        raise exception 'save_transaction_allocations accepted a pot allocation alongside one of its own backing accounts';
    end if;

    -- ------------------------------------------------------------
    -- 5. A pot allocation on its own (not paired with its backing
    --    account) is accepted and flows into saving_pot_balances.
    -- ------------------------------------------------------------
    perform public.save_transaction_allocations(
        v_transaction_id,
        jsonb_build_array(
            jsonb_build_object('source_type', 'pot', 'account_id', null, 'pot_id', v_pot_id, 'amount', 70.00),
            jsonb_build_object('source_type', 'account', 'account_id', v_account_a, 'pot_id', null, 'amount', 30.00)
        )
    );

    select balance into v_pot_balance
    from public.saving_pot_balances
    where id = v_pot_id;

    if v_pot_balance is distinct from -70.00 then
        raise exception 'saving_pot_balances did not reflect the split allocation for the pot (expected -70.00, got %)', v_pot_balance;
    end if;

    -- ------------------------------------------------------------
    -- 5b. list_transaction_movements surfaces the allocations
    --     breakdown for a split transaction (used by the transaction
    --     list's split/multi-account detail -- see
    --     20260821090000_transaction_movements_allocations.sql).
    -- ------------------------------------------------------------
    select allocations
    into v_movement_allocations
    from public.list_transaction_movements(v_household_id, p_limit := 50)
    where transaction_id = v_transaction_id;

    if v_movement_allocations is null then
        raise exception 'list_transaction_movements returned null allocations for a split transaction';
    end if;

    if jsonb_array_length(v_movement_allocations) <> 2 then
        raise exception 'Expected list_transaction_movements to return 2 allocation entries, got %', jsonb_array_length(v_movement_allocations);
    end if;

    if not exists (
        select 1 from jsonb_array_elements(v_movement_allocations) entry
        where entry->>'source_type' = 'pot'
          and entry->>'pot_name' = 'Test Pot'
          and (entry->>'amount')::numeric = 70.00
    ) then
        raise exception 'list_transaction_movements allocations entry for the pot did not match the expected name/amount';
    end if;

    if not exists (
        select 1 from jsonb_array_elements(v_movement_allocations) entry
        where entry->>'source_type' = 'account'
          and entry->>'account_name' = 'Test Checking'
          and (entry->>'amount')::numeric = 30.00
    ) then
        raise exception 'list_transaction_movements allocations entry for the account did not match the expected name/amount';
    end if;

    -- ------------------------------------------------------------
    -- 6. Empty allocation array reverts the transaction to a normal
    --    (non-split) row and removes the allocation rows.
    -- ------------------------------------------------------------
    perform public.save_transaction_allocations(v_transaction_id, '[]'::jsonb);

    select count(*) into v_allocation_count
    from public.transaction_allocations
    where transaction_id = v_transaction_id;

    if v_allocation_count <> 0 then
        raise exception 'Expected 0 allocation rows after reverting to a non-split transaction, got %', v_allocation_count;
    end if;

    select is_split into v_is_split from public.transactions where id = v_transaction_id;
    if v_is_split then
        raise exception 'Transaction was still flagged is_split=true after allocations were cleared';
    end if;

    select allocations
    into v_movement_allocations
    from public.list_transaction_movements(v_household_id, p_limit := 50)
    where transaction_id = v_transaction_id;

    if v_movement_allocations is not null then
        raise exception 'list_transaction_movements still returned an allocations breakdown after the transaction was reverted to non-split';
    end if;
end;
$$;

rollback;
