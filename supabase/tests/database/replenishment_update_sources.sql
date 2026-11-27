-- Regression test for public.update_replenishment_run_sources: editing which
-- account funded each covered transaction of an already-confirmed
-- replenishment run.
--
-- Same style as transaction_allocations.sql: builds its own user, household
-- and accounts inside the transaction, confirms a real run through
-- confirm_replenishment_run, exercises the new RPC as the fixture user and
-- rolls everything back at the end -- safe against any migrated database.
--
-- transaction_allocations' integrity trigger is DEFERRABLE INITIALLY
-- DEFERRED, so after every successful call the test forces the deferred
-- checks with `set constraints all immediate` (they would otherwise never
-- run, since the test ends in a rollback).

begin;

do $$
declare
    v_user_id uuid := gen_random_uuid();
    v_household_id uuid;
    v_orig uuid;
    v_saude uuid;
    v_activo uuid;
    v_trade uuid;
    v_potbank uuid;
    v_pot uuid;
    v_t1 uuid;
    v_t2 uuid;
    v_t3 uuid;
    v_t4 uuid;
    v_t5 uuid;
    v_t6 uuid;
    v_t7 uuid;
    v_t8 uuid;
    v_run_id uuid;
    v_draft_run_id uuid;
    v_unit_sources jsonb;
    v_tx public.transactions%rowtype;
    v_count int;
    v_amount numeric;
    v_total numeric;
    v_error_caught boolean;
