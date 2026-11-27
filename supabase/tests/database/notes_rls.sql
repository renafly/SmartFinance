-- Regression test for the personal Notes feature (public.notes,
-- 20261024000000_notes.sql): RLS isolation, ownership immutability and the
-- optimistic-concurrency version column.
--
-- Self-contained like transaction_allocations.sql: it creates its own auth
-- users, profiles and households inside the transaction and rolls
-- everything back at the end, so it is safe to run against any migrated
-- database. Users are impersonated with the standard Supabase local-testing
-- pattern (request.jwt.claim.sub / request.jwt.claims + `set local role
-- authenticated`).
--
-- Fixtures: A and B are accepted members of household 1; C is a member of
-- household 2 only.

begin;

do $$
declare
    v_user_a uuid := gen_random_uuid();
    v_user_b uuid := gen_random_uuid();
    v_user_c uuid := gen_random_uuid();
    v_household_1 uuid;
    v_household_2 uuid;
    v_note_id uuid;
    v_owner uuid;
    v_version int;
    v_count int;
    v_error_caught boolean;
    v_user uuid;
begin
    -- ------------------------------------------------------------
    -- Fixtures (run as the superuser session, bypassing RLS)
    -- ------------------------------------------------------------
    foreach v_user in array array[v_user_a, v_user_b, v_user_c] loop
        insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, created_at, updated_at,
            raw_app_meta_data, raw_user_meta_data, is_super_admin,
            confirmation_token, recovery_token, email_change_token_new, email_change
        ) values (
            '00000000-0000-0000-0000-000000000000',
            v_user, 'authenticated', 'authenticated',
            'notes-test-' || v_user || '@example.com',
            crypt('password123', gen_salt('bf')),
            now(), now(), now(),
            '{"provider":"email","providers":["email"]}', '{}', false,
            '', '', '', ''
        );

        insert into public.profiles (id, email, full_name)
        values (v_user, 'notes-test-' || v_user || '@example.com', 'Notes Test User')
        on conflict (id) do nothing;
    end loop;

    insert into public.households (name, owner_id)
    values ('Notes Test Household 1', v_user_a)
    returning id into v_household_1;

    insert into public.households (name, owner_id)
    values ('Notes Test Household 2', v_user_c)
    returning id into v_household_2;

    insert into public.household_members (household_id, user_id, role, status)
    values
        (v_household_1, v_user_a, 'owner', 'accepted'),
        (v_household_1, v_user_b, 'member', 'accepted'),
        (v_household_2, v_user_c, 'owner', 'accepted');

    -- ------------------------------------------------------------
    -- 1. A creates a note; owner defaults to auth.uid(), version to 1.
    -- ------------------------------------------------------------
    perform set_config('request.jwt.claim.sub', v_user_a::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);
    set local role authenticated;

    insert into public.notes (household_id, title, content, version)
    values (v_household_1, 'Groceries', 'Milk, eggs', 42)
    returning id, owner_profile_id, version into v_note_id, v_owner, v_version;

    if v_owner is distinct from v_user_a then
        raise exception 'Expected owner_profile_id to default to the author, got %', v_owner;
    end if;
    if v_version <> 1 then
        raise exception 'Expected a new note to start at version 1 (client value ignored), got %', v_version;
    end if;

    -- ------------------------------------------------------------
    -- 2. A cannot create a note in a household they don't belong to, or
    --    on behalf of another member.
    -- ------------------------------------------------------------
    v_error_caught := false;
    begin
        insert into public.notes (household_id, title) values (v_household_2, 'Not mine');
    exception when insufficient_privilege then
        v_error_caught := true;
    end;
    if not v_error_caught then
        raise exception 'A was able to create a note in a household they are not a member of';
    end if;

    v_error_caught := false;
    begin
        insert into public.notes (household_id, owner_profile_id, title) values (v_household_1, v_user_b, 'Forged');
    exception when insufficient_privilege then
        v_error_caught := true;
    end;
    if not v_error_caught then
        raise exception 'A was able to create a note owned by B';
    end if;

    -- ------------------------------------------------------------
    -- 3. Optimistic concurrency: a save based on the current version
    --    succeeds and bumps it; a save based on a stale version updates
    --    nothing.
    -- ------------------------------------------------------------
    update public.notes set content = 'Milk, eggs, bread', version = 999
    where id = v_note_id and version = 1
    returning version into v_version;
    if v_version is distinct from 2 then
        raise exception 'Expected version 2 after the first update (client value ignored), got %', v_version;
    end if;

    update public.notes set content = 'stale overwrite'
    where id = v_note_id and version = 1;
    get diagnostics v_count = row_count;
    if v_count <> 0 then
        raise exception 'A stale-version save overwrote the note';
    end if;

    -- ------------------------------------------------------------
    -- 4. A note cannot be moved to another household or owner.
    -- ------------------------------------------------------------
    v_error_caught := false;
    begin
        update public.notes set owner_profile_id = v_user_b where id = v_note_id;
    exception when insufficient_privilege then
        v_error_caught := true;
    end;
    if not v_error_caught then
        raise exception 'A note was reassigned to another owner';
    end if;

    -- ------------------------------------------------------------
    -- 5. B (same household) cannot see, change or delete A's note.
    -- ------------------------------------------------------------
    perform set_config('request.jwt.claim.sub', v_user_b::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);

    select count(*) into v_count from public.notes;
    if v_count <> 0 then
        raise exception 'B can see % note(s) written by another household member', v_count;
    end if;

    update public.notes set content = 'B was here' where id = v_note_id;
    get diagnostics v_count = row_count;
    if v_count <> 0 then
        raise exception 'B was able to edit A''s note';
    end if;

    delete from public.notes where id = v_note_id;
    get diagnostics v_count = row_count;
    if v_count <> 0 then
        raise exception 'B was able to delete A''s note';
    end if;

    -- ------------------------------------------------------------
    -- 6. C (other household) sees nothing either.
    -- ------------------------------------------------------------
    perform set_config('request.jwt.claim.sub', v_user_c::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_user_c, 'role', 'authenticated')::text, true);

    select count(*) into v_count from public.notes;
    if v_count <> 0 then
        raise exception 'C can see % note(s) from another household', v_count;
    end if;

    -- ------------------------------------------------------------
    -- 7. anon has no access at all.
    -- ------------------------------------------------------------
    set local role anon;
    v_error_caught := false;
    begin
        select count(*) into v_count from public.notes;
    exception when insufficient_privilege then
        v_error_caught := true;
    end;
    if not v_error_caught then
        raise exception 'anon was able to query public.notes';
    end if;

    -- ------------------------------------------------------------
    -- 8. Once A is no longer an accepted member of the household (back to pending), A loses
    --    access to the notes written there.
    -- ------------------------------------------------------------
    set local role postgres;
    update public.household_members set status = 'pending'
    where household_id = v_household_1 and user_id = v_user_a;

    perform set_config('request.jwt.claim.sub', v_user_a::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);
    set local role authenticated;

    select count(*) into v_count from public.notes;
    if v_count <> 0 then
        raise exception 'A can still see notes after leaving the household';
    end if;

    -- ------------------------------------------------------------
    -- 9. Back as a member, A can delete their own note.
    -- ------------------------------------------------------------
    set local role postgres;
    update public.household_members set status = 'accepted'
    where household_id = v_household_1 and user_id = v_user_a;
    set local role authenticated;

    delete from public.notes where id = v_note_id;
    get diagnostics v_count = row_count;
    if v_count <> 1 then
        raise exception 'A could not delete their own note';
    end if;
end;
$$;

rollback;
