-- Regression test for public.save_transaction_funding (split the effective
-- cost of a reimbursed expense, saved atomically with its reimbursements)
-- and for public.replenishable_units attributing a split expense's
-- reimbursements to the account that received them.
--
-- Builds its own user/household/accounts and rolls everything back, like
-- transaction_allocations.sql. Deferred allocation checks are forced with
-- `set constraints all immediate` after each successful call.

begin;

do $$
declare
    v_user_id uuid := gen_random_uuid();
    v_household_id uuid;
    v_activo uuid;
    v_saude uuid;
    v_other uuid;
    v_tx uuid;
    v_plain uuid;
    v_reimb_id uuid;
    v_row public.transactions%rowtype;
    v_amount numeric;
    v_count int;
    v_error_caught boolean;
begin
    insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin,
        confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
        '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
        'transaction-funding-test@example.com', crypt('password123', gen_salt('bf')),
        now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''
    );
    insert into public.profiles (id, email, full_name)
    values (v_user_id, 'transaction-funding-test@example.com', 'Funding Test')
    on conflict (id) do nothing; -- handle_new_user may already have created it
    insert into public.households (name, owner_id) values ('Funding Test Household', v_user_id) returning id into v_household_id;
    insert into public.household_members (household_id, user_id, role, status) values (v_household_id, v_user_id, 'owner', 'accepted');
    insert into public.accounts (household_id, name, type, currency) values (v_household_id, 'Activo Bank', 'bank', 'EUR') returning id into v_activo;
    insert into public.accounts (household_id, name, type, currency) values (v_household_id, 'Saude', 'savings', 'EUR') returning id into v_saude;
    insert into public.accounts (household_id, name, type, currency) values (v_household_id, 'Other', 'bank', 'EUR') returning id into v_other;

    perform set_config('request.jwt.claim.sub', v_user_id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_user_id, 'role', 'authenticated')::text, true);
    set local role authenticated;

    insert into public.transactions (household_id, account_id, title, amount, type, created_by)
    values (v_household_id, v_activo, 'Prenda do Pai', 64.15, 'expense', v_user_id) returning id into v_tx;
    insert into public.transactions (household_id, account_id, title, amount, type, created_by)
    values (v_household_id, v_activo, 'Plain', 30.00, 'expense', v_user_id) returning id into v_plain;

    -- ------------------------------------------------------------
    -- (a) Split the effective cost: Activo 22.76 + Saude 20.00, Rita 21.39
    --     received in Activo -> allocations Activo 44.15 + Saude 20.00.
    -- ------------------------------------------------------------
    perform public.save_transaction_funding(
        v_tx,
        jsonb_build_array(
            jsonb_build_object('account_id', v_activo, 'amount', 22.76),
            jsonb_build_object('account_id', v_saude, 'amount', 20.00)
        ),
        jsonb_build_array(jsonb_build_object(
            'id', null, 'payer_name', 'Rita', 'amount', 21.39, 'note', null,
            'account_id', v_activo, 'received_on', '2026-11-16'
        ))
    );
    set constraints all immediate;
    set constraints all deferred;

    select * into v_row from public.transactions where id = v_tx;
    if not v_row.is_split or v_row.amount <> 64.15 then
        raise exception '(a) expected split of 64.15, got split % amount %', v_row.is_split, v_row.amount;
    end if;
    select amount into v_amount from public.transaction_allocations where transaction_id = v_tx and account_id = v_activo;
    if v_amount is distinct from 44.15 then raise exception '(a) Activo allocation expected 44.15, got %', v_amount; end if;
    select amount into v_amount from public.transaction_allocations where transaction_id = v_tx and account_id = v_saude;
    if v_amount is distinct from 20.00 then raise exception '(a) Saude allocation expected 20.00, got %', v_amount; end if;
    select id into v_reimb_id from public.transaction_reimbursements where transaction_id = v_tx;
    if v_reimb_id is null then raise exception '(a) reimbursement not created'; end if;
    if not exists (select 1 from public.transactions where reimbursement_id = v_reimb_id and account_id = v_activo and amount = 21.39) then
        raise exception '(a) reimbursement income transaction missing';
    end if;

    -- ------------------------------------------------------------
    -- (i) replenishable_units: Activo unit reimbursed 21.39 -> 22.76 left;
    --     Saude unit untouched (20.00); plain expense unchanged.
    -- ------------------------------------------------------------
    select replenishable_amount into v_amount from public.replenishable_units(v_household_id, array[v_tx]) where account_id = v_activo;
    if v_amount is distinct from 22.76 then raise exception '(i) Activo replenishable expected 22.76, got %', v_amount; end if;
    select replenishable_amount into v_amount from public.replenishable_units(v_household_id, array[v_tx]) where account_id = v_saude;
    if v_amount is distinct from 20.00 then raise exception '(i) Saude replenishable expected 20.00, got %', v_amount; end if;
    select replenishable_amount into v_amount from public.replenishable_units(v_household_id, array[v_plain]) where account_id = v_activo;
    if v_amount is distinct from 30.00 then raise exception '(i) plain replenishable expected 30.00, got %', v_amount; end if;

    -- ------------------------------------------------------------
    -- (c) Reimbursement received outside the split -> error, nothing written.
    -- ------------------------------------------------------------
    v_error_caught := false;
    begin
        perform public.save_transaction_funding(
            v_tx,
            jsonb_build_array(
                jsonb_build_object('account_id', v_activo, 'amount', 22.76),
                jsonb_build_object('account_id', v_saude, 'amount', 20.00)
            ),
            jsonb_build_array(jsonb_build_object(
                'id', v_reimb_id, 'payer_name', 'Rita', 'amount', 21.39, 'note', null,
                'account_id', v_other, 'received_on', '2026-11-16'
            ))
        );
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '(c) reimbursement outside the split accepted'; end if;
    if (select account_id from public.transaction_reimbursements where id = v_reimb_id) <> v_activo then
        raise exception '(c) reimbursement changed by a failed call';
    end if;

    -- ------------------------------------------------------------
    -- (d) Effective sum must equal amount - reimbursed.
    -- ------------------------------------------------------------
    v_error_caught := false;
    begin
        perform public.save_transaction_funding(
            v_tx,
            jsonb_build_array(
                jsonb_build_object('account_id', v_activo, 'amount', 30.00),
                jsonb_build_object('account_id', v_saude, 'amount', 20.00)
            ),
            jsonb_build_array(jsonb_build_object(
                'id', v_reimb_id, 'payer_name', 'Rita', 'amount', 21.39, 'note', null,
                'account_id', v_activo, 'received_on', '2026-11-16'
            ))
        );
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '(d) wrong effective sum accepted'; end if;

    -- ------------------------------------------------------------
    -- (e) An effective 0 is only allowed on an account receiving money.
    -- ------------------------------------------------------------
    v_error_caught := false;
    begin
        perform public.save_transaction_funding(
            v_tx,
            jsonb_build_array(
                jsonb_build_object('account_id', v_activo, 'amount', 42.76),
                jsonb_build_object('account_id', v_saude, 'amount', 0)
            ),
            jsonb_build_array(jsonb_build_object(
                'id', v_reimb_id, 'payer_name', 'Rita', 'amount', 21.39, 'note', null,
                'account_id', v_activo, 'received_on', '2026-11-16'
            ))
        );
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '(e) zero share on a non-receiving account accepted'; end if;

    -- ... but allowed on the receiving one: Saude 42.76, Activo 0 (+21.39).
    perform public.save_transaction_funding(
        v_tx,
        jsonb_build_array(
            jsonb_build_object('account_id', v_activo, 'amount', 0),
            jsonb_build_object('account_id', v_saude, 'amount', 42.76)
        ),
        jsonb_build_array(jsonb_build_object(
            'id', v_reimb_id, 'payer_name', 'Rita', 'amount', 21.39, 'note', null,
            'account_id', v_activo, 'received_on', '2026-11-16'
        ))
    );
    set constraints all immediate;
    set constraints all deferred;
    select amount into v_amount from public.transaction_allocations where transaction_id = v_tx and account_id = v_activo;
    if v_amount is distinct from 21.39 then raise exception '(e) Activo allocation expected 21.39, got %', v_amount; end if;

    -- ------------------------------------------------------------
    -- (g) Split with reimbursed >= amount -> error.
    -- ------------------------------------------------------------
    v_error_caught := false;
    begin
        perform public.save_transaction_funding(
            v_tx,
            jsonb_build_array(
                jsonb_build_object('account_id', v_activo, 'amount', 0),
                jsonb_build_object('account_id', v_saude, 'amount', 0)
            ),
            jsonb_build_array(jsonb_build_object(
                'id', v_reimb_id, 'payer_name', 'Rita', 'amount', 64.15, 'note', null,
                'account_id', v_activo, 'received_on', '2026-11-16'
            ))
        );
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '(g) fully reimbursed split accepted'; end if;

    -- ------------------------------------------------------------
    -- (b) No split -> plain transaction; reimbursement must be received in
    --     the transaction's own account. The app saves the "Pago a partir
    --     de" account (Activo) before the funding, as here.
    -- ------------------------------------------------------------
    update public.transactions set account_id = v_activo where id = v_tx;
    v_error_caught := false;
    begin
        perform public.save_transaction_funding(
            v_tx, '[]'::jsonb,
            jsonb_build_array(jsonb_build_object(
                'id', v_reimb_id, 'payer_name', 'Rita', 'amount', 21.39, 'note', null,
                'account_id', v_saude, 'received_on', '2026-11-16'
            ))
        );
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '(b) no-split reimbursement outside the paid-from account accepted'; end if;

    perform public.save_transaction_funding(
        v_tx, '[]'::jsonb,
        jsonb_build_array(jsonb_build_object(
            'id', v_reimb_id, 'payer_name', 'Rita', 'amount', 21.39, 'note', 'ok', 'account_id', v_activo, 'received_on', '2026-11-16'
        ))
    );
    set constraints all immediate;
    set constraints all deferred;
    select * into v_row from public.transactions where id = v_tx;
    select count(*) into v_count from public.transaction_allocations where transaction_id = v_tx;
    if v_row.is_split or v_count <> 0 then raise exception '(b) expected plain transaction, got split % allocations %', v_row.is_split, v_count; end if;
    if (select note from public.transaction_reimbursements where id = v_reimb_id) is distinct from 'ok' then
        raise exception '(b) existing reimbursement not updated';
    end if;

    -- ------------------------------------------------------------
    -- (f) A reimbursement left out of the final set is deleted, with its
    --     income transaction.
    -- ------------------------------------------------------------
    perform public.save_transaction_funding(v_tx, '[]'::jsonb, '[]'::jsonb);
    if exists (select 1 from public.transaction_reimbursements where transaction_id = v_tx) then
        raise exception '(f) reimbursement not deleted';
    end if;
    if exists (select 1 from public.transactions where reimbursement_id = v_reimb_id) then
        raise exception '(f) income transaction not deleted';
    end if;

    -- ------------------------------------------------------------
    -- (h) A non-member is rejected.
    -- ------------------------------------------------------------
    perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    v_error_caught := false;
    begin
        perform public.save_transaction_funding(v_tx, '[]'::jsonb, '[]'::jsonb);
    exception when others then v_error_caught := true;
    end;
    if not v_error_caught then raise exception '(h) non-member accepted'; end if;

    raise notice 'transaction_funding: all checks passed';
end;
$$;

rollback;