begin
    -- ------------------------------------------------------------
    -- Fixtures (superuser session, bypassing RLS)
    -- ------------------------------------------------------------
    insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin,
        confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
        '00000000-0000-0000-0000-000000000000',
        v_user_id, 'authenticated', 'authenticated',
        'replenishment-edit-sources-test@example.com',
        crypt('password123', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}', '{}', false,
        '', '', '', ''
    );

    insert into public.profiles (id, email, full_name)
    values (v_user_id, 'replenishment-edit-sources-test@example.com', 'Edit Sources Test User')
    on conflict (id) do nothing; -- handle_new_user (on_auth_user_created) may already have created it

    insert into public.households (name, owner_id)
    values ('Edit Sources Test Household', v_user_id)
    returning id into v_household_id;

    insert into public.household_members (household_id, user_id, role, status)
    values (v_household_id, v_user_id, 'owner', 'accepted');

    insert into public.accounts (household_id, name, type, currency)
    values (v_household_id, 'Trading 212', 'bank', 'EUR') returning id into v_orig;
    insert into public.accounts (household_id, name, type, currency)
    values (v_household_id, 'Saude', 'savings', 'EUR') returning id into v_saude;
    insert into public.accounts (household_id, name, type, currency)
    values (v_household_id, 'Activo Bank', 'bank', 'EUR') returning id into v_activo;
    insert into public.accounts (household_id, name, type, currency)
    values (v_household_id, 'Trade Republic', 'bank', 'EUR') returning id into v_trade;
    insert into public.accounts (household_id, name, type, currency)
    values (v_household_id, 'Pot Bank', 'savings', 'EUR') returning id into v_potbank;
    insert into public.saving_pots (household_id, name, created_by)
    values (v_household_id, 'Ferias', v_user_id) returning id into v_pot;
    insert into public.saving_pot_accounts (pot_id, account_id) values (v_pot, v_potbank);

    perform set_config('request.jwt.claim.sub', v_user_id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_user_id, 'role', 'authenticated')::text, true);
    set local role authenticated;

    insert into public.transactions (household_id, account_id, title, amount, type, created_by)
    values (v_household_id, v_orig, 'Prenda', 64.15, 'expense', v_user_id) returning id into v_t1;
    insert into public.transactions (household_id, account_id, title, amount, type, created_by)
    values (v_household_id, v_orig, 'Eco', 140.00, 'expense', v_user_id) returning id into v_t2;
    insert into public.transactions (household_id, account_id, title, amount, type, created_by)
    values (v_household_id, v_orig, 'Continente', 7.38, 'expense', v_user_id) returning id into v_t3;
    insert into public.transactions (household_id, account_id, title, amount, type, created_by)
    values (v_household_id, v_orig, 'Reimbursed', 100.00, 'expense', v_user_id) returning id into v_t4;
    insert into public.transactions (household_id, account_id, title, amount, type, created_by)
    values (v_household_id, v_orig, 'Edited later', 10.00, 'expense', v_user_id) returning id into v_t5;
    insert into public.transactions (household_id, account_id, title, amount, type, created_by)
    values (v_household_id, v_orig, 'From pot', 50.00, 'expense', v_user_id) returning id into v_t6;
    insert into public.transactions (household_id, account_id, title, amount, type, created_by)
    values (v_household_id, v_orig, 'Later to pot bank', 20.00, 'expense', v_user_id) returning id into v_t7;
    insert into public.transactions (household_id, account_id, title, amount, type, created_by)
    values (v_household_id, v_orig, 'Split before run', 100.00, 'expense', v_user_id) returning id into v_t8;
    -- T8 was already split before the run: Trading 212 60 + Trade Republic 40.
    perform public.save_transaction_allocations(v_t8, jsonb_build_array(
        jsonb_build_object('source_type', 'account', 'account_id', v_orig, 'pot_id', null, 'amount', 60.00),
        jsonb_build_object('source_type', 'account', 'account_id', v_trade, 'pot_id', null, 'amount', 40.00)
    ));

    insert into public.transaction_reimbursements (household_id, transaction_id, payer_name, amount, created_by)
    values (v_household_id, v_t4, 'Carlos', 30.00, v_user_id);

    -- One confirmed run: T1 -> Saude, T2 -> Activo, T3 -> Saude 3.00 + Activo 4.38,
    -- T4 (70 replenishable of 100) -> Saude, T5 -> Saude, T6 -> pot Ferias
    -- (backed by Pot Bank), T7 -> Saude, T8's Trading 212 slice -> Saude and
    -- its Trade Republic slice -> Activo.
    insert into public.replenishment_runs (household_id, status, total_amount, created_by)
    values (v_household_id, 'draft', 461.53, v_user_id) returning id into v_run_id;

    insert into public.replenishment_run_transactions (run_id, transaction_id, account_id, amount, transaction_date)
    values (v_run_id, v_t1, v_orig, 64.15, now()),
           (v_run_id, v_t2, v_orig, 140.00, now()),
           (v_run_id, v_t3, v_orig, 7.38, now()),
           (v_run_id, v_t4, v_orig, 70.00, now()),
           (v_run_id, v_t5, v_orig, 10.00, now()),
           (v_run_id, v_t6, v_orig, 50.00, now()),
           (v_run_id, v_t7, v_orig, 20.00, now()),
           (v_run_id, v_t8, v_orig, 60.00, now()),
           (v_run_id, v_t8, v_trade, 40.00, now());

    insert into public.replenishment_run_sources (run_id, source_kind, resolved_account_id, amount, suggested_amount, sort_order)
    values (v_run_id, 'account', v_saude, 227.15, 227.15, 0),
           (v_run_id, 'account', v_activo, 184.38, 184.38, 1);
    insert into public.replenishment_run_sources (run_id, source_kind, pot_id, resolved_account_id, amount, suggested_amount, sort_order)
    values (v_run_id, 'pot', v_pot, v_potbank, 50.00, 50.00, 2);

    v_unit_sources := jsonb_build_array(
        jsonb_build_object('transactionId', v_t1, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('sourceType', 'account', 'accountId', v_saude, 'potId', null, 'amount', 64.15))),
        jsonb_build_object('transactionId', v_t2, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('sourceType', 'account', 'accountId', v_activo, 'potId', null, 'amount', 140.00))),
        jsonb_build_object('transactionId', v_t3, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('sourceType', 'account', 'accountId', v_saude, 'potId', null, 'amount', 3.00),
            jsonb_build_object('sourceType', 'account', 'accountId', v_activo, 'potId', null, 'amount', 4.38))),
        jsonb_build_object('transactionId', v_t4, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('sourceType', 'account', 'accountId', v_saude, 'potId', null, 'amount', 70.00))),
        jsonb_build_object('transactionId', v_t5, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('sourceType', 'account', 'accountId', v_saude, 'potId', null, 'amount', 10.00))),
        jsonb_build_object('transactionId', v_t6, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('sourceType', 'pot', 'accountId', v_potbank, 'potId', v_pot, 'amount', 50.00))),
        jsonb_build_object('transactionId', v_t7, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('sourceType', 'account', 'accountId', v_saude, 'potId', null, 'amount', 20.00))),
        jsonb_build_object('transactionId', v_t8, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('sourceType', 'account', 'accountId', v_saude, 'potId', null, 'amount', 60.00))),
        jsonb_build_object('transactionId', v_t8, 'accountId', v_trade, 'sources', jsonb_build_array(
            jsonb_build_object('sourceType', 'account', 'accountId', v_activo, 'potId', null, 'amount', 40.00)))
    );

    perform public.confirm_replenishment_run(v_run_id, v_unit_sources, jsonb_build_object('unitSources', v_unit_sources));
    set constraints all immediate;
    set constraints all deferred;

    -- ------------------------------------------------------------
    -- 1. Swap: T1 Saude -> Activo, T2 Activo -> Saude.
    -- ------------------------------------------------------------
    perform public.update_replenishment_run_sources(v_run_id, jsonb_build_array(
        jsonb_build_object('transactionId', v_t1, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('accountId', v_activo, 'amount', 64.15))),
        jsonb_build_object('transactionId', v_t2, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('accountId', v_saude, 'amount', 140.00)))
    ));
    set constraints all immediate;
    set constraints all deferred;

    select * into v_tx from public.transactions where id = v_t1;
    if v_tx.account_id <> v_activo or v_tx.is_split or v_tx.amount <> 64.15 then
        raise exception '1: T1 expected plain Activo 64.15, got account % split % amount %', v_tx.account_id, v_tx.is_split, v_tx.amount;
    end if;
    select * into v_tx from public.transactions where id = v_t2;
    if v_tx.account_id <> v_saude or v_tx.is_split or v_tx.amount <> 140.00 then
        raise exception '1: T2 expected plain Saude 140.00, got account % split % amount %', v_tx.account_id, v_tx.is_split, v_tx.amount;
    end if;
    if (select new_sources from public.replenishment_run_transactions where run_id = v_run_id and transaction_id = v_t1)
       <> jsonb_build_array(jsonb_build_object('source_type', 'account', 'account_id', v_activo, 'pot_id', null, 'amount', 64.15)) then
        raise exception '1: T1 new_sources not updated';
    end if;

    -- ------------------------------------------------------------
    -- 2. A split unit (Saude 3.00 + Activo 4.38) moved wholly to Activo
    --    collapses back to a plain transaction.
    -- ------------------------------------------------------------
    perform public.update_replenishment_run_sources(v_run_id, jsonb_build_array(
        jsonb_build_object('transactionId', v_t3, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('accountId', v_activo, 'amount', 7.38)))
    ));
    set constraints all immediate;
    set constraints all deferred;

    select * into v_tx from public.transactions where id = v_t3;
    select count(*) into v_count from public.transaction_allocations where transaction_id = v_t3;
    if v_tx.is_split or v_tx.account_id <> v_activo or v_count <> 0 then
        raise exception '2: T3 expected plain Activo with no allocations, got split % account % allocations %', v_tx.is_split, v_tx.account_id, v_count;
    end if;

    -- ------------------------------------------------------------
    -- 3. Reimbursed remainder (30.00 kept on Trading 212) is untouched.
    -- ------------------------------------------------------------
    perform public.update_replenishment_run_sources(v_run_id, jsonb_build_array(
        jsonb_build_object('transactionId', v_t4, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('accountId', v_activo, 'amount', 70.00)))
    ));
    set constraints all immediate;
    set constraints all deferred;

    select * into v_tx from public.transactions where id = v_t4;
    if not v_tx.is_split or v_tx.amount <> 100.00 then
        raise exception '3: T4 expected split of 100.00, got split % amount %', v_tx.is_split, v_tx.amount;
    end if;
    select amount into v_amount from public.transaction_allocations where transaction_id = v_t4 and account_id = v_orig;
    if v_amount is distinct from 30.00 then
        raise exception '3: T4 kept slice expected 30.00 on Trading 212, got %', v_amount;
    end if;
    select amount into v_amount from public.transaction_allocations where transaction_id = v_t4 and account_id = v_activo;
    if v_amount is distinct from 70.00 then
        raise exception '3: T4 replenished slice expected 70.00 on Activo, got %', v_amount;
    end if;
    if exists (select 1 from public.transaction_allocations where transaction_id = v_t4 and account_id = v_saude) then
        raise exception '3: T4 still has a Saude allocation';
    end if;

    -- ------------------------------------------------------------
    -- 4. Run sources recomputed; run total unchanged.
    --    Saude = T2 140 + T5 10 + T7 20 + T8 60;
    --    Activo = T1 64.15 + T3 7.38 + T4 70 + T8 40.
    -- ------------------------------------------------------------
    select amount into v_amount from public.replenishment_run_sources where run_id = v_run_id and resolved_account_id = v_saude;
    if v_amount is distinct from 230.00 then
        raise exception '4: Saude run source expected 230.00, got %', v_amount;
    end if;
    select amount into v_amount from public.replenishment_run_sources where run_id = v_run_id and resolved_account_id = v_activo;
    if v_amount is distinct from 181.53 then
        raise exception '4: Activo run source expected 181.53, got %', v_amount;
    end if;
    select total_amount into v_total from public.replenishment_runs where id = v_run_id;
    if v_total <> 461.53 then
        raise exception '4: run total changed to %', v_total;
    end if;

    -- ------------------------------------------------------------
    -- 4b. Pot rows in the run's sources follow the units: moving the pot's
    --     only unit away while an account unit now uses the pot's backing
    --     account turns the row into a plain account source.
    -- ------------------------------------------------------------
    perform public.update_replenishment_run_sources(v_run_id, jsonb_build_array(
        jsonb_build_object('transactionId', v_t7, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('accountId', v_potbank, 'amount', 20.00)))
    ));
    perform public.update_replenishment_run_sources(v_run_id, jsonb_build_array(
        jsonb_build_object('transactionId', v_t6, 'accountId', v_orig, 'sources', jsonb_build_array(
            jsonb_build_object('accountId', v_saude, 'amount', 50.00)))
    ));
    set constraints all immediate;
    set constraints all deferred;

    select * into v_tx from public.transactions where id = v_t6;
    if v_tx.is_split or v_tx.account_id <> v_saude or v_tx.pot_id is not null then
        raise exception '4b: T6 expected plain Saude without pot, got split % account % pot %', v_tx.is_split, v_tx.account_id, v_tx.pot_id;
    end if;
    if exists (select 1 from public.replenishment_run_sources where run_id = v_run_id and source_kind = 'pot') then
        raise exception '4b: a pot source row remains although no unit is funded by the pot';
    end if;
    select amount into v_amount from public.replenishment_run_sources
     where run_id = v_run_id and resolved_account_id = v_potbank and source_kind = 'account' and pot_id is null;
    if v_amount is distinct from 20.00 then
        raise exception '4b: Pot Bank account source expected 20.00, got %', v_amount;
    end if;

    -- ------------------------------------------------------------
    -- 4c. A split collapsing to one account keeps its replenishment
    --     provenance (T8: Saude 60 + Activo 40 -> Saude 100).
    -- ------------------------------------------------------------
    perform public.update_replenishment_run_sources(v_run_id, jsonb_build_array(
        jsonb_build_object('transactionId', v_t8, 'accountId', v_trade, 'sources', jsonb_build_array(
            jsonb_build_object('accountId', v_saude, 'amount', 40.00)))
    ));
    set constraints all immediate;
    set constraints all deferred;

    select * into v_tx from public.transactions where id = v_t8;
    if v_tx.is_split or v_tx.account_id <> v_saude or v_tx.amount <> 100.00 then
        raise exception '4c: T8 expected plain Saude 100.00, got split % account % amount %', v_tx.is_split, v_tx.account_id, v_tx.amount;
    end if;
    if v_tx.replenishment_run_id is distinct from v_run_id or v_tx.original_account_id is null then
        raise exception '4c: T8 lost its replenishment provenance (run %, original account %)', v_tx.replenishment_run_id, v_tx.original_account_id;
    end if;

    -- ------------------------------------------------------------
    -- 5. A source equal to the unit's own original account is rejected.
    -- ------------------------------------------------------------
    v_error_caught := false;
    begin
        perform public.update_replenishment_run_sources(v_run_id, jsonb_build_array(
            jsonb_build_object('transactionId', v_t5, 'accountId', v_orig, 'sources', jsonb_build_array(
                jsonb_build_object('accountId', v_orig, 'amount', 10.00)))
        ));
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '5: original account accepted as source'; end if;

    -- ------------------------------------------------------------
    -- 6. Sources that do not sum to the replenished amount are rejected.
    -- ------------------------------------------------------------
    v_error_caught := false;
    begin
        perform public.update_replenishment_run_sources(v_run_id, jsonb_build_array(
            jsonb_build_object('transactionId', v_t5, 'accountId', v_orig, 'sources', jsonb_build_array(
                jsonb_build_object('accountId', v_activo, 'amount', 9.00)))
        ));
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '6: sum mismatch accepted'; end if;

    -- ------------------------------------------------------------
    -- 7. A transaction edited after confirming is rejected, and the whole
    --    call is atomic (T2 in the same call is left alone).
    -- ------------------------------------------------------------
    update public.transactions set account_id = v_orig where id = v_t5;

    v_error_caught := false;
    begin
        perform public.update_replenishment_run_sources(v_run_id, jsonb_build_array(
            jsonb_build_object('transactionId', v_t2, 'accountId', v_orig, 'sources', jsonb_build_array(
                jsonb_build_object('accountId', v_activo, 'amount', 140.00))),
            jsonb_build_object('transactionId', v_t5, 'accountId', v_orig, 'sources', jsonb_build_array(
                jsonb_build_object('accountId', v_activo, 'amount', 10.00)))
        ));
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '7: edited transaction accepted'; end if;
    if (select account_id from public.transactions where id = v_t2) <> v_saude then
        raise exception '7: T2 was changed by a failed call';
    end if;

    -- ------------------------------------------------------------
    -- 8. A unit without new_sources (legacy run) is rejected.
    -- ------------------------------------------------------------
    update public.replenishment_run_transactions set new_sources = null where run_id = v_run_id and transaction_id = v_t1;
    v_error_caught := false;
    begin
        perform public.update_replenishment_run_sources(v_run_id, jsonb_build_array(
            jsonb_build_object('transactionId', v_t1, 'accountId', v_orig, 'sources', jsonb_build_array(
                jsonb_build_object('accountId', v_saude, 'amount', 64.15)))
        ));
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '8: unit without new_sources accepted'; end if;

    -- ------------------------------------------------------------
    -- 9. A draft run is rejected.
    -- ------------------------------------------------------------
    insert into public.replenishment_runs (household_id, status, total_amount, created_by)
    values (v_household_id, 'draft', 0, v_user_id) returning id into v_draft_run_id;
    v_error_caught := false;
    begin
        perform public.update_replenishment_run_sources(v_draft_run_id, jsonb_build_array(
            jsonb_build_object('transactionId', v_t1, 'accountId', v_orig, 'sources', jsonb_build_array(
                jsonb_build_object('accountId', v_saude, 'amount', 64.15)))
        ));
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '9: draft run accepted'; end if;

    -- ------------------------------------------------------------
    -- 10. A non-member is rejected.
    -- ------------------------------------------------------------
    perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    v_error_caught := false;
    begin
        perform public.update_replenishment_run_sources(v_run_id, jsonb_build_array(
            jsonb_build_object('transactionId', v_t2, 'accountId', v_orig, 'sources', jsonb_build_array(
                jsonb_build_object('accountId', v_activo, 'amount', 140.00)))
        ));
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '10: non-member accepted'; end if;

    raise notice 'replenishment_update_sources: all checks passed';
end;
$$;

rollback;
