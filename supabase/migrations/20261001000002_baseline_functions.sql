-- ============================================================
-- SmartFinance baseline 03/09 -- Functions
-- ============================================================
-- All SQL / plpgsql functions and RPCs, in dependency order -- the final definition of each (later migrations that redefined a function are already folded in).
--
-- Generated 2026-10-01 by squashing the 107 historical migrations
-- (archived in supabase/migrations_archive/) into the final schema they
-- produce. To change the schema from now on, add a NEW migration after
-- these files -- never edit the baseline.

set check_function_bodies = false;

--
-- Name: accept_household_invitation(text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.accept_household_invitation(p_token text) RETURNS TABLE(household_id uuid, role public.household_role)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_user_id uuid := auth.uid();
    v_email text;
    v_invite public.household_invitations%rowtype;
begin
    if v_user_id is null then
        raise exception 'You must be authenticated to accept an invitation.';
    end if;

    select p.email into v_email
    from public.profiles p
    where p.id = v_user_id;

    if v_email is null then
        select coalesce(au.email, au.id::text || '@local.invalid')
        into v_email
        from auth.users au
        where au.id = v_user_id;
    end if;

    if v_email is null then
        raise exception 'Profile/email not found for authenticated user.';
    end if;

    -- Ensure profile row exists (invited users may not have signed up via trigger)
    insert into public.profiles (id, email, full_name, avatar_url)
    select
        au.id,
        coalesce(au.email, au.id::text || '@local.invalid'),
        coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
        au.raw_user_meta_data->>'avatar_url'
    from auth.users au
    where au.id = v_user_id
    on conflict (id) do nothing;

    select hi.* into v_invite
    from public.household_invitations hi
    where hi.token = p_token
      and hi.accepted_at is null
      and (hi.expires_at is null or hi.expires_at > now())
    limit 1
    for update;

    if not found then
        raise exception 'Invitation not found or expired.';
    end if;

    if lower(v_invite.email) <> lower(v_email) then
        raise exception 'This invitation does not belong to your account email.';
    end if;

    insert into public.household_members (
        household_id, user_id, role, status, joined_at
    )
    values (
        v_invite.household_id, v_user_id, v_invite.role, 'accepted', now()
    )
    on conflict on constraint household_members_pkey
    do update set
        role = excluded.role,
        status = 'accepted',
        joined_at = coalesce(public.household_members.joined_at, now());

    update public.household_invitations
    set accepted_at = now()
    where id = v_invite.id;

    return query
    select v_invite.household_id, v_invite.role;
end;
$$;


--
-- Name: account_running_balance(uuid, timestamp with time zone, timestamp with time zone, uuid, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.account_running_balance(p_account_id uuid, p_transaction_date timestamp with time zone, p_created_at timestamp with time zone, p_transaction_id uuid, p_allocation_id uuid DEFAULT NULL::uuid) RETURNS numeric
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  with account as (
    select a.id, a.initial_balance
    from public.accounts a
    where a.id = p_account_id
  ),
  direct_legs as (
    select
      t.id as transaction_id,
      t.id as movement_id,
      t.type::text as movement_kind,
      t.amount,
      t.transaction_date,
      t.created_at
    from public.transactions t
    where t.account_id = p_account_id
      and t.is_split = false
  ),
  split_legs as (
    select
      t.id as transaction_id,
      ta.id as movement_id,
      t.type::text as movement_kind,
      ta.amount,
      t.transaction_date,
      t.created_at
    from public.transaction_allocations ta
    join public.transactions t on t.id = ta.transaction_id
    where ta.account_id = p_account_id
  ),
  legs as (
    select * from direct_legs
    union all
    select * from split_legs
  )
  select
    account.initial_balance
    + coalesce(sum(
        case when legs.movement_kind = 'income' then legs.amount else -legs.amount end
      ), 0)
  from account
  left join legs
    on (legs.transaction_date, legs.created_at, legs.transaction_id, legs.movement_id)
     <= (p_transaction_date, p_created_at, p_transaction_id, coalesce(p_allocation_id, p_transaction_id))
  group by account.initial_balance;
$$;


--
-- Name: FUNCTION account_running_balance(p_account_id uuid, p_transaction_date timestamp with time zone, p_created_at timestamp with time zone, p_transaction_id uuid, p_allocation_id uuid); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.account_running_balance(p_account_id uuid, p_transaction_date timestamp with time zone, p_created_at timestamp with time zone, p_transaction_id uuid, p_allocation_id uuid) IS 'One account''s balance immediately after a given point in its ledger (direct non-split transactions UNION its transaction_allocations legs, ordered by transaction_date/created_at/transaction_id, with p_allocation_id as the split-leg tiebreak -- null means "a whole non-split transaction", matching balance_after_transaction()''s own row). Shared by balance_after_transaction() and list_transaction_movements'' per-allocation running_balance.';


--
-- Name: add_feedback_message(uuid, text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.add_feedback_message(p_feedback_id uuid, p_body text) RETURNS public.feedback_messages
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_result jsonb;
begin
    v_result := public.add_feedback_reply(
        p_feedback_id,
        encode(gen_random_bytes(16), 'hex'),
        p_body,
        false
    );
    return jsonb_populate_record(null::public.feedback_messages, v_result);
end;
$$;


--
-- Name: add_feedback_reply(uuid, text, text, boolean); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.add_feedback_reply(p_feedback_id uuid, p_idempotency_key text, p_body text, p_internal boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_actor uuid := auth.uid();
    v_feedback public.app_feedback%rowtype;
    v_message public.feedback_messages%rowtype;
    v_response jsonb;
    v_is_admin boolean;
begin
    if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    perform public.assert_feedback_idempotency_key(p_idempotency_key);
    perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':reply:' || p_idempotency_key, 0));

    select response into v_response from public.feedback_rpc_requests
    where actor_id = v_actor and operation = 'reply' and idempotency_key = p_idempotency_key;
    if found then return v_response; end if;

    v_is_admin := public.is_platform_admin();
    select * into v_feedback from public.app_feedback where id = p_feedback_id for update;
    if not found or (not v_is_admin and v_feedback.user_id <> v_actor) then
        raise exception 'Feedback not found' using errcode = 'P0002';
    end if;
    if p_internal and not v_is_admin then
        raise exception 'Only platform admins can add internal notes' using errcode = '42501';
    end if;
    if v_feedback.status = 'withdrawn'
       or (not v_is_admin and v_feedback.status in ('resolved', 'closed', 'rejected')) then
        raise exception 'Replies are closed for this feedback' using errcode = 'P0001';
    end if;

    perform public.consume_feedback_rate_limit(
        v_actor,
        case when v_is_admin then 'admin_reply' else 'author_reply' end,
        case when v_is_admin then 120 else 30 end,
        interval '1 hour'
    );

    insert into public.feedback_messages(feedback_id, author_id, message_type, is_admin_reply, body)
    values (
        p_feedback_id, v_actor,
        case when p_internal then 'internal_note' else 'reply' end,
        v_is_admin and not p_internal,
        btrim(p_body)
    ) returning * into v_message;

    update public.app_feedback set last_activity_at = now() where id = p_feedback_id;

    insert into public.feedback_events(
        feedback_id, actor_id, event_type, metadata, visible_to_author
    ) values (
        p_feedback_id, v_actor,
        case when p_internal then 'internal_note_added' else 'message_added' end,
        jsonb_build_object('message_id', v_message.id),
        not p_internal
    );

    -- Only an admin's public reply alerts the feedback author.
    if v_is_admin and not p_internal and v_feedback.user_id <> v_actor then
        perform public.notify_feedback_recipient(
            v_feedback.user_id,
            'feedback_reply',
            'New reply to your feedback',
            left(v_message.body, 240),
            jsonb_build_object('feedback_id', p_feedback_id, 'message_id', v_message.id),
            'feedback:reply:' || v_message.id::text || ':author:' || v_feedback.user_id::text
        );
    end if;

    v_response := to_jsonb(v_message);
    insert into public.feedback_rpc_requests(actor_id, operation, idempotency_key, response)
    values (v_actor, 'reply', p_idempotency_key, v_response);
    return v_response;
end;
$$;


--
-- Name: admin_assign_feedback(uuid, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.admin_assign_feedback(p_feedback_id uuid, p_admin_id uuid) RETURNS public.app_feedback
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_current public.app_feedback%rowtype;
    v_result jsonb;
begin
    if not public.is_platform_admin() then
        raise exception 'Platform administrator access required' using errcode = '42501';
    end if;
    select * into v_current from public.app_feedback where id = p_feedback_id;
    if not found then raise exception 'Feedback not found' using errcode = 'P0002'; end if;
    if v_current.assigned_to is not distinct from p_admin_id then return v_current; end if;

    v_result := public.admin_update_app_feedback(
        p_feedback_id,
        md5(
            auth.uid()::text || ':assign:' || p_feedback_id::text || ':' ||
            coalesce(v_current.assigned_to::text, 'none') || ':' || coalesce(p_admin_id::text, 'none')
        ),
        null, null, p_admin_id, p_admin_id is null, null, false
    );
    return jsonb_populate_record(null::public.app_feedback, v_result);
end;
$$;


--
-- Name: admin_create_app_release(text, text, text, text, text, text, timestamp with time zone); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.admin_create_app_release(p_idempotency_key text, p_version text, p_platform text DEFAULT 'all'::text, p_status text DEFAULT 'draft'::text, p_title text DEFAULT NULL::text, p_release_notes text DEFAULT NULL::text, p_released_at timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_actor uuid := auth.uid();
    v_release public.app_releases%rowtype;
    v_response jsonb;
begin
    if v_actor is null or not public.is_platform_admin() then
        raise exception 'Platform administrator access required' using errcode = '42501';
    end if;
    perform public.assert_feedback_idempotency_key(p_idempotency_key);
    perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':create_release:' || p_idempotency_key, 0));

    select response into v_response from public.feedback_rpc_requests
    where actor_id = v_actor and operation = 'create_release' and idempotency_key = p_idempotency_key;
    if found then return v_response; end if;

    insert into public.app_releases(
        version, platform, status, title, release_notes, is_active, released_at, created_by
    ) values (
        btrim(p_version), p_platform, p_status, nullif(btrim(p_title), ''),
        p_release_notes, p_status = 'published',
        case when p_status = 'published' then coalesce(p_released_at, now()) else p_released_at end,
        v_actor
    ) returning * into v_release;

    v_response := to_jsonb(v_release);
    insert into public.feedback_rpc_requests(actor_id, operation, idempotency_key, response)
    values (v_actor, 'create_release', p_idempotency_key, v_response);
    return v_response;
end;
$$;


--
-- Name: admin_set_feedback_priority(uuid, text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.admin_set_feedback_priority(p_feedback_id uuid, p_priority text) RETURNS public.app_feedback
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_current public.app_feedback%rowtype;
    v_result jsonb;
begin
    if not public.is_platform_admin() then
        raise exception 'Platform administrator access required' using errcode = '42501';
    end if;
    select * into v_current from public.app_feedback where id = p_feedback_id;
    if not found then raise exception 'Feedback not found' using errcode = 'P0002'; end if;
    if v_current.priority = p_priority then return v_current; end if;

    v_result := public.admin_update_app_feedback(
        p_feedback_id,
        md5(auth.uid()::text || ':priority:' || p_feedback_id::text || ':' || v_current.priority || ':' || p_priority),
        null, p_priority, null, false, null, false
    );
    return jsonb_populate_record(null::public.app_feedback, v_result);
end;
$$;


--
-- Name: admin_update_app_feedback(uuid, text, text, text, uuid, boolean, uuid, boolean); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.admin_update_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_status text DEFAULT NULL::text, p_priority text DEFAULT NULL::text, p_assigned_admin_id uuid DEFAULT NULL::uuid, p_clear_assignment boolean DEFAULT false, p_resolved_in_release_id uuid DEFAULT NULL::uuid, p_clear_release boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_actor uuid := auth.uid();
    v_feedback public.app_feedback%rowtype;
    v_response jsonb;
    v_event_id uuid;
    v_old_status text;
    v_status_changed boolean := false;
begin
    if v_actor is null or not public.is_platform_admin() then
        raise exception 'Platform administrator access required' using errcode = '42501';
    end if;
    perform public.assert_feedback_idempotency_key(p_idempotency_key);
    perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':admin_update:' || p_idempotency_key, 0));

    select response into v_response from public.feedback_rpc_requests
    where actor_id = v_actor and operation = 'admin_update' and idempotency_key = p_idempotency_key;
    if found then return v_response; end if;

    select * into v_feedback from public.app_feedback where id = p_feedback_id for update;
    if not found then raise exception 'Feedback not found' using errcode = 'P0002'; end if;
    if v_feedback.status = 'withdrawn' then
        raise exception 'Withdrawn feedback cannot re-enter the admin workflow' using errcode = 'P0001';
    end if;
    if p_status is null and p_priority is null
       and p_assigned_admin_id is null and not p_clear_assignment
       and p_resolved_in_release_id is null and not p_clear_release then
        raise exception 'At least one workflow field is required' using errcode = '22023';
    end if;
    if (p_assigned_admin_id is not null and p_clear_assignment)
       or (p_resolved_in_release_id is not null and p_clear_release) then
        raise exception 'A workflow relation cannot be set and cleared together' using errcode = '22023';
    end if;
    if p_assigned_admin_id is not null and not exists (
        select 1 from public.platform_admins
        where user_id = p_assigned_admin_id and is_active
    ) then
        raise exception 'Assigned administrator is not active' using errcode = '22023';
    end if;
    if p_resolved_in_release_id is not null and not exists (
        select 1 from public.app_releases where id = p_resolved_in_release_id
    ) then
        raise exception 'Release not found' using errcode = '22023';
    end if;

    v_old_status := v_feedback.status;
    v_status_changed := p_status is not null and p_status <> v_old_status;

    if v_status_changed and not (
        (v_old_status = 'submitted' and p_status in ('under_review', 'planned', 'in_progress', 'closed', 'triaged', 'rejected'))
        or (v_old_status = 'under_review' and p_status in ('planned', 'in_progress', 'resolved', 'closed'))
        or (v_old_status = 'planned' and p_status in ('under_review', 'in_progress', 'resolved', 'closed'))
        or (v_old_status = 'in_progress' and p_status in ('under_review', 'planned', 'resolved', 'closed', 'waiting_for_user', 'rejected'))
        or (v_old_status in ('resolved', 'closed') and p_status in ('under_review', 'planned', 'in_progress'))
        or (v_old_status = 'triaged' and p_status in ('in_progress', 'waiting_for_user', 'resolved', 'rejected'))
        or (v_old_status = 'waiting_for_user' and p_status in ('in_progress', 'resolved', 'rejected'))
        or (v_old_status in ('resolved', 'rejected') and p_status in ('triaged', 'in_progress'))
    ) then
        raise exception 'Invalid feedback status transition: % to %', v_old_status, p_status
            using errcode = '22023';
    end if;

    update public.app_feedback
    set status = coalesce(p_status, status),
        priority = coalesce(p_priority, priority),
        assigned_to = case
            when p_clear_assignment then null
            else coalesce(p_assigned_admin_id, assigned_to)
        end,
        resolved_in_release_id = case
            when p_clear_release then null
            else coalesce(p_resolved_in_release_id, resolved_in_release_id)
        end,
        resolved_at = case
            when p_status = 'resolved' then now()
            when p_status is not null and p_status <> 'resolved' then null
            else resolved_at
        end,
        closed_at = case
            when p_status = 'closed' then now()
            when p_status is not null and p_status <> 'closed' then null
            else closed_at
        end,
        withdrawn_at = case when p_status is not null then null else withdrawn_at end,
        last_activity_at = now()
    where id = p_feedback_id
    returning * into v_feedback;

    insert into public.feedback_events(
        feedback_id, actor_id, event_type, from_value, to_value, metadata
    ) values (
        p_feedback_id,
        v_actor,
        case
            when v_status_changed then 'status_changed'
            when p_priority is not null then 'priority_changed'
            when p_assigned_admin_id is not null or p_clear_assignment then 'assigned'
            else 'admin_updated'
        end,
        case when v_status_changed then v_old_status else null end,
        case when v_status_changed then v_feedback.status else null end,
        jsonb_strip_nulls(jsonb_build_object(
            'priority', p_priority,
            'assigned_admin_id', p_assigned_admin_id,
            'assignment_cleared', case when p_clear_assignment then true else null end,
            'resolved_in_release_id', p_resolved_in_release_id,
            'release_cleared', case when p_clear_release then true else null end
        ))
    ) returning id into v_event_id;

    -- Workflow status alerts are always author-only.
    if v_status_changed and v_feedback.user_id <> v_actor then
        perform public.notify_feedback_recipient(
            v_feedback.user_id,
            'feedback_status_changed',
            'Feedback status updated',
            'Your feedback is now ' || replace(v_feedback.status, '_', ' ') || '.',
            jsonb_build_object(
                'feedback_id', p_feedback_id,
                'status', v_feedback.status,
                'release_id', v_feedback.resolved_in_release_id
            ),
            'feedback:status:' || v_event_id::text || ':author:' || v_feedback.user_id::text
        );
    end if;

    v_response := to_jsonb(v_feedback);
    insert into public.feedback_rpc_requests(actor_id, operation, idempotency_key, response)
    values (v_actor, 'admin_update', p_idempotency_key, v_response);
    return v_response;
end;
$$;


--
-- Name: admin_update_app_release(uuid, text, text, text, text, timestamp with time zone); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.admin_update_app_release(p_release_id uuid, p_idempotency_key text, p_status text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_release_notes text DEFAULT NULL::text, p_released_at timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_actor uuid := auth.uid();
    v_release public.app_releases%rowtype;
    v_response jsonb;
begin
    if v_actor is null or not public.is_platform_admin() then
        raise exception 'Platform administrator access required' using errcode = '42501';
    end if;
    perform public.assert_feedback_idempotency_key(p_idempotency_key);
    perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':update_release:' || p_idempotency_key, 0));

    select response into v_response from public.feedback_rpc_requests
    where actor_id = v_actor and operation = 'update_release' and idempotency_key = p_idempotency_key;
    if found then return v_response; end if;
    if p_status is null and p_title is null and p_release_notes is null and p_released_at is null then
        raise exception 'At least one release field is required' using errcode = '22023';
    end if;

    update public.app_releases
    set status = coalesce(p_status, status),
        is_active = case
            when p_status is null then is_active
            else p_status = 'published'
        end,
        title = case when p_title is null then title else nullif(btrim(p_title), '') end,
        release_notes = coalesce(p_release_notes, release_notes),
        released_at = case
            when p_released_at is not null then p_released_at
            when p_status = 'published' then coalesce(released_at, now())
            else released_at
        end
    where id = p_release_id
    returning * into v_release;
    if not found then raise exception 'Release not found' using errcode = 'P0002'; end if;

    v_response := to_jsonb(v_release);
    insert into public.feedback_rpc_requests(actor_id, operation, idempotency_key, response)
    values (v_actor, 'update_release', p_idempotency_key, v_response);
    return v_response;
end;
$$;


--
-- Name: admin_update_feedback_status(uuid, text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.admin_update_feedback_status(p_feedback_id uuid, p_status text) RETURNS public.app_feedback
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_current public.app_feedback%rowtype;
    v_result jsonb;
begin
    if not public.is_platform_admin() then
        raise exception 'Platform administrator access required' using errcode = '42501';
    end if;
    select * into v_current from public.app_feedback where id = p_feedback_id;
    if not found then raise exception 'Feedback not found' using errcode = 'P0002'; end if;
    if v_current.status = p_status then return v_current; end if;

    v_result := public.admin_update_app_feedback(
        p_feedback_id,
        md5(auth.uid()::text || ':status:' || p_feedback_id::text || ':' || v_current.status || ':' || p_status),
        p_status, null, null, false, null, false
    );
    return jsonb_populate_record(null::public.app_feedback, v_result);
end;
$$;


--
-- Name: assert_feedback_idempotency_key(text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.assert_feedback_idempotency_key(p_key text) RETURNS void
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $_$
begin
    if p_key is null
       or char_length(p_key) not between 8 and 128
       or p_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then
        raise exception 'Invalid idempotency key' using errcode = '22023';
    end if;
end;
$_$;


--
-- Name: attachment_storage_household_id(text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.attachment_storage_household_id(p_name text) RETURNS uuid
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'storage', 'pg_temp'
    AS $_$
    select case
        when (storage.foldername(p_name))[1] = 'households'
         and (storage.foldername(p_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         and (storage.foldername(p_name))[3] = 'transactions'
        then ((storage.foldername(p_name))[2])::uuid
        else null
    end;
$_$;


--
-- Name: attachment_storage_transaction_id(text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.attachment_storage_transaction_id(p_name text) RETURNS uuid
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'storage', 'pg_temp'
    AS $_$
    select case
        when (storage.foldername(p_name))[1] = 'households'
         and (storage.foldername(p_name))[3] = 'transactions'
         and (storage.foldername(p_name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((storage.foldername(p_name))[4])::uuid
        else null
    end;
$_$;


--
-- Name: audit_trigger(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.audit_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_household_id uuid := null;
begin

    if tg_table_name = 'households' then
        v_household_id := coalesce(new.id, old.id);

    elsif tg_table_name in (
        'accounts', 'categories', 'transactions',
        'recurring_transactions', 'saving_pots', 'budget_rules'
    ) then
        if tg_table_name = 'budget_rules' then
            select bc.household_id
              into v_household_id
              from public.budget_configs bc
             where bc.id = coalesce(new.budget_config_id, old.budget_config_id);
        else
            v_household_id := coalesce(new.household_id, old.household_id);
        end if;

    elsif tg_table_name = 'attachments' then
        select t.household_id into v_household_id
        from public.transactions t
        where t.id = coalesce(new.transaction_id, old.transaction_id);

    else
        return coalesce(new, old);
    end if;

    begin
        insert into public.audit_logs (
            household_id, profile_id, table_name,
            record_id, action, old_data, new_data
        )
        values (
            v_household_id, auth.uid(), tg_table_name,
            coalesce(new.id, old.id), tg_op,
            to_jsonb(old), to_jsonb(new)
        );
    exception when foreign_key_violation then
        -- Household already deleted (cascade); record with null household_id
        insert into public.audit_logs (
            household_id, profile_id, table_name,
            record_id, action, old_data, new_data
        )
        values (
            null, auth.uid(), tg_table_name,
            coalesce(new.id, old.id), tg_op,
            to_jsonb(old), to_jsonb(new)
        );
    end;

    return coalesce(new, old);

end;
$$;


--
-- Name: balance_after_transaction(public.transactions); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.balance_after_transaction(public.transactions) RETURNS numeric
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $_$
  select case
    when $1.is_split then null
    else public.account_running_balance($1.account_id, $1.transaction_date, $1.created_at, $1.id)
  end;
$_$;


--
-- Name: FUNCTION balance_after_transaction(public.transactions); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.balance_after_transaction(public.transactions) IS 'Account balance immediately after this transaction, ordered by transaction date, creation date, and id -- now split-aware via account_running_balance(), so an account''s split activity counts toward every other transaction''s balance-after on that same account. Still returns null for split transactions themselves (is_split = true): a split moves money through more than one account at once, so there is no single well-defined balance for the transaction as a whole -- see each allocation''s own running_balance in list_transaction_movements instead.';


--
-- Name: bulk_update_transaction_category(uuid, uuid[], uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.bulk_update_transaction_category(p_household_id uuid, p_transaction_ids uuid[], p_category_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_requested_count integer;
  v_visible_count integer;
  v_type_count integer;
  v_transaction_type public.transaction_type;
  v_category_type public.category_type;
  v_updated_count integer;
begin
  if p_household_id is null then
    raise exception using errcode = '22023', message = 'Household is required.';
  end if;

  if not public.is_household_member(p_household_id, (select auth.uid())) then
    raise exception using errcode = '42501', message = 'Household membership is required.';
  end if;

  if p_transaction_ids is null or coalesce(array_length(p_transaction_ids, 1), 0) = 0 then
    raise exception using errcode = '22023', message = 'Select at least one transaction.';
  end if;

  if array_position(p_transaction_ids, null) is not null then
    raise exception using errcode = '22023', message = 'Transaction IDs cannot contain null values.';
  end if;

  select count(distinct transaction_id)::integer
  into v_requested_count
  from unnest(p_transaction_ids) as selected(transaction_id);

  if v_requested_count <> array_length(p_transaction_ids, 1) then
    raise exception using errcode = '22023', message = 'Transaction IDs must be unique.';
  end if;

  select
    count(*)::integer,
    count(distinct t.type)::integer
  into v_visible_count, v_type_count
  from public.transactions t
  where t.household_id = p_household_id
    and t.id = any(p_transaction_ids)
    and t.transfer_group_id is null;

  if v_visible_count <> v_requested_count then
    raise exception using errcode = '22023', message = 'Every selected item must be a non-transfer transaction in this household.';
  end if;

  if v_type_count <> 1 then
    raise exception using errcode = '22023', message = 'Selected transactions must have the same type.';
  end if;

  select t.type
  into v_transaction_type
  from public.transactions t
  where t.household_id = p_household_id
    and t.id = any(p_transaction_ids)
  limit 1;

  if p_category_id is not null then
    select c.type
    into v_category_type
    from public.categories c
    where c.id = p_category_id
      and c.household_id = p_household_id;

    if not found then
      raise exception using errcode = '22023', message = 'Category must belong to this household.';
    end if;

    if v_category_type::text <> v_transaction_type::text then
      raise exception using errcode = '22023', message = 'Category type must match the selected transactions.';
    end if;
  end if;

  update public.transactions
  set category_id = p_category_id
  where household_id = p_household_id
    and id = any(p_transaction_ids)
    and transfer_group_id is null;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;


--
-- Name: bulk_update_transfer_category(uuid, uuid[], uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.bulk_update_transfer_category(p_household_id uuid, p_transfer_group_ids uuid[], p_category_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_requested_count integer;
  v_valid_count integer;
  v_category_type public.category_type;
begin
  if p_household_id is null then
    raise exception using errcode = '22023', message = 'Household is required.';
  end if;

  if not public.is_household_member(p_household_id, (select auth.uid())) then
    raise exception using errcode = '42501', message = 'Household membership is required.';
  end if;

  if p_transfer_group_ids is null or coalesce(array_length(p_transfer_group_ids, 1), 0) = 0 then
    raise exception using errcode = '22023', message = 'Select at least one transfer.';
  end if;

  if array_position(p_transfer_group_ids, null) is not null then
    raise exception using errcode = '22023', message = 'Transfer IDs cannot contain null values.';
  end if;

  select count(distinct transfer_group_id)::integer
  into v_requested_count
  from unnest(p_transfer_group_ids) as selected(transfer_group_id);

  if v_requested_count <> array_length(p_transfer_group_ids, 1) then
    raise exception using errcode = '22023', message = 'Transfer IDs must be unique.';
  end if;

  select count(*)::integer
  into v_valid_count
  from (
    select t.transfer_group_id
    from public.transactions t
    where t.household_id = p_household_id
      and t.transfer_group_id = any(p_transfer_group_ids)
    group by t.transfer_group_id
    having count(*) = 2
      and count(*) filter (where t.type = 'expense') = 1
      and count(*) filter (where t.type = 'income') = 1
  ) valid_groups;

  if v_valid_count <> v_requested_count then
    raise exception using errcode = '22023', message = 'Every selected item must be a valid transfer in this household.';
  end if;

  if p_category_id is not null then
    select c.type
    into v_category_type
    from public.categories c
    where c.id = p_category_id
      and c.household_id = p_household_id;

    if not found then
      raise exception using errcode = '22023', message = 'Category must belong to this household.';
    end if;

    if v_category_type::text not in ('account', 'expense') then
      raise exception using errcode = '22023', message = 'Transfer category must be an account or expense category.';
    end if;
  end if;

  update public.transactions
  set category_id = p_category_id
  where household_id = p_household_id
    and transfer_group_id = any(p_transfer_group_ids);

  return v_requested_count;
end;
$$;


--
-- Name: bump_planned_item_definition_version(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.bump_planned_item_definition_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if (new.amount is distinct from old.amount)
        or (new.source_account_id is distinct from old.source_account_id)
        or (new.category_id is distinct from old.category_id)
        or (new.allocation_mode is distinct from old.allocation_mode) then
        new.definition_version = old.definition_version + 1;
    end if;
    return new;
end;
$$;


--
-- Name: FUNCTION bump_planned_item_definition_version(); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.bump_planned_item_definition_version() IS 'BEFORE UPDATE trigger on planned_items: bumps definition_version when amount, source_account_id, category_id or allocation_mode actually changed. Companion to bump_planned_item_version_from_destination() on planned_item_destinations, which bumps the same counter when the destination set changes.';


--
-- Name: bump_planned_item_version_from_destination(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.bump_planned_item_version_from_destination() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    v_planned_item_id uuid;
begin
    v_planned_item_id := coalesce(new.planned_item_id, old.planned_item_id);

    update public.planned_items
        set definition_version = definition_version + 1
        where id = v_planned_item_id;

    return null;
end;
$$;


--
-- Name: FUNCTION bump_planned_item_version_from_destination(); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.bump_planned_item_version_from_destination() IS 'AFTER INSERT OR UPDATE OR DELETE trigger on planned_item_destinations: bumps the parent planned_items.definition_version. Companion to bump_planned_item_definition_version() on planned_items itself.';


--
-- Name: cancel_planned_item_occurrence(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.cancel_planned_item_occurrence(p_occurrence_id uuid) RETURNS public.planned_item_occurrences
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can cancel a planned item occurrence';
    end if;

    if v_occurrence.status <> 'planned' then
        raise exception 'Only a planned occurrence can be cancelled (occurrence % is %)', p_occurrence_id, v_occurrence.status;
    end if;

    update public.planned_item_occurrences
       set status = 'cancelled'
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;


--
-- Name: categorize_monthly_budget_wage(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.categorize_monthly_budget_wage() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
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
           and category.name = 'Wages'
         limit 1;
    end if;

    return new;
end;
$$;


--
-- Name: check_planned_item_destinations_deferred(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.check_planned_item_destinations_deferred() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    v_planned_item_id uuid;
    v_is_estimate boolean;
    v_allocation_mode public.planned_item_allocation_mode;
    v_amount numeric(14,2);
    v_dest_count integer;
    v_sum_amount numeric(14,2);
    v_sum_percent numeric(5,2);
begin
    v_planned_item_id := coalesce(new.planned_item_id, old.planned_item_id);

    select is_estimate, allocation_mode, amount
        into v_is_estimate, v_allocation_mode, v_amount
        from public.planned_items
        where id = v_planned_item_id;

    if not found then
        -- Parent planned_item was deleted; cascade already removed every
        -- destination row for it, so there is nothing left to check.
        return null;
    end if;

    select count(*), coalesce(sum(amount), 0), coalesce(sum(percent), 0)
        into v_dest_count, v_sum_amount, v_sum_percent
        from public.planned_item_destinations
        where planned_item_id = v_planned_item_id;

    -- Applies regardless of allocation_mode: an item flagged as an
    -- estimate may have at most one destination.
    if v_is_estimate and v_dest_count > 1 then
        raise exception 'Estimate planned items may have at most one destination (item % has %)', v_planned_item_id, v_dest_count;
    end if;

    -- Applies regardless of is_estimate: 'single' mode always means at
    -- most one destination. (Fixes an open gap from the Phase 2 review --
    -- previously only the is_estimate branch above constrained cardinality,
    -- so a non-estimate 'single'-mode item could accumulate destinations
    -- with nothing in the DB stopping it.)
    if v_allocation_mode = 'single' and v_dest_count > 1 then
        raise exception 'single allocation mode planned items may have at most one destination (item % has %)', v_planned_item_id, v_dest_count;
    end if;

    if v_allocation_mode = 'custom_amount' and v_sum_amount <> v_amount then
        raise exception 'Destination amounts (%) must sum exactly to the planned item amount (%) for item %', v_sum_amount, v_amount, v_planned_item_id;
    end if;

    if v_allocation_mode = 'custom_percent' and v_sum_percent <> 100 then
        raise exception 'Destination percentages (%) must sum exactly to 100 for item %', v_sum_percent, v_planned_item_id;
    end if;

    return null;
end;
$$;


--
-- Name: FUNCTION check_planned_item_destinations_deferred(); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.check_planned_item_destinations_deferred() IS 'Deferred (INITIALLY DEFERRED) constraint trigger function on planned_item_destinations, checked once per affected planned_item_id at commit: enforces (a) is_estimate items have <= 1 destination, (b) allocation_mode = single items have <= 1 destination unconditionally, and (c) the custom_amount/custom_percent sum-exactness rules. equal_split is intentionally not sum-checked -- there is no stored per-destination figure to sum at the template level for that mode. Redefined in 20260901001700_planned_items_schema_fixes.sql to add check (b); the deferred constraint trigger created in 20260901001300_planned_item_destinations.sql already points at this function by name and did not need to change.';


--
-- Name: check_planned_item_occurrence_destinations_deferred(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.check_planned_item_occurrence_destinations_deferred() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    v_occurrence_id uuid;
    v_expected_amount numeric(14,2);
    v_dest_count integer;
    v_sum_amount numeric(14,2);
begin
    v_occurrence_id := coalesce(new.occurrence_id, old.occurrence_id);

    select expected_amount into v_expected_amount
        from public.planned_item_occurrences
        where id = v_occurrence_id;

    if not found then
        -- Parent occurrence was deleted; cascade already removed every
        -- destination row for it, so there is nothing left to check.
        return null;
    end if;

    select count(*), coalesce(sum(amount), 0) into v_dest_count, v_sum_amount
        from public.planned_item_occurrence_destinations
        where occurrence_id = v_occurrence_id;

    if v_dest_count = 0 then
        -- No destinations is a valid, checkable-free state (plain-expense
        -- occurrences: the transaction is generated directly from
        -- occurrence.source_account_id, with no destination row at all).
        return null;
    end if;

    if v_sum_amount <> v_expected_amount then
        raise exception 'Occurrence destination amounts (%) must sum exactly to the expected amount (%) for occurrence %', v_sum_amount, v_expected_amount, v_occurrence_id;
    end if;

    return null;
end;
$$;


--
-- Name: FUNCTION check_planned_item_occurrence_destinations_deferred(); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.check_planned_item_occurrence_destinations_deferred() IS 'Deferred (INITIALLY DEFERRED) constraint trigger function on planned_item_occurrence_destinations, checked once per affected occurrence_id at commit: when destination count > 0, sum(amount) must equal planned_item_occurrences.expected_amount exactly, for every allocation mode. When destination count = 0 (plain-expense occurrences, generated directly from occurrence.source_account_id) the check is skipped entirely -- there is nothing to sum. Redefined in 20260901001900_fix_occurrence_destinations_sum_trigger.sql to add the zero-destination guard; the deferred constraint trigger created in 20260901001400_planned_item_occurrences.sql already points at this function by name and did not need to change.';


--
-- Name: check_transaction_allocations_consistency(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.check_transaction_allocations_consistency(p_transaction_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_count integer;
  v_sum numeric;
  v_amount numeric;
begin
  if not exists (select 1 from public.transactions t where t.id = p_transaction_id) then
    return;
  end if;

  select count(*), coalesce(sum(ta.amount), 0)
  into v_count, v_sum
  from public.transaction_allocations ta
  where ta.transaction_id = p_transaction_id;

  select t.amount into v_amount
  from public.transactions t
  where t.id = p_transaction_id;

  if v_count = 0 then
    update public.transactions set is_split = false
    where id = p_transaction_id and is_split is distinct from false;
    return;
  end if;

  if v_count < 2 then
    raise exception using
      errcode = '23514',
      message = 'A split transaction requires at least two allocations.';
  end if;

  if round(v_sum, 2) <> round(v_amount, 2) then
    raise exception using
      errcode = '23514',
      message = format('Transaction allocations (%s) must sum to the transaction amount (%s).', v_sum, v_amount);
  end if;

  update public.transactions set is_split = true
  where id = p_transaction_id and is_split is distinct from true;
end;
$$;


--
-- Name: claim_feedback_email_outbox(integer, text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.claim_feedback_email_outbox(p_limit integer DEFAULT 25, p_worker_id text DEFAULT NULL::text) RETURNS SETOF public.feedback_email_outbox
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
    if p_limit not between 1 and 100 then
        raise exception 'Claim limit must be between 1 and 100' using errcode = '22023';
    end if;

    return query
    with candidates as (
        select o.id
        from public.feedback_email_outbox o
        where (
            o.status in ('pending', 'retry') and o.available_at <= now()
        ) or (
            o.status = 'processing' and o.locked_at < now() - interval '10 minutes'
        )
        order by o.available_at, o.created_at
        for update skip locked
        limit p_limit
    )
    update public.feedback_email_outbox o
    set status = 'processing',
        attempt_count = o.attempt_count + 1,
        locked_at = now(),
        locked_by = left(coalesce(nullif(p_worker_id, ''), 'unnamed-worker'), 160)
    from candidates c
    where o.id = c.id
    returning o.*;
end;
$$;


--
-- Name: complete_onboarding_guide(text, integer); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.complete_onboarding_guide(p_guide_key text, p_version integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $_$
declare
  v_onboarding_guides jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to complete an onboarding guide.';
  end if;

  if p_guide_key !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
    raise exception 'Guide key must contain lowercase letters, numbers, hyphens, or underscores.';
  end if;

  if p_version < 1 then
    raise exception 'Guide version must be a positive integer.';
  end if;

  update public.profiles
  set onboarding_guides = jsonb_set(
    onboarding_guides,
    array[p_guide_key],
    to_jsonb(
      greatest(
        case
          when jsonb_typeof(onboarding_guides -> p_guide_key) = 'number'
            and onboarding_guides ->> p_guide_key ~ '^[0-9]+$'
            then (onboarding_guides ->> p_guide_key)::integer
          else 0
        end,
        p_version
      )
    ),
    true
  )
  where id = auth.uid()
  returning onboarding_guides into v_onboarding_guides;

  if not found then
    raise exception 'Profile not found for the authenticated user.';
  end if;

  return v_onboarding_guides;
end;
$_$;


--
-- Name: confirm_monthly_budget_run(uuid, jsonb, jsonb); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.confirm_monthly_budget_run(p_run_id uuid, p_transfers jsonb, p_preview jsonb) RETURNS public.monthly_budget_runs
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_run public.monthly_budget_runs%rowtype;
    v_income record;
    v_transfer jsonb;
    v_transfer_group_id uuid;
    v_source_account_id uuid;
    v_destination_account_id uuid;
    v_generated_by_rule_id uuid;
    v_amount numeric;
    v_title text;
    v_section public.monthly_budget_section;
    v_month_key text;
    v_notes text;
    v_income_title text;
begin
    select *
      into v_run
      from public.monthly_budget_runs
     where id = p_run_id
     for update;

    if not found then
        raise exception 'Monthly budget run not found';
    end if;

    if not public.is_household_admin(v_run.household_id, auth.uid()) then
        raise exception 'Only household admins can confirm a monthly budget run';
    end if;

    -- A retry after a successful commit is a no-op. The row lock also prevents
    -- two concurrent confirmations from generating duplicate transactions.
    if v_run.status = 'confirmed' then
        return v_run;
    end if;

    if v_run.status <> 'draft' then
        raise exception 'Only draft monthly budget runs can be confirmed';
    end if;

    if p_transfers is null or jsonb_typeof(p_transfers) <> 'array' then
        raise exception 'Monthly budget transfers must be a JSON array';
    end if;
    if p_preview is null or jsonb_typeof(p_preview) <> 'object' then
        raise exception 'Monthly budget preview must be a JSON object';
    end if;
    if coalesce(jsonb_array_length(p_preview -> 'validationIssues'), 0) > 0 then
        raise exception 'Monthly budget preview contains validation issues';
    end if;
    if coalesce(p_preview -> 'transfers', '[]'::jsonb) <> p_transfers then
        raise exception 'Monthly budget transfers do not match the saved preview';
    end if;

    v_month_key := to_char(v_run.month, 'YYYY-MM');

    -- Recover safely from confirmations performed by the previous client-side
    -- loop, which could leave partial rows while the run remained a draft.
    delete from public.transactions
     where monthly_budget_run_id = v_run.id;

    -- Credit income that is available in this run before applying allocations.
    for v_income in
        select
            income.member_id,
            income.cash_account_id,
            income.amount,
            income.available_month,
            income.name,
            income.category_id,
            coalesce(nullif(trim(profile.full_name), ''), profile.email, 'Shared') as member_label
        from public.monthly_income_inputs income
        join public.accounts account
          on account.id = income.cash_account_id
         and account.household_id = v_run.household_id
        left join public.profiles profile on profile.id = income.member_id
        where income.monthly_budget_run_id = v_run.id
          and income.available_month = v_run.month
        order by income.created_at, income.member_id
    loop
        if v_income.member_id is not null
           and not public.is_household_member(v_run.household_id, v_income.member_id) then
            raise exception 'Monthly income member does not belong to this household';
        end if;
        if v_income.amount < 0 then
            raise exception 'Monthly income amount cannot be negative';
        end if;

        if v_income.amount > 0 then
            v_income_title := coalesce(nullif(trim(v_income.name), ''), 'Monthly wage: ' || v_income.member_label);

            insert into public.transactions (
                household_id,
                account_id,
                category_id,
                monthly_budget_run_id,
                budget_section,
                title,
                notes,
                amount,
                type,
                transaction_date,
                created_by
            ) values (
                v_run.household_id,
                v_income.cash_account_id,
                v_income.category_id,
                v_run.id,
                'income',
                v_income_title,
                'Monthly budget ' || v_month_key || ' · Income · ' || v_income_title,
                v_income.amount,
                'income',
                v_run.month::timestamptz,
                coalesce(v_income.member_id, auth.uid())
            );
        end if;
    end loop;

    -- Apply the already validated preview in rule priority order. Both legs get
    -- the same run metadata and readable note for database inspection.
    for v_transfer in select value from jsonb_array_elements(p_transfers)
    loop
        v_source_account_id := nullif(v_transfer ->> 'sourceAccountId', '')::uuid;
        v_destination_account_id := nullif(v_transfer ->> 'destinationAccountId', '')::uuid;
        v_generated_by_rule_id := nullif(v_transfer ->> 'generatedByRuleId', '')::uuid;
        v_amount := (v_transfer ->> 'amount')::numeric;
        v_title := nullif(trim(v_transfer ->> 'title'), '');
        v_section := (v_transfer ->> 'section')::public.monthly_budget_section;

        if v_amount is null or v_amount <= 0 then
            raise exception 'Budget transfer amount must be greater than zero';
        end if;
        if v_title is null then
            raise exception 'Budget transfer title is required';
        end if;
        if v_section is null then
            raise exception 'Budget transfer section is required';
        end if;
        if coalesce(v_transfer ->> 'destinationKind', 'account') <> 'account'
           or nullif(v_transfer ->> 'destinationPotId', '') is not null then
            raise exception 'Budget transfers must use account destinations';
        end if;
        if v_source_account_id is null or v_destination_account_id is null
           or v_source_account_id = v_destination_account_id then
            raise exception 'Budget transfer must use two different accounts';
        end if;
        if not exists (
            select 1 from public.accounts
             where id = v_source_account_id and household_id = v_run.household_id
        ) or not exists (
            select 1 from public.accounts
             where id = v_destination_account_id and household_id = v_run.household_id
        ) then
            raise exception 'Budget transfer account does not belong to this household';
        end if;
        if v_generated_by_rule_id is not null and not exists (
            select 1
              from public.budget_rules rule
             where rule.id = v_generated_by_rule_id
               and rule.budget_config_id = v_run.budget_config_id
        ) then
            raise exception 'Budget transfer rule does not belong to this run configuration';
        end if;

        v_transfer_group_id := gen_random_uuid();
        v_notes := 'Monthly budget ' || v_month_key || ' · ' ||
            case when v_section = 'remaining_cash' then 'Remaining cash distribution' else 'Allocation · ' || v_title end;

        insert into public.transactions (
            household_id, account_id, transfer_group_id,
            monthly_budget_run_id, generated_by_rule_id, budget_section,
            title, notes, amount, type, transaction_date, created_by
        ) values (
            v_run.household_id, v_source_account_id, v_transfer_group_id,
            v_run.id, v_generated_by_rule_id, v_section,
            v_title, v_notes, v_amount, 'expense', v_run.month::timestamptz, auth.uid()
        );

        insert into public.transactions (
            household_id, account_id, transfer_group_id,
            monthly_budget_run_id, generated_by_rule_id, budget_section,
            title, notes, amount, type, transaction_date, created_by
        ) values (
            v_run.household_id, v_destination_account_id, v_transfer_group_id,
            v_run.id, v_generated_by_rule_id, v_section,
            v_title, v_notes, v_amount, 'income', v_run.month::timestamptz, auth.uid()
        );
    end loop;

    -- Deferred income is a real receipt in this run, but it is inserted only
    -- after allocations so it cannot fund the current month's rules.
    for v_income in
        select
            income.member_id,
            income.cash_account_id,
            income.amount,
            income.available_month,
            income.name,
            income.category_id,
            coalesce(nullif(trim(profile.full_name), ''), profile.email, 'Shared') as member_label
        from public.monthly_income_inputs income
        join public.accounts account
          on account.id = income.cash_account_id
         and account.household_id = v_run.household_id
        left join public.profiles profile on profile.id = income.member_id
        where income.monthly_budget_run_id = v_run.id
          and income.available_month <> v_run.month
        order by income.created_at, income.member_id
    loop
        if v_income.member_id is not null
           and not public.is_household_member(v_run.household_id, v_income.member_id) then
            raise exception 'Monthly income member does not belong to this household';
        end if;
        if v_income.amount < 0 then
            raise exception 'Monthly income amount cannot be negative';
        end if;

        if v_income.amount > 0 then
            v_income_title := coalesce(nullif(trim(v_income.name), ''), 'Monthly wage: ' || v_income.member_label);

            insert into public.transactions (
                household_id, account_id, category_id, monthly_budget_run_id, budget_section,
                title, notes, amount, type, transaction_date, created_by
            ) values (
                v_run.household_id, v_income.cash_account_id, v_income.category_id, v_run.id, 'income',
                v_income_title,
                'Monthly budget ' || v_month_key || ' · Income · ' || v_income_title ||
                    ' · Available ' || to_char(v_income.available_month, 'YYYY-MM'),
                v_income.amount, 'income', v_run.month::timestamptz, coalesce(v_income.member_id, auth.uid())
            );
        end if;
    end loop;

    update public.monthly_budget_runs
       set status = 'confirmed',
           preview_snapshot = p_preview
     where id = v_run.id
     returning * into v_run;

    return v_run;
end;
$$;


--
-- Name: confirm_planned_item_month(uuid, date, jsonb, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.confirm_planned_item_month(p_household_id uuid, p_month date, p_transfers jsonb, p_confirmed_by uuid) RETURNS public.monthly_budget_periods
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_leg jsonb;
    v_occurrence_id uuid;
    v_occurrence public.planned_item_occurrences%rowtype;
    v_role public.planned_item_transaction_role;
    v_account_id uuid;
    v_amount numeric;
    v_category_id uuid;
    v_lookup_account_id uuid;
    v_occurrence_destination_id uuid;
    v_transfer_groups jsonb := '{}'::jsonb;
    v_transfer_group_id uuid;
    v_type public.transaction_type;
    v_item_name text;
    v_month_key text;
    v_title text;
    v_notes text;
    v_period public.monthly_budget_periods%rowtype;
    v_batch_id uuid;
    v_income_count integer := 0;
    v_income_total numeric := 0;
    v_transfer_count integer := 0;
    v_transfer_total numeric := 0;
begin
    if not public.is_household_admin(p_household_id, auth.uid()) then
        raise exception 'Only household admins can confirm a monthly budget month';
    end if;

    p_transfers := coalesce(p_transfers, '[]'::jsonb);
    if jsonb_typeof(p_transfers) <> 'array' then
        raise exception 'Planned item transfers must be a JSON array';
    end if;

    -- Serialise concurrent clicks on the same month: make sure the period
    -- row exists, then lock it. A second caller blocks here until the
    -- first commits, then sees status <> 'open' and inserts nothing.
    insert into public.monthly_budget_periods (household_id, month, status)
    values (p_household_id, p_month, 'open')
    on conflict (household_id, month) do nothing;

    select * into v_period
      from public.monthly_budget_periods
     where household_id = p_household_id and month = p_month
     for update;

    if v_period.status <> 'open' then
        return v_period; -- already created: never create anything twice
    end if;

    insert into public.monthly_budget_batches (household_id, month, created_by)
    values (p_household_id, p_month, p_confirmed_by)
    returning id into v_batch_id;

    v_month_key := to_char(p_month, 'YYYY-MM');

    -- Income legs first (occurrence.source_account_id is null), then every
    -- transfer leg, each group in its original order -- see
    -- 20260901002400 for why created_at uses clock_timestamp().
    for v_leg in
        select elems.value
          from jsonb_array_elements(p_transfers) with ordinality as elems(value, ord)
          left join public.planned_item_occurrences poc
                 on poc.id = nullif(elems.value ->> 'occurrenceId', '')::uuid
                and poc.household_id = p_household_id
         order by coalesce(poc.source_account_id is not null, true), elems.ord
    loop
        v_occurrence_id := nullif(v_leg ->> 'occurrenceId', '')::uuid;
        if v_occurrence_id is null then
            raise exception 'Planned item transfer entry is missing occurrenceId';
        end if;

        select * into v_occurrence
          from public.planned_item_occurrences
         where id = v_occurrence_id
           and household_id = p_household_id
         for update;

        if not found then
            raise exception 'Planned item occurrence % does not belong to household %', v_occurrence_id, p_household_id;
        end if;
        if v_occurrence.month <> p_month then
            raise exception 'Planned item occurrence % is not in month %', v_occurrence_id, v_month_key;
        end if;

        if v_occurrence.status <> 'planned' or v_occurrence.is_estimate then
            continue;
        end if;

        v_role := (v_leg ->> 'role')::public.planned_item_transaction_role;
        v_account_id := nullif(v_leg ->> 'accountId', '')::uuid;
        v_amount := (v_leg ->> 'amount')::numeric;
        v_category_id := nullif(v_leg ->> 'categoryId', '')::uuid;
        v_lookup_account_id := nullif(v_leg ->> 'occurrenceDestinationLookupAccountId', '')::uuid;

        if v_role is null then
            raise exception 'Planned item transfer leg is missing a role (occurrence %)', v_occurrence_id;
        end if;
        if v_amount is null or v_amount <= 0 then
            raise exception 'Planned item transfer amount must be greater than zero (occurrence %)', v_occurrence_id;
        end if;
        if v_account_id is null then
            raise exception 'Planned item transfer is missing an account (occurrence %)', v_occurrence_id;
        end if;
        if not exists (
            select 1 from public.accounts where id = v_account_id and household_id = p_household_id
        ) then
            raise exception 'Planned item transfer account % does not belong to household %', v_account_id, p_household_id;
        end if;

        v_occurrence_destination_id := null;
        v_transfer_group_id := null;

        if v_lookup_account_id is not null then
            select id into v_occurrence_destination_id
              from public.planned_item_occurrence_destinations
             where occurrence_id = v_occurrence_id
               and destination_account_id = v_lookup_account_id
             limit 1;

            if v_occurrence_destination_id is null then
                raise exception 'No occurrence destination for account % on occurrence % -- call materialize_planned_item_occurrences first',
                    v_lookup_account_id, v_occurrence_id;
            end if;

            if v_role in ('transfer_source', 'transfer_destination') then
                v_transfer_group_id := nullif(v_transfer_groups ->> v_occurrence_destination_id::text, '')::uuid;
                if v_transfer_group_id is null then
                    v_transfer_group_id := gen_random_uuid();
                    v_transfer_groups := v_transfer_groups
                        || jsonb_build_object(v_occurrence_destination_id::text, v_transfer_group_id::text);
                end if;
            end if;
        end if;

        v_type := case when v_role in ('transfer_destination', 'income') then 'income' else 'expense' end;

        -- Per-leg idempotency (unchanged).
        if v_occurrence_destination_id is not null then
            if exists (
                select 1 from public.transactions
                 where planned_item_occurrence_destination_id = v_occurrence_destination_id
                   and planned_item_transaction_role = v_role
            ) then
                continue;
            end if;
        else
            if exists (
                select 1 from public.transactions
                 where planned_item_occurrence_id = v_occurrence_id
                   and planned_item_occurrence_destination_id is null
                   and planned_item_transaction_role = 'plain_expense'
            ) then
                continue;
            end if;
        end if;

        select pi.name into v_item_name
          from public.planned_items pi
         where pi.id = v_occurrence.planned_item_id;

        v_title := coalesce(v_item_name, 'Planned item');
        v_notes := 'Monthly budget ' || v_month_key || ' · ' || v_title;

        insert into public.transactions (
            household_id, account_id, category_id, transfer_group_id,
            title, notes, amount, type, transaction_date, created_by, created_at,
            planned_item_occurrence_id, planned_item_occurrence_destination_id,
            planned_item_transaction_role, monthly_budget_batch_id
        ) values (
            p_household_id, v_account_id, v_category_id, v_transfer_group_id,
            v_title, v_notes, v_amount, v_type, p_month::timestamptz, p_confirmed_by, clock_timestamp(),
            v_occurrence_id, v_occurrence_destination_id, v_role, v_batch_id
        );

        if v_role = 'income' then
            v_income_count := v_income_count + 1;
            v_income_total := v_income_total + v_amount;
        elsif v_role = 'transfer_source' then
            v_transfer_count := v_transfer_count + 1;
            v_transfer_total := v_transfer_total + v_amount;
        end if;
    end loop;

    if v_income_count = 0 and v_transfer_count = 0 then
        raise exception 'Nothing to create for % -- every income and movement is already created or not due this month.', v_month_key;
    end if;

    update public.monthly_budget_batches
       set income_count = v_income_count,
           income_total = v_income_total,
           transfer_count = v_transfer_count,
           transfer_total = v_transfer_total
     where id = v_batch_id;

    update public.planned_item_occurrences
       set status = 'confirmed',
           confirmed_at = now(),
           confirmed_by = p_confirmed_by
     where household_id = p_household_id
       and month = p_month
       and status = 'planned'
       and not is_estimate
       and id in (
           select distinct nullif(value ->> 'occurrenceId', '')::uuid
             from jsonb_array_elements(p_transfers)
       );

    update public.monthly_budget_periods
       set status = 'committed',
           confirmed_at = now(),
           confirmed_by = p_confirmed_by
     where id = v_period.id
     returning * into v_period;

    return v_period;
end;
$$;


--
-- Name: FUNCTION confirm_planned_item_month(p_household_id uuid, p_month date, p_transfers jsonb, p_confirmed_by uuid); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.confirm_planned_item_month(p_household_id uuid, p_month date, p_transfers jsonb, p_confirmed_by uuid) IS 'Atomically creates a month''s income transaction(s) and then its expected-movement transfers, records them as one monthly_budget_batches row (transactions.monthly_budget_batch_id), and commits the period. Locks the period row first; a repeat call for an already-committed month creates nothing. See 20260929120000_monthly_budget_batches.sql.';


--
-- Name: confirm_planned_item_occurrence(uuid, uuid, numeric); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.confirm_planned_item_occurrence(p_occurrence_id uuid, p_confirmed_by uuid, p_actual_amount numeric DEFAULT NULL::numeric) RETURNS public.planned_item_occurrences
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
    v_item_name text;
    v_title text;
    v_notes text;
    v_amount numeric;
    v_destination_count integer;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can mark a planned item occurrence as paid';
    end if;

    if v_occurrence.status <> 'planned' then
        raise exception 'Occurrence % is already %, not planned', p_occurrence_id, v_occurrence.status;
    end if;

    if v_occurrence.source_account_id is null then
        raise exception 'Occurrence % is an income item -- use confirm_planned_item_month or match_planned_item_occurrence instead', p_occurrence_id;
    end if;

    select count(*) into v_destination_count
      from public.planned_item_occurrence_destinations
     where occurrence_id = p_occurrence_id;

    if v_destination_count > 0 then
        raise exception 'Occurrence % has % destination account(s) -- pay a split/transfer item via Run Monthly Budget instead', p_occurrence_id, v_destination_count;
    end if;

    v_amount := coalesce(p_actual_amount, v_occurrence.expected_amount);
    if v_amount <= 0 then
        raise exception 'Actual amount must be greater than zero';
    end if;

    -- Same idempotency guard confirm_planned_item_month uses for its own
    -- plain_expense branch (also enforced by
    -- idx_transactions_one_plain_expense_per_occurrence as a backstop).
    if exists (
        select 1 from public.transactions
         where planned_item_occurrence_id = p_occurrence_id
           and planned_item_occurrence_destination_id is null
           and planned_item_transaction_role = 'plain_expense'
    ) then
        raise exception 'Occurrence % already has a transaction', p_occurrence_id;
    end if;

    select pi.name into v_item_name
      from public.planned_items pi
     where pi.id = v_occurrence.planned_item_id;

    v_title := coalesce(v_item_name, 'Planned item');
    v_notes := 'Monthly budget ' || to_char(v_occurrence.month, 'YYYY-MM') || ' · ' || v_title;

    insert into public.transactions (
        household_id, account_id, category_id, transfer_group_id,
        title, notes, amount, type, transaction_date, created_by, created_at,
        planned_item_occurrence_id, planned_item_occurrence_destination_id,
        planned_item_transaction_role
    ) values (
        v_occurrence.household_id, v_occurrence.source_account_id, v_occurrence.category_id, null,
        v_title, v_notes, v_amount, 'expense', v_occurrence.month::timestamptz, p_confirmed_by, clock_timestamp(),
        p_occurrence_id, null, 'plain_expense'
    );

    update public.planned_item_occurrences
       set status = 'confirmed',
           confirmed_at = now(),
           confirmed_by = p_confirmed_by
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;


--
-- Name: confirm_replenishment_run(uuid, jsonb, jsonb); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.confirm_replenishment_run(p_run_id uuid, p_unit_sources jsonb, p_preview jsonb) RETURNS public.replenishment_runs
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_run public.replenishment_runs%rowtype;
    v_unit jsonb;
    v_source jsonb;
    v_transaction_id uuid;
    v_old_account_id uuid;
    v_covered_total numeric;
    v_conflicting_transaction_id uuid;
    v_transaction public.transactions%rowtype;
    v_allocation public.transaction_allocations%rowtype;
    v_unit_total numeric;
    v_source_count integer;
    v_source_type text;
    v_source_account_id uuid;
    v_source_pot_id uuid;
    v_source_amount numeric;
    v_sources_sum numeric;
    v_new_sources jsonb;
    v_existing_allocation_id uuid;
    v_representative_account_id uuid;
    v_representative_amount numeric;
    v_sort_order integer;
begin
    select *
      into v_run
      from public.replenishment_runs
     where id = p_run_id
     for update;

    if not found then
        raise exception 'Replenishment run not found';
    end if;

    if not public.is_household_member(v_run.household_id, auth.uid()) then
        raise exception 'Not authorized to confirm this replenishment';
    end if;

    -- A retry after a successful commit is a no-op. The row lock also
    -- prevents two concurrent confirmations from double-applying.
    if v_run.status = 'confirmed' then
        return v_run;
    end if;

    if v_run.status <> 'draft' then
        raise exception 'Only draft replenishment runs can be confirmed';
    end if;

    if p_unit_sources is null or jsonb_typeof(p_unit_sources) <> 'array' then
        raise exception 'Replenishment funding assignments must be a JSON array';
    end if;
    if jsonb_array_length(p_unit_sources) = 0 then
        raise exception 'Replenishment must include at least one funding assignment';
    end if;
    if p_preview is null or jsonb_typeof(p_preview) <> 'object' then
        raise exception 'Replenishment preview must be a JSON object';
    end if;
    -- Reject a stale/tampered preview -- what the user saw must be exactly
    -- what gets confirmed.
    if coalesce(p_preview -> 'unitSources', '[]'::jsonb) <> p_unit_sources then
        raise exception 'Replenishment funding assignments do not match the saved preview';
    end if;

    if not exists (
        select 1 from public.replenishment_run_transactions where run_id = v_run.id
    ) then
        raise exception 'Replenishment run has no covered transactions';
    end if;

    -- The covered transactions' snapshotted total must still match the
    -- run's declared total -- refuses to confirm against a preview that has
    -- gone stale relative to what was actually selected.
    select coalesce(sum(amount), 0)
      into v_covered_total
      from public.replenishment_run_transactions
     where run_id = v_run.id;

    if v_covered_total <> v_run.total_amount then
        raise exception 'Replenishment total no longer matches the selected transactions';
    end if;

    -- Double-repayment guard: none of this run's covered transactions may
    -- also be covered by a different, already-confirmed run.
    select rrt.transaction_id
      into v_conflicting_transaction_id
      from public.replenishment_run_transactions rrt
      join public.replenishment_runs other on other.id = rrt.run_id
     where rrt.transaction_id in (
             select transaction_id
               from public.replenishment_run_transactions
              where run_id = v_run.id
           )
       and other.id <> v_run.id
       and other.status = 'confirmed'
     limit 1;

    if v_conflicting_transaction_id is not null then
        raise exception using
            errcode = '23505',
            message = 'One or more selected transactions have already been replenished by another confirmed run.',
            detail = format('Transaction %s is already covered.', v_conflicting_transaction_id);
    end if;

    -- One iteration per covered unit: either a whole non-split transaction,
    -- or one transaction_allocations row of an already-split one.
    for v_unit in select value from jsonb_array_elements(p_unit_sources)
    loop
        v_transaction_id := nullif(v_unit ->> 'transactionId', '')::uuid;
        v_old_account_id := nullif(v_unit ->> 'accountId', '')::uuid;

        if v_transaction_id is null or v_old_account_id is null then
            raise exception 'Replenishment funding assignment is missing transactionId/accountId';
        end if;

        select coalesce(sum(amount), 0)
          into v_unit_total
          from public.replenishment_run_transactions
         where run_id = v_run.id
           and transaction_id = v_transaction_id
           and account_id = v_old_account_id;

        if v_unit_total <= 0 then
            raise exception 'Replenishment funding assignment does not match a covered transaction for this run';
        end if;

        v_source_count := jsonb_array_length(coalesce(v_unit -> 'sources', '[]'::jsonb));
        if v_source_count = 0 then
            raise exception 'Replenishment funding assignment for transaction % has no sources', v_transaction_id;
        end if;

        select coalesce(sum(round((s ->> 'amount')::numeric, 2)), 0)
          into v_sources_sum
          from jsonb_array_elements(v_unit -> 'sources') s;
        if round(v_sources_sum, 2) <> round(v_unit_total, 2) then
            raise exception 'Replenishment funding assignment for transaction % must sum to %', v_transaction_id, v_unit_total;
        end if;

        select *
          into v_transaction
          from public.transactions
         where id = v_transaction_id
         for update;

        if not found then
            raise exception 'Covered transaction % no longer exists', v_transaction_id;
        end if;

        if not v_transaction.is_split then
            -- ------------------------------------------------------------
            -- The whole (non-split) transaction is the unit.
            -- ------------------------------------------------------------
            if v_transaction.account_id <> v_old_account_id then
                raise exception 'Covered transaction % has changed account since this run was drafted', v_transaction_id;
            end if;

            if v_source_count = 1 then
                v_source := (v_unit -> 'sources') -> 0;
                v_source_type := v_source ->> 'sourceType';
                v_source_account_id := nullif(v_source ->> 'accountId', '')::uuid;
                v_source_pot_id := nullif(v_source ->> 'potId', '')::uuid;

                if v_source_type not in ('account', 'pot') or v_source_account_id is null then
                    raise exception 'Replenishment source for transaction % is invalid', v_transaction_id;
                end if;
                if not exists (
                    select 1 from public.accounts where id = v_source_account_id and household_id = v_run.household_id
                ) then
                    raise exception 'Replenishment source account does not belong to this household';
                end if;
                if v_source_pot_id is not null and not exists (
                    select 1 from public.saving_pots where id = v_source_pot_id and household_id = v_run.household_id
                ) then
                    raise exception 'Replenishment source pot does not belong to this household';
                end if;

                update public.transactions
                   set account_id = v_source_account_id,
                       pot_id = v_source_pot_id,
                       original_source_type = coalesce(original_source_type, 'account'),
                       original_account_id = coalesce(original_account_id, v_old_account_id),
                       replenishment_run_id = v_run.id
                 where id = v_transaction_id;

                v_new_sources := jsonb_build_array(jsonb_build_object(
                    'source_type', v_source_type,
                    'account_id', v_source_account_id,
                    'pot_id', v_source_pot_id,
                    'amount', v_unit_total
                ));
            else
                -- Needs more than one source: convert into a split
                -- transaction funded by them, reusing the same
                -- transaction_allocations mechanism split transactions
                -- already use everywhere else in the app.
                v_representative_account_id := null;
                v_representative_amount := -1;
                v_new_sources := '[]'::jsonb;
                v_sort_order := 0;

                for v_source in select value from jsonb_array_elements(v_unit -> 'sources')
                loop
                    v_source_type := v_source ->> 'sourceType';
                    v_source_account_id := nullif(v_source ->> 'accountId', '')::uuid;
                    v_source_pot_id := nullif(v_source ->> 'potId', '')::uuid;
                    v_source_amount := round(coalesce((v_source ->> 'amount')::numeric, 0), 2);

                    if v_source_amount <= 0 then
                        raise exception 'Every replenishment source amount must be greater than zero';
                    end if;
                    if v_source_type = 'account' then
                        if v_source_account_id is null then
                            raise exception 'Replenishment account source is missing accountId';
                        end if;
                        if not exists (
                            select 1 from public.accounts where id = v_source_account_id and household_id = v_run.household_id
                        ) then
                            raise exception 'Replenishment source account does not belong to this household';
                        end if;
                    elsif v_source_type = 'pot' then
                        if v_source_pot_id is null then
                            raise exception 'Replenishment pot source is missing potId';
                        end if;
                        if not exists (
                            select 1 from public.saving_pots where id = v_source_pot_id and household_id = v_run.household_id
                        ) then
                            raise exception 'Replenishment source pot does not belong to this household';
                        end if;
                    else
                        raise exception 'Replenishment source for transaction % is invalid', v_transaction_id;
                    end if;

                    insert into public.transaction_allocations (
                        household_id, transaction_id, source_type, account_id, pot_id, amount, sort_order,
                        original_source_type, original_account_id, replenishment_run_id
                    ) values (
                        v_run.household_id, v_transaction_id, v_source_type, v_source_account_id, v_source_pot_id, v_source_amount,
                        v_sort_order, 'account', v_old_account_id, v_run.id
                    );
                    v_sort_order := v_sort_order + 1;

                    if v_source_account_id is not null and v_source_amount > v_representative_amount then
                        v_representative_account_id := v_source_account_id;
                        v_representative_amount := v_source_amount;
                    end if;

                    v_new_sources := v_new_sources || jsonb_build_object(
                        'source_type', v_source_type,
                        'account_id', v_source_account_id,
                        'pot_id', v_source_pot_id,
                        'amount', v_source_amount
                    );
                end loop;

                update public.transactions
                   set is_split = true,
                       account_id = coalesce(v_representative_account_id, account_id),
                       pot_id = null,
                       original_source_type = coalesce(original_source_type, 'account'),
                       original_account_id = coalesce(original_account_id, v_old_account_id),
                       replenishment_run_id = v_run.id
                 where id = v_transaction_id;
            end if;
        else
            -- ------------------------------------------------------------
            -- One transaction_allocations row of an already-split
            -- transaction is the unit -- only that slice's source changes;
            -- every other allocation on the same transaction is untouched.
            -- ------------------------------------------------------------
            select *
              into v_allocation
              from public.transaction_allocations
             where transaction_id = v_transaction_id
               and account_id = v_old_account_id
             for update;

            if not found then
                raise exception 'Covered allocation for transaction % / account % no longer exists', v_transaction_id, v_old_account_id;
            end if;

            if round(v_allocation.amount, 2) <> round(v_unit_total, 2) then
                raise exception 'Covered allocation for transaction % has changed amount since this run was drafted', v_transaction_id;
            end if;

            v_new_sources := '[]'::jsonb;

            -- Delete the old allocation row up front. Each new source below
            -- either merges into a sibling allocation already funding a
            -- different slice of this same transaction from the same
            -- account/pot (adding onto its amount -- its own
            -- original_*/replenishment_run_id are left as they were, since
            -- only part of its new total came through this replenishment)
            -- or inserts a fresh row -- either way the old row for this
            -- exact account must already be gone first, or the "one row
            -- per account/pot per transaction" unique indexes would see it
            -- as a duplicate of itself.
            delete from public.transaction_allocations where id = v_allocation.id;

            for v_source in select value from jsonb_array_elements(v_unit -> 'sources')
            loop
                v_source_type := v_source ->> 'sourceType';
                v_source_account_id := nullif(v_source ->> 'accountId', '')::uuid;
                v_source_pot_id := nullif(v_source ->> 'potId', '')::uuid;
                v_source_amount := round(coalesce((v_source ->> 'amount')::numeric, 0), 2);
                v_existing_allocation_id := null;

                if v_source_amount <= 0 then
                    raise exception 'Every replenishment source amount must be greater than zero';
                end if;

                if v_source_type = 'account' then
                    if v_source_account_id is null then
                        raise exception 'Replenishment account source is missing accountId';
                    end if;
                    if not exists (
                        select 1 from public.accounts where id = v_source_account_id and household_id = v_run.household_id
                    ) then
                        raise exception 'Replenishment source account does not belong to this household';
                    end if;
                    select id into v_existing_allocation_id
                      from public.transaction_allocations
                     where transaction_id = v_transaction_id and account_id = v_source_account_id
                     for update;
                elsif v_source_type = 'pot' then
                    if v_source_pot_id is null then
                        raise exception 'Replenishment pot source is missing potId';
                    end if;
                    if not exists (
                        select 1 from public.saving_pots where id = v_source_pot_id and household_id = v_run.household_id
                    ) then
                        raise exception 'Replenishment source pot does not belong to this household';
                    end if;
                    select id into v_existing_allocation_id
                      from public.transaction_allocations
                     where transaction_id = v_transaction_id and pot_id = v_source_pot_id
                     for update;
                else
                    raise exception 'Replenishment source for transaction % is invalid', v_transaction_id;
                end if;

                if v_existing_allocation_id is not null then
                    update public.transaction_allocations
                       set amount = amount + v_source_amount
                     where id = v_existing_allocation_id;
                else
                    insert into public.transaction_allocations (
                        household_id, transaction_id, source_type, account_id, pot_id, amount, sort_order,
                        original_source_type, original_account_id, replenishment_run_id
                    ) values (
                        v_run.household_id, v_transaction_id, v_source_type, v_source_account_id, v_source_pot_id, v_source_amount,
                        coalesce((select max(sort_order) + 1 from public.transaction_allocations where transaction_id = v_transaction_id), 0),
                        'account', coalesce(v_allocation.original_account_id, v_old_account_id), v_run.id
                    );
                end if;

                v_new_sources := v_new_sources || jsonb_build_object(
                    'source_type', v_source_type,
                    'account_id', v_source_account_id,
                    'pot_id', v_source_pot_id,
                    'amount', v_source_amount
                );
            end loop;

            -- A merge above (a new source that already funded a different
            -- slice of this same transaction) can leave exactly one
            -- allocation row where there used to be several -- e.g.
            -- replenishing a 50/150 split's 50 slice from the account that
            -- already funded the other 150 collapses it to one 200 row.
            -- transaction_allocations requires >= 2 rows whenever any
            -- exist (enforce_transaction_allocations_integrity), so a
            -- single remaining row must revert this transaction to a
            -- plain non-split one -- the same shape
            -- save_transaction_allocations produces for an empty
            -- allocations array, just arrived at from the other direction.
            if (select count(*) from public.transaction_allocations where transaction_id = v_transaction_id) = 1 then
                select * into v_allocation
                  from public.transaction_allocations
                 where transaction_id = v_transaction_id;

                delete from public.transaction_allocations where id = v_allocation.id;

                update public.transactions
                   set is_split = false,
                       account_id = coalesce(v_allocation.account_id, account_id),
                       pot_id = v_allocation.pot_id,
                       original_source_type = coalesce(original_source_type, 'account'),
                       original_account_id = coalesce(original_account_id, coalesce(v_allocation.original_account_id, v_old_account_id))
                 where id = v_transaction_id;
            else
                -- Recompute the parent transaction's representative
                -- account_id (largest account-type allocation), mirroring
                -- save_transaction_allocations -- this field is
                -- display/filter convenience only; transaction_allocations
                -- stays authoritative for balance math regardless of what
                -- it's set to.
                select ta.account_id
                  into v_representative_account_id
                  from public.transaction_allocations ta
                 where ta.transaction_id = v_transaction_id
                   and ta.account_id is not null
                 order by ta.amount desc, ta.sort_order asc
                 limit 1;

                update public.transactions
                   set account_id = coalesce(v_representative_account_id, account_id)
                 where id = v_transaction_id;
            end if;
        end if;

        update public.replenishment_run_transactions
           set new_sources = v_new_sources
         where run_id = v_run.id
           and transaction_id = v_transaction_id
           and account_id = v_old_account_id;
    end loop;

    update public.replenishment_runs
       set status = 'confirmed',
           preview_snapshot = p_preview,
           confirmed_at = now()
     where id = v_run.id
     returning * into v_run;

    return v_run;
end;
$$;


--
-- Name: FUNCTION confirm_replenishment_run(p_run_id uuid, p_unit_sources jsonb, p_preview jsonb); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.confirm_replenishment_run(p_run_id uuid, p_unit_sources jsonb, p_preview jsonb) IS 'Atomically confirms a draft replenishment run: validates the submitted per-unit funding assignments against the stored preview, guards against double-replenishing a transaction already covered by another confirmed run, then for each covered unit (a whole non-split transaction, or one transaction_allocations row of a split one) reassigns its real account_id/pot_id directly to the new source(s) -- splitting it via transaction_allocations when more than one source is needed -- snapshotting the pre-replenishment source into original_source_type/original_account_id/original_pot_id (once; never overwritten). No new transfer/replenishment transactions are created. Also collapses a split transaction back to a plain non-split one if reassigning a slice merges it into a sibling allocation and leaves only one funding source. Idempotent -- retrying after a successful commit returns the already-confirmed run unchanged; a failed attempt (any exception, including a deferred constraint at commit) rolls back every mutation it made, so a retry against a still-draft run safely redoes the whole loop from scratch.';


--
-- Name: consume_feedback_rate_limit(uuid, text, integer, interval); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.consume_feedback_rate_limit(p_actor_id uuid, p_action text, p_limit integer, p_window interval) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_count integer;
begin
    if p_actor_id is null or p_limit < 1 or p_window <= interval '0 seconds' then
        raise exception 'Invalid rate-limit arguments' using errcode = '22023';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(p_actor_id::text || ':' || p_action, 0));

    select count(*) into v_count
    from public.feedback_rate_limit_events
    where actor_id = p_actor_id
      and action = p_action
      and created_at >= clock_timestamp() - p_window;

    if v_count >= p_limit then
        raise exception 'Feedback rate limit exceeded'
            using errcode = 'P0001', hint = 'Wait before retrying this action.';
    end if;

    insert into public.feedback_rate_limit_events(actor_id, action)
    values (p_actor_id, p_action);
end;
$$;


--
-- Name: create_default_accounts(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.create_default_accounts(p_household_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
    insert into public.accounts (household_id, name, type, currency, initial_balance, icon, color)
    values
        (p_household_id, 'Cash',         'cash', 'EUR'::public.currency_code, 0, 'wallet',   '#4CAF50'),
        (p_household_id, 'Bank Account', 'bank', 'EUR'::public.currency_code, 0, 'landmark', '#2196F3');
end;
$$;


--
-- Name: create_default_categories(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.create_default_categories(p_household_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
    insert into public.categories (household_id, name, type, icon, color, is_default)
    values
    -- Income
    (p_household_id, 'Salary',         'income',  'wallet',        '#4CAF50', true),
    (p_household_id, 'Wages',          'income',  'wallet',        '#16A34A', true),
    (p_household_id, 'Bonus',          'income',  'gift',          '#8BC34A', true),
    (p_household_id, 'Investments',    'income',  'trending-up',   '#009688', true),
    (p_household_id, 'Other Income',   'income',  'plus-circle',   '#2196F3', true),
    -- Expenses
    (p_household_id, 'Groceries',      'expense', 'shopping-cart', '#FF9800', true),
    (p_household_id, 'Restaurants',    'expense', 'utensils',      '#F44336', true),
    (p_household_id, 'Transport',      'expense', 'car',           '#3F51B5', true),
    (p_household_id, 'Fuel',           'expense', 'fuel',          '#795548', true),
    (p_household_id, 'Rent',           'expense', 'home',          '#9C27B0', true),
    (p_household_id, 'Utilities',      'expense', 'zap',           '#FFC107', true),
    (p_household_id, 'Shopping',       'expense', 'shopping-bag',  '#E91E63', true),
    (p_household_id, 'Healthcare',     'expense', 'heart-pulse',   '#F06292', true),
    (p_household_id, 'Entertainment',  'expense', 'film',          '#673AB7', true),
    (p_household_id, 'Education',      'expense', 'book-open',     '#00BCD4', true),
    (p_household_id, 'Travel',         'expense', 'plane',         '#607D8B', true),
    (p_household_id, 'Savings',        'expense', 'piggy-bank',    '#4CAF50', true),
    (p_household_id, 'Other Expenses', 'expense', 'circle',        '#9E9E9E', true)
    on conflict (household_id, type, name) do nothing;
end;
$$;


--
-- Name: create_household(text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.create_household(p_name text) RETURNS public.households
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_user_id uuid := auth.uid();
    v_household public.households;
begin
    if v_user_id is null then
        raise exception 'Not authenticated';
    end if;

    if p_name is null or btrim(p_name) = '' then
        raise exception 'Household name is required';
    end if;

    insert into public.households (name, owner_id)
    values (btrim(p_name), v_user_id)
    returning * into v_household;

    insert into public.household_members (household_id, user_id, role, status)
    values (v_household.id, v_user_id, 'owner', 'accepted')
    on conflict (household_id, user_id) do update
        set role = excluded.role,
            status = excluded.status;

    update public.profiles
    set default_household_id = v_household.id
    where id = v_user_id;

    return v_household;
end;
$$;


--
-- Name: create_transfer(uuid, uuid, uuid, numeric, text, text, timestamp with time zone, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_transfer_group_id uuid := gen_random_uuid();
begin

    if p_amount <= 0 then
        raise exception 'Transfer amount must be greater than zero';
    end if;

    if p_from_account_id = p_to_account_id then
        raise exception 'Source and destination accounts must be different';
    end if;

    -- Expense leg (money leaving source account)
    insert into public.transactions (
        household_id, account_id, category_id, transfer_group_id,
        title, notes, amount, type, transaction_date, created_by
    )
    values (
        p_household_id, p_from_account_id, null, v_transfer_group_id,
        p_title, p_notes, p_amount, 'expense', p_transaction_date, p_created_by
    );

    -- Income leg (money arriving in destination account)
    insert into public.transactions (
        household_id, account_id, category_id, transfer_group_id,
        title, notes, amount, type, transaction_date, created_by
    )
    values (
        p_household_id, p_to_account_id, null, v_transfer_group_id,
        p_title, p_notes, p_amount, 'income', p_transaction_date, p_created_by
    );

    return v_transfer_group_id;

end;
$$;


--
-- Name: create_transfer(uuid, uuid, uuid, numeric, text, text, timestamp with time zone, uuid, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid, p_category_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
	v_transfer_group_id uuid := gen_random_uuid();
	v_category_type public.category_type;
begin

	if p_amount <= 0 then
		raise exception 'Transfer amount must be greater than zero';
	end if;

	if p_from_account_id = p_to_account_id then
		raise exception 'Source and destination accounts must be different';
	end if;

	if p_category_id is not null then
		select c.type
		  into v_category_type
		  from public.categories c
		 where c.id = p_category_id
		   and c.household_id = p_household_id;

		if v_category_type is null then
			raise exception 'Transfer category is invalid for this household';
		end if;

		if v_category_type <> 'account' then
			raise exception 'Transfer category must be of type account';
		end if;
	end if;

	-- Expense leg (money leaving source account)
	insert into public.transactions (
		household_id, account_id, category_id, transfer_group_id,
		title, notes, amount, type, transaction_date, created_by
	)
	values (
		p_household_id, p_from_account_id, p_category_id, v_transfer_group_id,
		p_title, p_notes, p_amount, 'expense', p_transaction_date, p_created_by
	);

	-- Income leg (money arriving in destination account)
	insert into public.transactions (
		household_id, account_id, category_id, transfer_group_id,
		title, notes, amount, type, transaction_date, created_by
	)
	values (
		p_household_id, p_to_account_id, p_category_id, v_transfer_group_id,
		p_title, p_notes, p_amount, 'income', p_transaction_date, p_created_by
	);

	return v_transfer_group_id;

end;
$$;


--
-- Name: create_transfer(uuid, uuid, uuid, numeric, text, text, timestamp with time zone, uuid, uuid, uuid, uuid, public.monthly_budget_section); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid, p_category_id uuid DEFAULT NULL::uuid, p_monthly_budget_run_id uuid DEFAULT NULL::uuid, p_generated_by_rule_id uuid DEFAULT NULL::uuid, p_budget_section public.monthly_budget_section DEFAULT NULL::public.monthly_budget_section) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_transfer_group_id uuid := gen_random_uuid();
    v_category_type public.category_type;
begin

    if p_amount <= 0 then
        raise exception 'Transfer amount must be greater than zero';
    end if;

    if p_from_account_id = p_to_account_id then
        raise exception 'Source and destination accounts must be different';
    end if;

    if p_category_id is not null then
        select c.type
          into v_category_type
          from public.categories c
         where c.id = p_category_id
           and c.household_id = p_household_id;

        if v_category_type is null then
            raise exception 'Transfer category is invalid for this household';
        end if;

        if v_category_type <> 'account' then
            raise exception 'Transfer category must be of type account';
        end if;
    end if;

    insert into public.transactions (
        household_id, account_id, category_id, transfer_group_id,
        monthly_budget_run_id, generated_by_rule_id, budget_section,
        title, notes, amount, type, transaction_date, created_by
    )
    values (
        p_household_id, p_from_account_id, p_category_id, v_transfer_group_id,
        p_monthly_budget_run_id, p_generated_by_rule_id, p_budget_section,
        p_title, p_notes, p_amount, 'expense', p_transaction_date, p_created_by
    );

    insert into public.transactions (
        household_id, account_id, category_id, transfer_group_id,
        monthly_budget_run_id, generated_by_rule_id, budget_section,
        title, notes, amount, type, transaction_date, created_by
    )
    values (
        p_household_id, p_to_account_id, p_category_id, v_transfer_group_id,
        p_monthly_budget_run_id, p_generated_by_rule_id, p_budget_section,
        p_title, p_notes, p_amount, 'income', p_transaction_date, p_created_by
    );

    return v_transfer_group_id;

end;
$$;


--
-- Name: decline_household_invitation(text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.decline_household_invitation(p_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_user_id uuid := auth.uid();
    v_email text;
    v_deleted integer;
begin
    if v_user_id is null then
        raise exception 'You must be authenticated to decline an invitation.';
    end if;

    select p.email into v_email
    from public.profiles p
    where p.id = v_user_id;

    if v_email is null then
        raise exception 'Profile not found for authenticated user.';
    end if;

    delete from public.household_invitations hi
    where hi.token = p_token
      and hi.accepted_at is null
      and lower(hi.email) = lower(v_email);

    get diagnostics v_deleted = row_count;

    return v_deleted > 0;
end;
$$;


--
-- Name: delete_completed_transfer(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.delete_completed_transfer(p_transfer_group_id uuid) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_household_id uuid;
  v_row_count integer;
begin
  perform 1 from public.transactions t
  where t.transfer_group_id = p_transfer_group_id
  order by t.id
  for update;

  select min(t.household_id::text)::uuid, count(*) into v_household_id, v_row_count
  from public.transactions t
  where t.transfer_group_id = p_transfer_group_id;

  if v_row_count <> 2
    or (select count(*) from public.transactions t where t.transfer_group_id = p_transfer_group_id and t.type = 'expense') <> 1
    or (select count(*) from public.transactions t where t.transfer_group_id = p_transfer_group_id and t.type = 'income') <> 1
  then raise exception 'Transfer group is malformed or unavailable'; end if;
  if not public.is_household_member(v_household_id, (select auth.uid())) then raise exception 'Not authorized for this household'; end if;

  delete from public.transactions t where t.transfer_group_id = p_transfer_group_id;
  get diagnostics v_row_count = row_count;
  return v_row_count;
end;
$$;


--
-- Name: delete_feedback_attachment(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.delete_feedback_attachment(p_attachment_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_actor uuid := auth.uid();
    v_feedback_id uuid;
    v_owner_id uuid;
    v_feedback_status text;
    v_storage_path text;
    v_response jsonb;
    v_key text;
begin
    if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    v_key := md5(v_actor::text || ':delete:' || p_attachment_id::text);

    select response into v_response from public.feedback_rpc_requests
    where actor_id = v_actor and operation = 'delete_attachment_client' and idempotency_key = v_key;
    if found then return v_response ->> 'storage_path'; end if;

    select a.feedback_id, f.user_id, f.status, a.storage_path
    into v_feedback_id, v_owner_id, v_feedback_status, v_storage_path
    from public.feedback_attachments a
    join public.app_feedback f on f.id = a.feedback_id
    where a.id = p_attachment_id
    for update of a;
    if not found or (v_owner_id <> v_actor and not public.is_platform_admin()) then
        raise exception 'Attachment not found' using errcode = 'P0002';
    end if;
    if v_owner_id = v_actor and v_feedback_status in ('resolved', 'closed', 'rejected', 'withdrawn') then
        raise exception 'Attachments are closed for this feedback' using errcode = 'P0001';
    end if;

    delete from public.feedback_attachments where id = p_attachment_id;
    update public.app_feedback set last_activity_at = now() where id = v_feedback_id;
    insert into public.feedback_events(feedback_id, actor_id, event_type, metadata)
    values (
        v_feedback_id, v_actor, 'attachment_deleted',
        jsonb_build_object('attachment_id', p_attachment_id)
    );

    v_response := jsonb_build_object('storage_path', v_storage_path);
    insert into public.feedback_rpc_requests(actor_id, operation, idempotency_key, response)
    values (v_actor, 'delete_attachment_client', v_key, v_response);
    return v_storage_path;
end;
$$;


--
-- Name: delete_feedback_attachment(uuid, text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.delete_feedback_attachment(p_attachment_id uuid, p_idempotency_key text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'storage', 'pg_temp'
    AS $$
declare
    v_actor uuid := auth.uid();
    v_attachment public.feedback_attachments%rowtype;
    v_feedback public.app_feedback%rowtype;
    v_response jsonb;
    v_is_admin boolean;
begin
    if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    perform public.assert_feedback_idempotency_key(p_idempotency_key);
    perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':delete_attachment:' || p_idempotency_key, 0));

    select response into v_response from public.feedback_rpc_requests
    where actor_id = v_actor and operation = 'delete_attachment' and idempotency_key = p_idempotency_key;
    if found then return v_response; end if;

    select * into v_attachment from public.feedback_attachments where id = p_attachment_id for update;
    if not found then raise exception 'Attachment not found' using errcode = 'P0002'; end if;
    select * into v_feedback from public.app_feedback where id = v_attachment.feedback_id;
    v_is_admin := public.is_platform_admin();
    if not v_is_admin and v_feedback.user_id <> v_actor then
        raise exception 'Attachment not found' using errcode = 'P0002';
    end if;
    if not v_is_admin and v_feedback.status in ('resolved', 'closed', 'rejected', 'withdrawn') then
        raise exception 'Attachments are closed for this feedback' using errcode = 'P0001';
    end if;

    -- The client should remove the object through the Storage API first. If it
    -- does not, the maintenance function treats the unregistered file as an orphan.
    delete from public.feedback_attachments where id = p_attachment_id;
    update public.app_feedback set last_activity_at = now() where id = v_attachment.feedback_id;
    insert into public.feedback_events(feedback_id, actor_id, event_type, metadata)
    values (
        v_attachment.feedback_id, v_actor, 'attachment_deleted',
        jsonb_build_object('attachment_id', p_attachment_id)
    );

    v_response := jsonb_build_object('id', p_attachment_id, 'deleted', true);
    insert into public.feedback_rpc_requests(actor_id, operation, idempotency_key, response)
    values (v_actor, 'delete_attachment', p_idempotency_key, v_response);
    return v_response;
end;
$$;


--
-- Name: delete_household(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.delete_household(p_household_id uuid) RETURNS TABLE(success boolean, message text, deleted_hard boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_current_user_id uuid := auth.uid();
    v_owner_id uuid;
    v_deleted_at timestamptz;
    v_transaction_count integer := 0;
begin
    if v_current_user_id is null then
        return query select false, 'You must be authenticated.'::text, false;
        return;
    end if;

    select owner_id, deleted_at
    into v_owner_id, v_deleted_at
    from public.households
    where id = p_household_id;

    if v_owner_id is null then
        return query select false, 'Household not found.'::text, false;
        return;
    end if;

    if v_owner_id != v_current_user_id then
        return query select false, 'Only the household owner can delete the household.'::text, false;
        return;
    end if;

    if v_deleted_at is not null then
        return query select false, 'Household is already deleted.'::text, false;
        return;
    end if;

    select count(*)
    into v_transaction_count
    from public.transactions
    where household_id = p_household_id;

    if v_transaction_count = 0 then
        delete from public.households
        where id = p_household_id;

        return query select true, 'Household deleted permanently.'::text, true;
        return;
    end if;

    update public.households
    set deleted_at = now(),
        updated_at = now()
    where id = p_household_id;

    update public.profiles
    set default_household_id = null
    where default_household_id = p_household_id;

    return query select true, 'Household archived because it already has transactions.'::text, false;
end;
$$;


--
-- Name: delete_monthly_budget_run_transactions(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.delete_monthly_budget_run_transactions(p_run_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_run public.monthly_budget_runs%rowtype;
  v_deleted_count integer;
begin
  select *
    into v_run
    from public.monthly_budget_runs
   where id = p_run_id
   for update;

  if not found then
    raise exception 'Monthly budget run not found';
  end if;

  if not public.is_household_admin(v_run.household_id, auth.uid()) then
    raise exception 'Only household admins can delete monthly budget run transactions';
  end if;

  delete from public.transactions
   where monthly_budget_run_id = v_run.id;

  get diagnostics v_deleted_count = row_count;

  if v_run.status = 'confirmed' then
    update public.monthly_budget_runs
       set status = 'draft',
           updated_at = now()
     where id = v_run.id;
  end if;

  return v_deleted_count;
end;
$$;


--
-- Name: dispatch_app_notification_push(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.dispatch_app_notification_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'vault'
    AS $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'notification_dispatch_url'
  limit 1;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'notification_webhook_secret'
  limit 1;

  if v_url is null or v_secret is null then
    raise warning 'Notification push skipped: Vault dispatch secrets are not configured.';
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(new),
      'old_record', null
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;


--
-- Name: dispatch_feedback_retention_cleanup(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.dispatch_feedback_retention_cleanup() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'vault', 'pg_temp'
    AS $$
declare
    v_url text;
    v_secret text;
begin
    select decrypted_secret into v_url
    from vault.decrypted_secrets
    where name = 'feedback_maintenance_url'
    limit 1;

    select decrypted_secret into v_secret
    from vault.decrypted_secrets
    where name = 'feedback_maintenance_secret'
    limit 1;

    if v_url is null or v_secret is null then
        raise warning 'Feedback retention skipped: Vault maintenance secrets are not configured.';
        return;
    end if;

    perform net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_secret
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 10000
    );
end;
$$;


--
-- Name: drop_reimbursements_when_not_expense(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.drop_reimbursements_when_not_expense() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  delete from public.transaction_reimbursements where transaction_id = new.id;
  return new;
end;
$$;


--
-- Name: enforce_reimbursement_target(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.enforce_reimbursement_target() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_type public.transaction_type;
  v_household_id uuid;
begin
  select type, household_id into v_type, v_household_id
  from public.transactions
  where id = new.transaction_id;

  if not found then
    raise exception 'Reimbursement references a transaction that does not exist.';
  end if;

  if v_type <> 'expense' then
    raise exception 'Reimbursements can only be added to expense transactions.';
  end if;

  if v_household_id <> new.household_id then
    raise exception 'Reimbursement household_id must match its transaction''s household_id.';
  end if;

  return new;
end;
$$;


--
-- Name: enforce_saving_pot_account_integrity(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.enforce_saving_pot_account_integrity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_pot_id uuid;
begin
    for v_pot_id in
        select distinct candidate.pot_id
        from unnest(array[
            case when tg_op in ('UPDATE', 'DELETE') then old.pot_id else null end,
            case when tg_op in ('UPDATE', 'INSERT') then new.pot_id else null end
        ]) as candidate(pot_id)
        where candidate.pot_id is not null
    loop
        -- A cascading saving-pot delete removes the parent first, so there is
        -- no remaining contract to enforce for that pot.
        if exists (select 1 from public.saving_pots sp where sp.id = v_pot_id) then
            if exists (
                select 1
                from public.saving_pot_accounts spa
                join public.saving_pots sp on sp.id = spa.pot_id
                join public.accounts a on a.id = spa.account_id
                where spa.pot_id = v_pot_id
                  and a.household_id <> sp.household_id
            ) then
                raise exception using
                    errcode = '23514',
                    message = 'Every saving pot account must belong to the same household as its saving pot.';
            end if;

            if not exists (
                select 1
                from public.saving_pot_accounts spa
                join public.accounts a on a.id = spa.account_id
                join public.saving_pots sp on sp.id = spa.pot_id
                where spa.pot_id = v_pot_id
                  and a.household_id = sp.household_id
            ) then
                raise exception using
                    errcode = '23514',
                    message = 'A saving pot must retain at least one same-household account.';
            end if;
        end if;
    end loop;

    return null;
end;
$$;


--
-- Name: enforce_transaction_allocations_integrity(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.enforce_transaction_allocations_integrity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_transaction_id uuid;
begin
  for v_transaction_id in
    select distinct candidate.transaction_id
    from unnest(array[
      case when tg_op in ('UPDATE', 'DELETE') then old.transaction_id else null end,
      case when tg_op in ('UPDATE', 'INSERT') then new.transaction_id else null end
    ]) as candidate(transaction_id)
    where candidate.transaction_id is not null
  loop
    perform public.check_transaction_allocations_consistency(v_transaction_id);
  end loop;

  return null;
end;
$$;


--
-- Name: enqueue_pending_notification_pushes(integer); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.enqueue_pending_notification_pushes(p_limit integer DEFAULT 100) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'vault'
    AS $$
declare
  v_url text;
  v_secret text;
  v_notification public.app_notifications%rowtype;
  v_queued integer := 0;
begin
  update public.app_notifications
  set push_dispatch_status = 'pending'
  where push_dispatch_status = 'processing'
    and push_dispatch_attempted_at < now() - interval '5 minutes';

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'notification_dispatch_url'
  limit 1;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'notification_webhook_secret'
  limit 1;

  if v_url is null or v_secret is null then return 0; end if;

  for v_notification in
    select *
    from public.app_notifications
    where push_dispatch_status = 'pending'
    order by created_at
    limit greatest(1, least(p_limit, 500))
  loop
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'app_notifications',
        'schema', 'public',
        'record', to_jsonb(v_notification),
        'old_record', null
      ),
      timeout_milliseconds := 5000
    );
    v_queued := v_queued + 1;
  end loop;

  return v_queued;
end;
$$;


--
-- Name: execute_due_recurring_movements(date); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.execute_due_recurring_movements(p_as_of_date date DEFAULT (timezone('Europe/Lisbon'::text, now()))::date) RETURNS TABLE(completed_count integer, skipped_count integer, failed_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_rule public.recurring_transactions%rowtype;
  v_execution_id uuid;
  v_execution_status public.recurring_execution_status;
  v_destination_account_id uuid;
  v_transfer_group_id uuid;
  v_source_transaction_id uuid;
  v_destination_transaction_id uuid;
  v_source_balance numeric(14,2);
  v_scheduled_at timestamptz;
  v_next_run date;
  v_reached_end boolean;
begin
  completed_count := 0;
  skipped_count := 0;
  failed_count := 0;

  <<due_rules>>
  loop
    select rt.*
    into v_rule
    from public.recurring_transactions rt
    where rt.is_active
      and rt.next_run <= p_as_of_date
    order by rt.next_run, rt.created_at, rt.id
    limit 1
    for update skip locked;

    exit when not found;

    -- Rule's next occurrence falls on/after its end date: retire the rule,
    -- no transaction is generated for a date past its end.
    if v_rule.end_condition = 'date' and v_rule.next_run > v_rule.end_date then
      update public.recurring_transactions
      set is_active = false
      where id = v_rule.id;
      continue;
    end if;

    insert into public.recurring_run_executions (
      recurring_transaction_id,
      scheduled_for,
      status
    )
    values (v_rule.id, v_rule.next_run, 'pending')
    on conflict (recurring_transaction_id, scheduled_for) do nothing
    returning id into v_execution_id;

    if v_execution_id is null then
      select id, status
      into v_execution_id, v_execution_status
      from public.recurring_run_executions
      where recurring_transaction_id = v_rule.id
        and scheduled_for = v_rule.next_run
      for update;

      if v_execution_status in ('completed', 'skipped') then
        continue;
      end if;

      update public.recurring_run_executions
      set status = 'pending', skip_reason = null, error_message = null,
          transaction_ids = '{}', started_at = now(), finished_at = null
      where id = v_execution_id;
    end if;

    v_scheduled_at := v_rule.next_run::timestamp at time zone 'Europe/Lisbon';
    v_next_run := public.next_recurring_occurrence(
      v_rule.next_run,
      v_rule.frequency,
      v_rule.excluded_months
    );

    begin
      select a.initial_balance
      into v_source_balance
      from public.accounts a
      where a.id = v_rule.account_id
        and a.household_id = v_rule.household_id
        and not a.is_archived
      for update;

      if not found then
        update public.recurring_run_executions
        set status = 'skipped', skip_reason = 'source_account_unavailable', finished_at = now()
        where id = v_execution_id;

        update public.recurring_transactions
        set next_run = v_next_run, last_run = v_rule.next_run
        where id = v_rule.id;

        skipped_count := skipped_count + 1;
        continue;
      end if;

      if v_rule.rule_kind = 'transfer' then
        if v_rule.destination_pot_id is not null then
          select a.id
          into v_destination_account_id
          from public.saving_pot_accounts spa
          join public.accounts a on a.id = spa.account_id
          where spa.pot_id = v_rule.destination_pot_id
            and a.household_id = v_rule.household_id
            and not a.is_archived
          order by a.created_at, a.id
          limit 1;
        else
          v_destination_account_id := v_rule.destination_account_id;
        end if;

        if v_destination_account_id is null
          or v_destination_account_id = v_rule.account_id
          or not exists (
            select 1
            from public.accounts a
            where a.id = v_destination_account_id
              and a.household_id = v_rule.household_id
              and not a.is_archived
          ) then
          update public.recurring_run_executions
          set status = 'skipped', skip_reason = 'destination_account_unavailable', finished_at = now()
          where id = v_execution_id;

          update public.recurring_transactions
          set next_run = v_next_run, last_run = v_rule.next_run
          where id = v_rule.id;

          skipped_count := skipped_count + 1;
          continue;
        end if;
      end if;

      if v_rule.rule_kind = 'transfer' or v_rule.type = 'expense' then
        select a.initial_balance + coalesce(sum(
          case when t.type = 'income' then t.amount else -t.amount end
        ), 0)
        into v_source_balance
        from public.accounts a
        left join public.transactions t on t.account_id = a.id
        where a.id = v_rule.account_id
        group by a.id, a.initial_balance;

        if v_source_balance < v_rule.amount then
          update public.recurring_run_executions
          set status = 'skipped', skip_reason = 'insufficient_funds', finished_at = now()
          where id = v_execution_id;

          update public.recurring_transactions
          set next_run = v_next_run, last_run = v_rule.next_run
          where id = v_rule.id;

          skipped_count := skipped_count + 1;
          continue;
        end if;
      end if;

      if v_rule.rule_kind = 'transfer' then
        v_transfer_group_id := gen_random_uuid();

        insert into public.transactions (
          household_id, account_id, category_id, transfer_group_id,
          recurring_execution_id, title, notes, amount, type,
          transaction_date, created_by
        )
        values (
          v_rule.household_id, v_rule.account_id, v_rule.category_id, v_transfer_group_id,
          v_execution_id, v_rule.title, v_rule.notes, v_rule.amount, 'expense',
          v_scheduled_at, v_rule.created_by
        )
        returning id into v_source_transaction_id;

        insert into public.transactions (
          household_id, account_id, category_id, transfer_group_id, pot_id,
          recurring_execution_id, title, notes, amount, type,
          transaction_date, created_by
        )
        values (
          v_rule.household_id, v_destination_account_id, v_rule.category_id,
          v_transfer_group_id, v_rule.destination_pot_id, v_execution_id,
          v_rule.title, v_rule.notes, v_rule.amount, 'income',
          v_scheduled_at, v_rule.created_by
        )
        returning id into v_destination_transaction_id;

        update public.recurring_run_executions
        set status = 'completed', transaction_ids = array[v_source_transaction_id, v_destination_transaction_id],
            finished_at = now()
        where id = v_execution_id;
      else
        insert into public.transactions (
          household_id, account_id, category_id, pot_id, recurring_execution_id,
          title, notes, amount, type, transaction_date, created_by
        )
        values (
          v_rule.household_id, v_rule.account_id, v_rule.category_id, v_rule.pot_id,
          v_execution_id, v_rule.title, v_rule.notes, v_rule.amount, v_rule.type,
          v_scheduled_at, v_rule.created_by
        )
        returning id into v_source_transaction_id;

        update public.recurring_run_executions
        set status = 'completed', transaction_ids = array[v_source_transaction_id], finished_at = now()
        where id = v_execution_id;
      end if;

      v_reached_end := v_rule.end_condition = 'count'
        and (v_rule.occurrences_count + 1) >= v_rule.end_after_occurrences;

      update public.recurring_transactions
      set next_run = v_next_run,
          last_run = v_rule.next_run,
          occurrences_count = occurrences_count + 1,
          is_active = case when v_reached_end then false else is_active end
      where id = v_rule.id;

      completed_count := completed_count + 1;
    exception when others then
      update public.recurring_run_executions
      set status = 'failed', error_message = left(sqlerrm, 1000), finished_at = now()
      where id = v_execution_id;

      -- A malformed rule must not block every later scheduled movement.
      update public.recurring_transactions
      set next_run = v_next_run, last_run = v_rule.next_run
      where id = v_rule.id;

      failed_count := failed_count + 1;
    end;
  end loop;

  return next;
end;
$$;


--
-- Name: FUNCTION execute_due_recurring_movements(p_as_of_date date); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.execute_due_recurring_movements(p_as_of_date date) IS 'Service-role-only recurring scheduler. Called by the protected execute-recurring-movements Edge Function. Honors end_condition: retires a rule instead of generating a movement once its next occurrence is past end_date, and after generating an occurrence that reaches end_after_occurrences.';


--
-- Name: feedback_storage_author_id(text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.feedback_storage_author_id(p_name text) RETURNS uuid
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'storage', 'pg_temp'
    AS $_$
    select case
        when cardinality(storage.foldername(p_name)) = 3
         and (storage.foldername(p_name))[1]
             ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((storage.foldername(p_name))[1])::uuid
        else null
    end;
$_$;


--
-- Name: feedback_storage_feedback_id(text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.feedback_storage_feedback_id(p_name text) RETURNS uuid
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'storage', 'pg_temp'
    AS $_$
    select case
        when cardinality(storage.foldername(p_name)) = 3
         and (storage.foldername(p_name))[2]
             ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((storage.foldername(p_name))[2])::uuid
        else null
    end;
$_$;


--
-- Name: get_household_invitation_details(text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.get_household_invitation_details(p_token text) RETURNS TABLE(household_id uuid, household_name text, owner_name text, owner_email text, role public.household_role, expires_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_invite public.household_invitations%rowtype;
begin
    select *
    into v_invite
    from public.household_invitations hi
    where hi.token = p_token
      and hi.accepted_at is null
      and (hi.expires_at is null or hi.expires_at > now())
    limit 1;

    if not found then
        return;
    end if;

    return query
    select
        h.id as household_id,
        h.name as household_name,
        coalesce(p.full_name, p.email, 'Household owner') as owner_name,
        p.email as owner_email,
        v_invite.role,
        v_invite.expires_at
    from public.households h
    left join public.profiles p
      on p.id = h.owner_id
    where h.id = v_invite.household_id
      and h.deleted_at is null;
end;
$$;


--
-- Name: guard_reimbursement_income_transaction(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.guard_reimbursement_income_transaction() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  if coalesce(current_setting('app.reimbursement_sync', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'Reimbursement income transactions are created automatically.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    -- A cascade from deleting the reimbursement (or its expense) arrives
    -- after the reimbursement row is gone: allow that.
    if exists (select 1 from public.transaction_reimbursements where id = old.reimbursement_id) then
      raise exception 'This income was recorded by a reimbursement. Remove the reimbursement from its expense instead.'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if new.amount is distinct from old.amount
     or new.account_id is distinct from old.account_id
     or new.type is distinct from old.type
     or new.transaction_date is distinct from old.transaction_date
     or new.household_id is distinct from old.household_id
     or new.transfer_group_id is distinct from old.transfer_group_id
     or new.is_split is distinct from old.is_split
     or new.reimbursement_id is distinct from old.reimbursement_id then
    raise exception 'This income was recorded by a reimbursement. Edit the reimbursement from its expense instead.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
    insert into public.profiles (id, email, full_name, avatar_url)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );

    return new;
end;
$$;


--
-- Name: is_household_admin(uuid, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.is_household_admin(p_household_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    select exists (
        select 1
        from public.household_members hm
        join public.households h
            on h.id = hm.household_id
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
          and hm.status = 'accepted'
          and hm.role in ('owner', 'admin')
          and h.deleted_at is null
    );
$$;


--
-- Name: is_household_member(uuid, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.is_household_member(p_household_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    select exists (
        select 1
        from public.household_members hm
        join public.households h
            on h.id = hm.household_id
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
          and hm.status = 'accepted'
          and h.deleted_at is null
    );
$$;


--
-- Name: is_household_owner(uuid, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.is_household_owner(p_household_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    select exists (
        select 1
        from public.household_members hm
        join public.households h
            on h.id = hm.household_id
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
          and hm.status = 'accepted'
          and hm.role = 'owner'
          and h.deleted_at is null
    );
$$;


--
-- Name: is_platform_admin(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.is_platform_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    select exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.is_active
    );
$$;


--
-- Name: leave_household(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.leave_household(p_household_id uuid) RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_current_user_id uuid := auth.uid();
    v_user_is_owner boolean;
    v_remaining_count integer;
    v_default_household uuid;
begin
    -- Validate current user is authenticated
    if v_current_user_id is null then
        return query select false, 'You must be authenticated.'::text;
        return;
    end if;

    -- Verify household exists
    if not exists(select 1 from public.households where id = p_household_id) then
        return query select false, 'Household not found.'::text;
        return;
    end if;

    -- Verify user is a member
    if not exists(
        select 1 from public.household_members
        where household_id = p_household_id and user_id = v_current_user_id
    ) then
        return query select false, 'You are not a member of this household.'::text;
        return;
    end if;

    -- Check if user is the owner
    select role = 'owner'
    into v_user_is_owner
    from public.household_members
    where household_id = p_household_id and user_id = v_current_user_id;

    if v_user_is_owner then
        -- Count other members to see if someone else can take over
        select count(*)
        into v_remaining_count
        from public.household_members
        where household_id = p_household_id and user_id != v_current_user_id and status = 'accepted';

        if v_remaining_count = 0 then
            return query select false, 'You cannot leave as the sole owner. Transfer ownership first.'::text;
            return;
        end if;
    end if;

    -- Clear default_household_id if this is their default
    select default_household_id into v_default_household
    from public.profiles
    where id = v_current_user_id;

    if v_default_household = p_household_id then
        update public.profiles
        set default_household_id = null
        where id = v_current_user_id;
    end if;

    -- Remove the member
    delete from public.household_members
    where household_id = p_household_id and user_id = v_current_user_id;

    return query select true, 'Left household successfully.'::text;
end;
$$;


--
-- Name: list_account_ledger(uuid, uuid, integer, integer); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.list_account_ledger(p_household_id uuid, p_account_id uuid, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0) RETURNS TABLE(movement_id uuid, transaction_id uuid, movement_kind text, title text, is_split boolean, is_transfer boolean, amount numeric, transaction_date timestamp with time zone, created_at timestamp with time zone, running_balance numeric, original_source_type text, original_account_id uuid, original_account_name text, original_pot_id uuid, original_pot_name text)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  with account as (
    select a.id, a.initial_balance
    from public.accounts a
    where a.id = p_account_id
      and a.household_id = p_household_id
  ),
  direct_legs as (
    select
      t.id as movement_id,
      t.id as transaction_id,
      t.type::text as movement_kind,
      t.title,
      false as is_split,
      (t.transfer_group_id is not null) as is_transfer,
      t.amount,
      t.transaction_date,
      t.created_at,
      t.original_source_type,
      t.original_account_id,
      oa.name as original_account_name,
      t.original_pot_id,
      op.name as original_pot_name
    from public.transactions t
    left join public.accounts oa on oa.id = t.original_account_id
    left join public.saving_pots op on op.id = t.original_pot_id
    where t.household_id = p_household_id
      and t.account_id = p_account_id
      and t.is_split = false
  ),
  split_legs as (
    select
      ta.id as movement_id,
      t.id as transaction_id,
      t.type::text as movement_kind,
      t.title,
      true as is_split,
      false as is_transfer,
      ta.amount,
      t.transaction_date,
      t.created_at,
      ta.original_source_type,
      ta.original_account_id,
      oaa.name as original_account_name,
      ta.original_pot_id,
      oap.name as original_pot_name
    from public.transaction_allocations ta
    join public.transactions t on t.id = ta.transaction_id
    left join public.accounts oaa on oaa.id = ta.original_account_id
    left join public.saving_pots oap on oap.id = ta.original_pot_id
    where t.household_id = p_household_id
      and ta.account_id = p_account_id
  ),
  legs as (
    select * from direct_legs
    union all
    select * from split_legs
  ),
  ledger as (
    select
      legs.*,
      account.initial_balance
        + sum(
            case when legs.movement_kind = 'income' then legs.amount else -legs.amount end
          ) over (
            order by legs.transaction_date, legs.created_at, legs.transaction_id, legs.movement_id
            rows between unbounded preceding and current row
          ) as running_balance
    from legs
    cross join account
  )
  select
    movement_id,
    transaction_id,
    movement_kind,
    title,
    is_split,
    is_transfer,
    amount,
    transaction_date,
    created_at,
    running_balance,
    original_source_type,
    original_account_id,
    original_account_name,
    original_pot_id,
    original_pot_name
  from ledger
  order by transaction_date desc, created_at desc, transaction_id desc, movement_id desc
  limit p_limit offset p_offset;
$$;


--
-- Name: FUNCTION list_account_ledger(p_household_id uuid, p_account_id uuid, p_limit integer, p_offset integer); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.list_account_ledger(p_household_id uuid, p_account_id uuid, p_limit integer, p_offset integer) IS 'Paginated, newest-first ledger for ONE account, with a real running balance after every row -- including split transactions, unlike list_transaction_movements/balance_after_transaction which return null for those. A transfer appears as two independent rows (one per account) rather than a merged movement, since each leg already carries the right sign and balance for its own account. original_source_type/original_account_id/original_account_name/original_pot_id/original_pot_name are set on a row a replenishment has reassigned (see confirm_replenishment_run) -- the account/pot this row''s money originally came from, before that; all null on a row that has never been replenished.';


--
-- Name: list_feedback_retention_objects(integer, integer, integer); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.list_feedback_retention_objects(p_withdrawn_days integer DEFAULT 30, p_closed_days integer DEFAULT 365, p_limit integer DEFAULT 500) RETURNS TABLE(storage_path text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'storage', 'pg_temp'
    AS $$
begin
    if p_withdrawn_days < 1 or p_closed_days < 30 or p_limit not between 1 and 1000 then
        raise exception 'Invalid feedback retention arguments' using errcode = '22023';
    end if;

    return query
    select candidates.name
    from (
        select o.name, o.created_at
        from storage.objects o
        join public.feedback_attachments a on a.storage_path = o.name
        join public.app_feedback f on f.id = a.feedback_id
        where o.bucket_id = 'feedback-screenshots'
          and (
              (f.withdrawn_at is not null and f.updated_at < now() - make_interval(days => p_withdrawn_days))
              or (f.status in ('resolved', 'closed', 'rejected') and f.updated_at < now() - make_interval(days => p_closed_days))
          )

        union all

        select o.name, o.created_at
        from storage.objects o
        where o.bucket_id = 'feedback-screenshots'
          and o.created_at < now() - interval '1 day'
          and not exists (
              select 1 from public.feedback_attachments a where a.storage_path = o.name
          )
    ) candidates
    order by candidates.created_at
    limit p_limit;
end;
$$;


--
-- Name: list_my_household_invitations(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.list_my_household_invitations() RETURNS TABLE(id uuid, household_id uuid, household_name text, email text, role public.household_role, token text, expires_at timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_user_id uuid := auth.uid();
    v_email text;
begin
    if v_user_id is null then
        raise exception 'You must be authenticated to list invitations.';
    end if;

    select p.email into v_email
    from public.profiles p
    where p.id = v_user_id;

    if v_email is null then
        raise exception 'Profile not found for authenticated user.';
    end if;

    return query
    select
        hi.id,
        hi.household_id,
        h.name as household_name,
        hi.email,
        hi.role,
        hi.token,
        hi.expires_at,
        hi.created_at
    from public.household_invitations hi
    join public.households h on h.id = hi.household_id
    where lower(hi.email) = lower(v_email)
      and hi.accepted_at is null
      and (hi.expires_at is null or hi.expires_at > now())
    order by hi.created_at desc;
end;
$$;


--
-- Name: list_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, text, integer, integer, boolean, text, numeric, numeric, uuid[]); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.list_transaction_movements(p_household_id uuid, p_kind text DEFAULT NULL::text, p_account_id uuid DEFAULT NULL::uuid, p_source_account_id uuid DEFAULT NULL::uuid, p_destination_account_id uuid DEFAULT NULL::uuid, p_category_id uuid DEFAULT NULL::uuid, p_uncategorized boolean DEFAULT false, p_created_by uuid DEFAULT NULL::uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_sort text DEFAULT 'newest'::text, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0, p_exclude_transfers boolean DEFAULT false, p_search text DEFAULT NULL::text, p_min_amount numeric DEFAULT NULL::numeric, p_max_amount numeric DEFAULT NULL::numeric, p_account_ids uuid[] DEFAULT NULL::uuid[]) RETURNS TABLE(movement_id uuid, movement_kind text, household_id uuid, transaction_id uuid, transfer_group_id uuid, source_transaction_id uuid, destination_transaction_id uuid, account_id uuid, source_account_id uuid, destination_account_id uuid, category_id uuid, created_by uuid, title text, notes text, merchant_name text, amount numeric, balance_after_transaction numeric, destination_balance_after_transaction numeric, is_split boolean, transaction_date timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, monthly_budget_run_id uuid, generated_by_rule_id uuid, recurring_execution_id uuid, budget_section public.monthly_budget_section, account jsonb, source_account jsonb, destination_account jsonb, category jsonb, created_by_profile jsonb, allocations jsonb, original_source_type text, original_account_id uuid, original_pot_id uuid, original_account jsonb, original_pot jsonb)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  with transfer_integrity as (
    select t.transfer_group_id
    from public.transactions t
    where t.household_id = p_household_id
      and t.transfer_group_id is not null
    group by t.transfer_group_id
    having count(*) = 2
      and count(*) filter (where t.type = 'expense') = 1
      and count(*) filter (where t.type = 'income') = 1
  ),
  regular as (
    select
      t.id as movement_id,
      t.type::text as movement_kind,
      t.household_id,
      t.id as transaction_id,
      t.transfer_group_id,
      null::uuid as source_transaction_id,
      null::uuid as destination_transaction_id,
      t.account_id,
      null::uuid as source_account_id,
      null::uuid as destination_account_id,
      t.category_id,
      t.created_by,
      t.title,
      t.notes,
      t.merchant_name,
      t.amount,
      public.balance_after_transaction(t) as balance_after_transaction,
      null::numeric as destination_balance_after_transaction,
      t.is_split,
      t.transaction_date,
      t.created_at,
      t.updated_at,
      t.monthly_budget_run_id,
      t.generated_by_rule_id,
      t.recurring_execution_id,
      t.budget_section,
      jsonb_build_object('id', a.id, 'name', a.name, 'owner_profile_id', a.owner_profile_id) as account,
      null::jsonb as source_account,
      null::jsonb as destination_account,
      case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name, 'icon', c.icon) end as category,
      case when p.id is null then null else jsonb_build_object('id', p.id, 'full_name', p.full_name) end as created_by_profile,
      case
        when not t.is_split then null
        else (
          select jsonb_agg(
            jsonb_build_object(
              'id', ta.id,
              'source_type', ta.source_type,
              'account_id', ta.account_id,
              'account_name', aa.name,
              'account_owner_profile_id', aa.owner_profile_id,
              'pot_id', ta.pot_id,
              'pot_name', sp.name,
              'amount', ta.amount,
              'running_balance', case
                when ta.source_type = 'account'
                then public.account_running_balance(ta.account_id, t.transaction_date, t.created_at, t.id, ta.id)
                else null
              end,
              'original_source_type', ta.original_source_type,
              'original_account_id', ta.original_account_id,
              'original_account_name', oaa.name,
              'original_pot_id', ta.original_pot_id,
              'original_pot_name', osp.name
            )
            order by ta.sort_order
          )
          from public.transaction_allocations ta
          left join public.accounts aa on aa.id = ta.account_id
          left join public.saving_pots sp on sp.id = ta.pot_id
          left join public.accounts oaa on oaa.id = ta.original_account_id
          left join public.saving_pots osp on osp.id = ta.original_pot_id
          where ta.transaction_id = t.id
        )
      end as allocations,
      t.original_source_type,
      t.original_account_id,
      t.original_pot_id,
      case when oa.id is null then null else jsonb_build_object('id', oa.id, 'name', oa.name, 'owner_profile_id', oa.owner_profile_id) end as original_account,
      case when op.id is null then null else jsonb_build_object('id', op.id, 'name', op.name) end as original_pot
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    left join public.categories c on c.id = t.category_id
    left join public.profiles p on p.id = t.created_by
    left join public.accounts oa on oa.id = t.original_account_id
    left join public.saving_pots op on op.id = t.original_pot_id
    where t.household_id = p_household_id
      and t.transfer_group_id is null
  ),
  transfers as (
    select
      outgoing.transfer_group_id as movement_id,
      'transfer'::text as movement_kind,
      outgoing.household_id,
      null::uuid as transaction_id,
      outgoing.transfer_group_id,
      outgoing.id as source_transaction_id,
      incoming.id as destination_transaction_id,
      null::uuid as account_id,
      outgoing.account_id as source_account_id,
      incoming.account_id as destination_account_id,
      outgoing.category_id,
      outgoing.created_by,
      outgoing.title,
      outgoing.notes,
      outgoing.merchant_name,
      outgoing.amount,
      public.balance_after_transaction(outgoing) as balance_after_transaction,
      public.balance_after_transaction(incoming) as destination_balance_after_transaction,
      false as is_split,
      outgoing.transaction_date,
      greatest(outgoing.created_at, incoming.created_at) as created_at,
      greatest(outgoing.updated_at, incoming.updated_at) as updated_at,
      outgoing.monthly_budget_run_id,
      outgoing.generated_by_rule_id,
      outgoing.recurring_execution_id,
      outgoing.budget_section,
      null::jsonb as account,
      jsonb_build_object('id', source.id, 'name', source.name, 'owner_profile_id', source.owner_profile_id) as source_account,
      jsonb_build_object('id', destination.id, 'name', destination.name, 'owner_profile_id', destination.owner_profile_id) as destination_account,
      case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name, 'icon', c.icon) end as category,
      case when p.id is null then null else jsonb_build_object('id', p.id, 'full_name', p.full_name) end as created_by_profile,
      null::jsonb as allocations,
      null::text as original_source_type,
      null::uuid as original_account_id,
      null::uuid as original_pot_id,
      null::jsonb as original_account,
      null::jsonb as original_pot
    from transfer_integrity valid
    join public.transactions outgoing
      on outgoing.transfer_group_id = valid.transfer_group_id and outgoing.household_id = p_household_id and outgoing.type = 'expense'
    join public.transactions incoming
      on incoming.transfer_group_id = valid.transfer_group_id and incoming.household_id = p_household_id and incoming.type = 'income'
    join public.accounts source on source.id = outgoing.account_id
    join public.accounts destination on destination.id = incoming.account_id
    left join public.categories c on c.id = outgoing.category_id
    left join public.profiles p on p.id = outgoing.created_by
  ),
  movements as (
    select * from regular
    union all
    select * from transfers
  )
  select m.*
  from movements m
  where (p_kind is null or m.movement_kind = p_kind)
    and (not p_exclude_transfers or m.movement_kind <> 'transfer')
    and (
      p_account_id is null
      or m.account_id = p_account_id
      or m.source_account_id = p_account_id
      or m.destination_account_id = p_account_id
      or exists (
        select 1
        from public.transaction_allocations ta
        where ta.transaction_id = m.transaction_id
          and ta.account_id = p_account_id
      )
    )
    and (
      p_account_ids is null
      or m.account_id = any(p_account_ids)
      or m.source_account_id = any(p_account_ids)
      or m.destination_account_id = any(p_account_ids)
      or exists (
        select 1
        from public.transaction_allocations ta
        where ta.transaction_id = m.transaction_id
          and ta.account_id = any(p_account_ids)
      )
    )
    and (p_source_account_id is null or m.source_account_id = p_source_account_id)
    and (p_destination_account_id is null or m.destination_account_id = p_destination_account_id)
    and (not p_uncategorized or (m.movement_kind <> 'transfer' and m.category_id is null))
    and (
      p_uncategorized
      or p_category_id is null
      or m.category_id = p_category_id
      or m.category_id in (
        select c.id
        from public.categories c
        where c.parent_id = p_category_id
          and c.household_id = p_household_id
      )
    )
    and (p_created_by is null or m.created_by = p_created_by)
    and (p_from is null or m.transaction_date::date >= p_from)
    and (p_to is null or m.transaction_date::date <= p_to)
    and (
      p_search is null
      or btrim(p_search) = ''
      or m.title ilike '%' || p_search || '%'
      or m.notes ilike '%' || p_search || '%'
      or m.merchant_name ilike '%' || p_search || '%'
    )
    and (p_min_amount is null or m.amount >= p_min_amount)
    and (p_max_amount is null or m.amount <= p_max_amount)
  order by
    case when p_sort = 'amount_asc' then m.amount end asc,
    case when p_sort = 'amount_desc' then m.amount end desc,
    case when p_sort = 'title_asc' then lower(m.title) end asc,
    case when p_sort = 'title_desc' then lower(m.title) end desc,
    case when p_sort = 'oldest' then m.transaction_date end asc,
    case when p_sort in ('amount_asc', 'amount_desc') then m.transaction_date end desc,
    case when p_sort not in ('oldest', 'amount_asc', 'amount_desc', 'title_asc', 'title_desc') then m.transaction_date end desc,
    m.created_at desc,
    m.movement_id desc
  limit greatest(1, least(coalesce(p_limit, 25), 500))
  offset greatest(0, coalesce(p_offset, 0));
$$;


--
-- Name: FUNCTION list_transaction_movements(p_household_id uuid, p_kind text, p_account_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_category_id uuid, p_uncategorized boolean, p_created_by uuid, p_from date, p_to date, p_sort text, p_limit integer, p_offset integer, p_exclude_transfers boolean, p_search text, p_min_amount numeric, p_max_amount numeric, p_account_ids uuid[]); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.list_transaction_movements(p_household_id uuid, p_kind text, p_account_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_category_id uuid, p_uncategorized boolean, p_created_by uuid, p_from date, p_to date, p_sort text, p_limit integer, p_offset integer, p_exclude_transfers boolean, p_search text, p_min_amount numeric, p_max_amount numeric, p_account_ids uuid[]) IS 'Lists paginated transaction and completed-transfer movements, including the account balance after the transaction or transfer source transaction (now split-aware -- see account_running_balance()), the transfer destination account''s balance after the transfer arrived (destination_balance_after_transaction, null for non-transfer rows), whether the row is a split transaction (is_split; always false for transfers, which cannot be split), the full funding-source breakdown for split transactions (allocations: array of {id, source_type, account_id, account_name, account_owner_profile_id, pot_id, pot_name, amount, running_balance, original_source_type, original_account_id, original_account_name, original_pot_id, original_pot_name}, ordered by sort_order; null for non-split rows and all transfers), and, for a non-split row that a replenishment has ever reassigned, the source it was originally recorded against (original_source_type/original_account_id/original_pot_id plus joined original_account/original_pot {id, name} objects -- all null on a row that has never been replenished, and always null on transfer rows, which replenishment never touches). Supports sorting by date, amount, or title. Filtering by a parent category also includes its subcategories. p_exclude_transfers drops transfer rows server-side. p_search matches title/notes/merchant_name case-insensitively. p_min_amount/p_max_amount bound the amount column inclusively. p_account_ids matches a movement touching ANY of the given accounts (account_id, source_account_id, or destination_account_id) -- used by the replenishment wizard to show transactions across multiple "accounts to replenish" at once.';


--
-- Name: list_transaction_tag_transactions(uuid, uuid, date, date); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.list_transaction_tag_transactions(p_household_id uuid, p_tag_id uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date) RETURNS TABLE(transaction_id uuid, transaction_date timestamp with time zone, title text, notes text, amount numeric, reimbursed_total numeric, net_amount numeric, is_split boolean, category_id uuid, category_name text, category_icon text, account_id uuid, account_name text, created_by uuid, created_by_name text)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select
    t.id as transaction_id,
    t.transaction_date,
    t.title,
    t.notes,
    t.amount,
    coalesce(re.reimbursed_total, 0)::numeric as reimbursed_total,
    (t.amount - coalesce(re.reimbursed_total, 0))::numeric as net_amount,
    t.is_split,
    t.category_id,
    c.name as category_name,
    c.icon as category_icon,
    t.account_id,
    ac.name as account_name,
    t.created_by,
    p.full_name as created_by_name
  from public.transaction_tag_assignments a
  join public.transactions t
    on t.id = a.transaction_id
   and t.household_id = a.household_id
  left join public.categories c on c.id = t.category_id
  left join public.accounts ac on ac.id = t.account_id
  left join public.profiles p on p.id = t.created_by
  left join (
    select r.transaction_id, sum(r.amount) as reimbursed_total
    from public.transaction_reimbursements r
    where r.household_id = p_household_id
    group by r.transaction_id
  ) re on re.transaction_id = t.id
  where a.household_id = p_household_id
    and a.tag_id = p_tag_id
    and t.type = 'expense'
    and t.transfer_group_id is null
    and (p_from is null or t.transaction_date::date >= p_from)
    and (p_to is null or t.transaction_date::date <= p_to)
  order by t.transaction_date desc, t.created_at desc;
$$;


--
-- Name: match_planned_item_occurrence(uuid, uuid, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.match_planned_item_occurrence(p_occurrence_id uuid, p_transaction_id uuid, p_matched_by uuid) RETURNS public.planned_item_occurrences
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
    v_transaction public.transactions%rowtype;
    v_expected_type public.transaction_type;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can match a planned item occurrence';
    end if;

    select * into v_transaction
      from public.transactions
     where id = p_transaction_id
     for update;

    if not found then
        raise exception 'Transaction % not found', p_transaction_id;
    end if;

    if v_transaction.household_id <> v_occurrence.household_id then
        raise exception 'Transaction % does not belong to the same household as occurrence %', p_transaction_id, p_occurrence_id;
    end if;

    -- source_account_id is null iff the occurrence is inflow (see
    -- planned_items_source_account_by_direction); an inflow occurrence
    -- must match an income transaction, an outflow one an expense.
    v_expected_type := case when v_occurrence.source_account_id is null then 'income' else 'expense' end;
    if v_transaction.type <> v_expected_type then
        raise exception 'Transaction % is type %, but occurrence % needs a % transaction',
            p_transaction_id, v_transaction.type, p_occurrence_id, v_expected_type;
    end if;

    insert into public.planned_item_matches (occurrence_id, transaction_id, matched_by)
    values (p_occurrence_id, p_transaction_id, p_matched_by);

    update public.planned_item_occurrences
       set status = 'matched'
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
exception
    when unique_violation then
        if exists (select 1 from public.planned_item_matches where occurrence_id = p_occurrence_id) then
            raise exception 'Occurrence % is already matched to a transaction', p_occurrence_id;
        else
            raise exception 'Transaction % is already matched to another occurrence', p_transaction_id;
        end if;
end;
$$;


--
-- Name: materialize_planned_item_occurrences(uuid, date, jsonb); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.materialize_planned_item_occurrences(p_household_id uuid, p_month date, p_resolved jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_entry jsonb;
    v_occ jsonb;
    v_dest jsonb;
    v_occurrence_id uuid;
    v_planned_item_id uuid;
    v_count integer := 0;
begin
    if not public.is_household_admin(p_household_id, auth.uid()) then
        raise exception 'Only household admins can materialize planned item occurrences';
    end if;

    p_resolved := coalesce(p_resolved, '[]'::jsonb);
    if jsonb_typeof(p_resolved) <> 'array' then
        raise exception 'Resolved occurrences must be a JSON array';
    end if;

    for v_entry in select value from jsonb_array_elements(p_resolved)
    loop
        v_occ := v_entry -> 'occurrence';
        if v_occ is null then
            raise exception 'Resolved occurrence entry is missing "occurrence"';
        end if;

        v_planned_item_id := nullif(v_occ ->> 'plannedItemId', '')::uuid;
        if v_planned_item_id is null then
            raise exception 'Resolved occurrence entry is missing a valid plannedItemId';
        end if;

        if not exists (
            select 1 from public.planned_items pi
             where pi.id = v_planned_item_id
               and pi.household_id = p_household_id
        ) then
            raise exception 'Planned item % does not belong to household %', v_planned_item_id, p_household_id;
        end if;

        insert into public.planned_item_occurrences (
            planned_item_id, household_id, month, status, expected_amount,
            source_account_id, category_id, is_estimate, source_definition_version,
            is_overridden
        ) values (
            v_planned_item_id,
            p_household_id,
            p_month,
            'planned',
            (v_occ ->> 'expectedAmount')::numeric,
            nullif(v_occ ->> 'sourceAccountId', '')::uuid,
            (v_occ ->> 'categoryId')::uuid,
            coalesce((v_occ ->> 'isEstimate')::boolean, false),
            coalesce((v_occ ->> 'sourceDefinitionVersion')::integer, 1),
            false
        )
        on conflict (planned_item_id, month) do update
            set expected_amount = excluded.expected_amount,
                source_account_id = excluded.source_account_id,
                category_id = excluded.category_id,
                is_estimate = excluded.is_estimate,
                source_definition_version = excluded.source_definition_version
            where planned_item_occurrences.status = 'planned'
              and not planned_item_occurrences.is_overridden
        returning id into v_occurrence_id;

        if v_occurrence_id is null then
            -- The occurrence exists but is no longer 'planned' (or has
            -- since been hand-overridden) -- the TS resolver should never
            -- send such an entry, but if a concurrent confirm/override
            -- raced it, leave the existing row untouched rather than
            -- failing the whole batch.
            continue;
        end if;

        delete from public.planned_item_occurrence_destinations
         where occurrence_id = v_occurrence_id;

        for v_dest in select value from jsonb_array_elements(coalesce(v_entry -> 'destinations', '[]'::jsonb))
        loop
            insert into public.planned_item_occurrence_destinations (
                occurrence_id, planned_item_destination_id, destination_account_id,
                amount, category_id
            ) values (
                v_occurrence_id,
                nullif(v_dest ->> 'plannedItemDestinationId', '')::uuid,
                (v_dest ->> 'destinationAccountId')::uuid,
                (v_dest ->> 'amount')::numeric,
                nullif(v_dest ->> 'categoryId', '')::uuid
            );
        end loop;

        v_count := v_count + 1;
    end loop;

    return v_count;
end;
$$;


--
-- Name: maybe_close_monthly_budget_period(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.maybe_close_monthly_budget_period() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    update public.monthly_budget_periods p
        set status = 'closed'
        where p.household_id = new.household_id
            and p.month = new.month
            and p.status = 'committed'
            and not exists (
                select 1
                from public.planned_item_occurrences o
                where o.household_id = new.household_id
                    and o.month = new.month
                    and o.status = 'planned'
            );

    return new;
end;
$$;


--
-- Name: FUNCTION maybe_close_monthly_budget_period(); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.maybe_close_monthly_budget_period() IS 'AFTER UPDATE trigger on planned_item_occurrences (only when status changes away from planned): closes the household+month''s monthly_budget_periods row once it is committed and no occurrence in that month is still planned. Purely derived -- application code never sets status = closed directly.';


--
-- Name: next_recurring_occurrence(date, public.recurring_frequency, smallint[]); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.next_recurring_occurrence(p_date date, p_frequency public.recurring_frequency, p_excluded_months smallint[] DEFAULT '{}'::smallint[]) RETURNS date
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_next date;
begin
  case p_frequency
    when 'daily' then return p_date + 1;
    when 'weekly' then return p_date + 7;
    when 'yearly' then return (p_date + interval '1 year')::date;
    when 'monthly' then return (p_date + interval '1 month')::date;
    when 'custom' then
      v_next := (p_date + interval '1 month')::date;

      while extract(month from v_next)::smallint = any(coalesce(p_excluded_months, '{}')) loop
        v_next := (v_next + interval '1 month')::date;
      end loop;

      return v_next;
    else
      raise exception 'Unsupported recurring frequency: %', p_frequency;
  end case;
end;
$$;


--
-- Name: notify_feedback_recipient(uuid, text, text, text, jsonb, text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.notify_feedback_recipient(p_recipient_id uuid, p_type text, p_title text, p_body text, p_data jsonb, p_source_key text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
    insert into public.app_notifications (
        recipient_id, type, title, body, data, source_key
    )
    values (
        p_recipient_id, p_type, p_title, p_body,
        coalesce(p_data, '{}'::jsonb), p_source_key
    )
    on conflict (source_key) do nothing;

    perform public.queue_feedback_email(
        p_recipient_id,
        p_type,
        jsonb_build_object('title', p_title, 'body', p_body, 'data', coalesce(p_data, '{}'::jsonb)),
        'email:' || p_source_key
    );
end;
$$;


--
-- Name: purge_feedback_retention(integer, integer, integer); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.purge_feedback_retention(p_withdrawn_days integer DEFAULT 30, p_closed_days integer DEFAULT 365, p_delivery_days integer DEFAULT 90) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'storage', 'pg_temp'
    AS $$
declare
    v_feedback integer := 0;
    v_outbox integer := 0;
    v_rpc integer := 0;
    v_limits integer := 0;
begin
    if p_withdrawn_days < 1 or p_closed_days < 30 or p_delivery_days < 7 then
        raise exception 'Retention periods are below the allowed minimum' using errcode = '22023';
    end if;

    delete from public.app_feedback f
    where (
          (f.withdrawn_at is not null and f.updated_at < now() - make_interval(days => p_withdrawn_days))
          or (f.status in ('resolved', 'closed', 'rejected') and f.updated_at < now() - make_interval(days => p_closed_days))
      )
      and not exists (
          select 1
          from public.feedback_attachments a
          join storage.objects o
            on o.bucket_id = 'feedback-screenshots' and o.name = a.storage_path
          where a.feedback_id = f.id
      );
    get diagnostics v_feedback = row_count;

    delete from public.feedback_email_outbox
    where status in ('sent', 'dead')
      and updated_at < now() - make_interval(days => p_delivery_days);
    get diagnostics v_outbox = row_count;

    delete from public.feedback_rpc_requests
    where created_at < now() - interval '30 days';
    get diagnostics v_rpc = row_count;

    delete from public.feedback_rate_limit_events
    where created_at < now() - interval '2 days';
    get diagnostics v_limits = row_count;

    return jsonb_build_object(
        'feedback_deleted', v_feedback,
        'outbox_deleted', v_outbox,
        'idempotency_deleted', v_rpc,
        'rate_limit_events_deleted', v_limits
    );
end;
$$;


--
-- Name: purge_read_notifications_older_than(integer); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.purge_read_notifications_older_than(p_days integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_cutoff timestamptz := now() - make_interval(days => p_days);
  v_deleted integer;
begin
  delete from public.app_notifications
  where read_at is not null
    and read_at < v_cutoff;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;


--
-- Name: purge_soft_deleted_budget_rules(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.purge_soft_deleted_budget_rules() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_deleted_count integer;
begin
  delete from public.budget_rules
   where deleted_at < now() - interval '30 days';

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;


--
-- Name: queue_feedback_email(uuid, text, jsonb, text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.queue_feedback_email(p_recipient_id uuid, p_template text, p_payload jsonb, p_source_key text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
    insert into public.feedback_email_outbox (
        recipient_id, recipient_email, template, payload, source_key
    )
    select p.id, p.email, p_template, coalesce(p_payload, '{}'::jsonb), p_source_key
    from public.profiles p
    where p.id = p_recipient_id
    on conflict (source_key) do nothing;
end;
$$;


--
-- Name: reassign_transactions_before_category_delete(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.reassign_transactions_before_category_delete() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
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
         (old.type = 'income' and lower(c.name) = 'other income')
         or
         (old.type = 'expense' and lower(c.name) in ('other expenses', 'other expense'))
       )
     order by c.is_default desc, c.sort_order asc, c.created_at asc
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


--
-- Name: record_feedback_email_attempt(uuid, integer, text, boolean, text, text, text, jsonb, interval); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.record_feedback_email_attempt(p_outbox_id uuid, p_attempt_number integer, p_worker_id text, p_succeeded boolean, p_provider_message_id text DEFAULT NULL::text, p_error_code text DEFAULT NULL::text, p_error_message text DEFAULT NULL::text, p_provider_response jsonb DEFAULT '{}'::jsonb, p_retry_after interval DEFAULT '00:05:00'::interval) RETURNS public.feedback_email_outbox
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_outbox public.feedback_email_outbox%rowtype;
begin
    select * into v_outbox
    from public.feedback_email_outbox
    where id = p_outbox_id for update;

    if not found then raise exception 'Email outbox item not found' using errcode = 'P0002'; end if;
    if exists (
        select 1
        from public.feedback_email_attempts a
        where a.outbox_id = p_outbox_id
          and a.attempt_number = p_attempt_number
          and a.succeeded = p_succeeded
    ) then
        return v_outbox;
    end if;
    if v_outbox.status <> 'processing' then
        raise exception 'Email outbox item is not processing' using errcode = 'P0001';
    end if;
    if v_outbox.attempt_count <> p_attempt_number
       or v_outbox.locked_by is distinct from left(coalesce(nullif(p_worker_id, ''), 'unnamed-worker'), 160) then
        raise exception 'Email claim is stale or belongs to another worker' using errcode = 'P0001';
    end if;
    if p_provider_response is null or jsonb_typeof(p_provider_response) <> 'object'
       or octet_length(p_provider_response::text) > 32768 then
        raise exception 'Provider response must be a JSON object no larger than 32 KiB' using errcode = '22023';
    end if;

    insert into public.feedback_email_attempts(
        outbox_id, attempt_number, succeeded, provider_message_id,
        error_code, error_message, provider_response
    ) values (
        p_outbox_id, v_outbox.attempt_count, p_succeeded, p_provider_message_id,
        p_error_code, left(p_error_message, 4000), p_provider_response
    );

    update public.feedback_email_outbox
    set status = case
            when p_succeeded then 'sent'
            when attempt_count >= 5 then 'dead'
            else 'retry'
        end,
        available_at = case
            when p_succeeded or attempt_count >= 5 then available_at
            else now() + greatest(coalesce(p_retry_after, interval '5 minutes'), interval '1 minute')
        end,
        sent_at = case when p_succeeded then now() else null end,
        locked_at = null,
        locked_by = null,
        last_error = case when p_succeeded then null else left(coalesce(p_error_message, p_error_code), 4000) end
    where id = p_outbox_id
    returning * into v_outbox;

    return v_outbox;
end;
$$;


--
-- Name: register_feedback_attachment(uuid, text, text, text, bigint, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.register_feedback_attachment(p_feedback_id uuid, p_storage_path text, p_file_name text, p_mime_type text, p_file_size bigint, p_message_id uuid DEFAULT NULL::uuid) RETURNS public.feedback_attachments
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_result jsonb;
begin
    v_result := public.register_feedback_attachment(
        p_feedback_id,
        md5(coalesce(auth.uid()::text, '') || ':' || p_storage_path),
        p_storage_path,
        p_file_name,
        p_mime_type,
        p_file_size,
        null,
        null,
        p_message_id
    );
    return jsonb_populate_record(null::public.feedback_attachments, v_result);
end;
$$;


--
-- Name: register_feedback_attachment(uuid, text, text, text, text, bigint, integer, integer, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.register_feedback_attachment(p_feedback_id uuid, p_idempotency_key text, p_storage_path text, p_original_filename text, p_mime_type text, p_size_bytes bigint, p_width integer DEFAULT NULL::integer, p_height integer DEFAULT NULL::integer, p_message_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'storage', 'pg_temp'
    AS $$
declare
    v_actor uuid := auth.uid();
    v_feedback public.app_feedback%rowtype;
    v_attachment public.feedback_attachments%rowtype;
    v_response jsonb;
    v_object_metadata jsonb;
begin
    if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    perform public.assert_feedback_idempotency_key(p_idempotency_key);
    perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':attachment:' || p_idempotency_key, 0));

    select response into v_response from public.feedback_rpc_requests
    where actor_id = v_actor and operation = 'attachment' and idempotency_key = p_idempotency_key;
    if found then return v_response; end if;

    select * into v_feedback from public.app_feedback
    where id = p_feedback_id and user_id = v_actor for update;
    if not found then raise exception 'Feedback not found' using errcode = 'P0002'; end if;
    if v_feedback.status in ('resolved', 'closed', 'rejected', 'withdrawn') then
        raise exception 'Attachments are closed for this feedback' using errcode = 'P0001';
    end if;
    if public.feedback_storage_author_id(p_storage_path) <> v_actor
       or public.feedback_storage_feedback_id(p_storage_path) <> p_feedback_id then
        raise exception 'Invalid feedback screenshot path' using errcode = '22023';
    end if;
    select metadata into v_object_metadata
    from storage.objects
    where bucket_id = 'feedback-screenshots' and name = p_storage_path;
    if not found then
        raise exception 'Uploaded screenshot was not found' using errcode = 'P0002';
    end if;
    if (v_object_metadata ? 'size' and (v_object_metadata ->> 'size')::bigint <> p_size_bytes)
       or (v_object_metadata ? 'mimetype' and v_object_metadata ->> 'mimetype' <> p_mime_type) then
        raise exception 'Screenshot metadata does not match the uploaded object' using errcode = '22023';
    end if;
    if (select count(*) from public.feedback_attachments where feedback_id = p_feedback_id) >= 10 then
        raise exception 'A feedback item can have at most 10 screenshots' using errcode = 'P0001';
    end if;
    if p_message_id is not null and not exists (
        select 1 from public.feedback_messages
        where id = p_message_id and feedback_id = p_feedback_id
    ) then
        raise exception 'Feedback message not found' using errcode = '22023';
    end if;

    perform public.consume_feedback_rate_limit(v_actor, 'attachment', 20, interval '1 hour');

    insert into public.feedback_attachments(
        feedback_id, message_id, uploaded_by, storage_path, file_name,
        mime_type, file_size, width, height
    ) values (
        p_feedback_id, p_message_id, v_actor, p_storage_path, btrim(p_original_filename),
        p_mime_type, p_size_bytes, p_width, p_height
    ) returning * into v_attachment;

    update public.app_feedback set last_activity_at = now() where id = p_feedback_id;

    insert into public.feedback_events(feedback_id, actor_id, event_type, metadata)
    values (
        p_feedback_id, v_actor, 'attachment_added',
        jsonb_build_object('attachment_id', v_attachment.id)
    );

    v_response := to_jsonb(v_attachment);
    insert into public.feedback_rpc_requests(actor_id, operation, idempotency_key, response)
    values (v_actor, 'attachment', p_idempotency_key, v_response);
    return v_response;
end;
$$;


--
-- Name: remove_household_member(uuid, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.remove_household_member(p_household_id uuid, p_user_id_to_remove uuid) RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_current_user_id uuid := auth.uid();
    v_is_admin boolean;
    v_target_is_owner boolean;
    v_remaining_count integer;
begin
    -- Validate current user is authenticated
    if v_current_user_id is null then
        return query select false, 'You must be authenticated.'::text;
        return;
    end if;

    -- Verify household exists
    if not exists(select 1 from public.households where id = p_household_id) then
        return query select false, 'Household not found.'::text;
        return;
    end if;

    -- Check if current user is admin or owner
    select public.is_household_admin(p_household_id, v_current_user_id)
    into v_is_admin;

    if not v_is_admin then
        return query select false, 'Only household admins or owners can remove members.'::text;
        return;
    end if;

    -- Prevent self-removal via this RPC (use leave_household instead)
    if p_user_id_to_remove = v_current_user_id then
        return query select false, 'Use leave_household to remove yourself.'::text;
        return;
    end if;

    -- Check if target user is the owner
    select role = 'owner'
    into v_target_is_owner
    from public.household_members
    where household_id = p_household_id and user_id = p_user_id_to_remove;

    if v_target_is_owner then
        return query select false, 'Cannot remove the household owner. Transfer ownership first.'::text;
        return;
    end if;

    -- Count remaining members (to prevent total removal)
    select count(*)
    into v_remaining_count
    from public.household_members
    where household_id = p_household_id and status = 'accepted' and user_id != p_user_id_to_remove;

    if v_remaining_count = 0 then
        return query select false, 'Cannot remove the last member of the household.'::text;
        return;
    end if;

    -- Remove the member
    delete from public.household_members
    where household_id = p_household_id and user_id = p_user_id_to_remove;

    return query select true, 'Member removed successfully.'::text;
end;
$$;


--
-- Name: reset_planned_item_occurrence_to_template(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.reset_planned_item_occurrence_to_template(p_occurrence_id uuid) RETURNS public.planned_item_occurrences
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can reset a planned item occurrence';
    end if;

    if v_occurrence.status <> 'planned' then
        raise exception 'Only a planned occurrence can be reset to its template (occurrence % is %)', p_occurrence_id, v_occurrence.status;
    end if;

    update public.planned_item_occurrences
       set is_overridden = false,
           source_definition_version = 0
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;


--
-- Name: restore_budget_rule(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.restore_budget_rule(p_rule_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  update public.budget_rules br
     set deleted_at = null
    from public.budget_configs bc
   where br.id = p_rule_id
     and br.budget_config_id = bc.id
     and br.deleted_at is not null
     and public.is_household_admin(bc.household_id, auth.uid());

  return found;
end;
$$;


--
-- Name: revert_monthly_budget_month(uuid, date); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.revert_monthly_budget_month(p_household_id uuid, p_month date) RETURNS public.monthly_budget_periods
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_period public.monthly_budget_periods%rowtype;
    v_blocked_count integer;
    v_occurrence_ids uuid[];
begin
    if not public.is_household_admin(p_household_id, auth.uid()) then
        raise exception 'Only household admins can revert a monthly budget month';
    end if;

    -- Income occurrences + movement occurrences (at least one destination).
    select coalesce(array_agg(poc.id), '{}'::uuid[]) into v_occurrence_ids
      from public.planned_item_occurrences poc
     where poc.household_id = p_household_id
       and poc.month = p_month
       and (
             poc.source_account_id is null
             or exists (
                 select 1
                   from public.planned_item_occurrence_destinations pod
                  where pod.occurrence_id = poc.id
             )
           );

    select count(*) into v_blocked_count
      from public.transactions t
      join public.replenishment_run_transactions rrt on rrt.transaction_id = t.id
     where t.household_id = p_household_id
       and t.planned_item_occurrence_id = any(v_occurrence_ids);

    if v_blocked_count > 0 then
        raise exception 'Cannot reset Monthly Budget for %: % transaction(s) generated for this month are referenced by a Replenishment (Reposição) run. Remove them from that run first, then try again.',
            to_char(p_month, 'YYYY-MM'), v_blocked_count;
    end if;

    delete from public.transactions
     where household_id = p_household_id
       and planned_item_occurrence_id = any(v_occurrence_ids);

    update public.planned_item_occurrences
       set status = 'planned',
           confirmed_at = null,
           confirmed_by = null,
           is_overridden = false
     where household_id = p_household_id
       and month = p_month
       and status in ('confirmed', 'skipped', 'cancelled')
       and id = any(v_occurrence_ids);

    -- Any live "Create all transfers" batch for this month is now empty --
    -- mark it undone so the month can be created again.
    update public.monthly_budget_batches
       set status = 'undone',
           undone_at = now(),
           undone_by = auth.uid()
     where household_id = p_household_id
       and month = p_month
       and status = 'active';

    update public.monthly_budget_periods
       set status = 'open',
           confirmed_at = null,
           confirmed_by = null
     where household_id = p_household_id
       and month = p_month
     returning * into v_period;

    if v_period.id is null then
        select * into v_period
          from public.monthly_budget_periods
         where household_id = p_household_id
           and month = p_month;
    end if;

    return v_period;
end;
$$;


--
-- Name: FUNCTION revert_monthly_budget_month(p_household_id uuid, p_month date); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.revert_monthly_budget_month(p_household_id uuid, p_month date) IS 'Undoes a Monthly Budget save for this household+month: deletes the income and movement (transfer) transactions it generated, resets those occurrences back to planned, and reopens the monthly_budget_periods row. Plain recurring expenses paid on Category Budgets and matched/hand-entered transactions are never touched. See 20260929100000_monthly_budget_save_scope.sql; also marks the month''s batch undone (20260929120000).';


--
-- Name: revert_planned_item_occurrence(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.revert_planned_item_occurrence(p_occurrence_id uuid) RETURNS public.planned_item_occurrences
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
    v_period_status public.monthly_budget_period_status;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can revert a planned item occurrence';
    end if;

    select status into v_period_status
      from public.monthly_budget_periods
     where household_id = v_occurrence.household_id
       and month = v_occurrence.month;

    if coalesce(v_period_status, 'open') <> 'open' then
        raise exception 'Cannot revert: month % is %, edit the transaction directly instead',
            to_char(v_occurrence.month, 'YYYY-MM'), v_period_status;
    end if;

    delete from public.transactions
     where planned_item_occurrence_id = p_occurrence_id;

    update public.planned_item_occurrences
       set status = 'planned',
           confirmed_at = null,
           confirmed_by = null
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;


--
-- Name: save_monthly_budget_configuration(uuid, uuid, text, public.household_income_mode, public.remaining_cash_strategy, numeric, public.excess_cash_distribution_method, jsonb); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.save_monthly_budget_configuration(p_household_id uuid, p_config_id uuid, p_name text, p_income_mode public.household_income_mode, p_remaining_cash_strategy public.remaining_cash_strategy, p_fixed_remaining_cash_amount numeric, p_excess_cash_distribution_method public.excess_cash_distribution_method, p_rules jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_config_id uuid;
  v_rule jsonb;
  v_rule_id uuid;
  v_rule_name text;
  v_source_account_id uuid;
  v_amount numeric;
  v_allocation_mode public.budget_rule_allocation_mode;
  v_dest_ids uuid[];
  v_alloc_amounts numeric[];
  v_alloc_category_ids uuid[];
  v_category_id uuid;
  v_count integer;
  v_distinct_count integer;
  v_total_cents integer;
  v_base_cents integer;
  v_remainder_cents integer;
  v_sum numeric;
begin
  if auth.uid() is null
    or not public.is_household_admin(p_household_id, auth.uid()) then
    raise exception 'Only household administrators can save a monthly budget.';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'A monthly budget name is required.';
  end if;

  if jsonb_typeof(p_rules) <> 'array' then
    raise exception 'Budget rules must be an array.';
  end if;

  if p_config_id is null then
    update public.budget_configs
       set is_active = false
     where household_id = p_household_id
       and is_active;

    insert into public.budget_configs (household_id, name, is_active)
    values (p_household_id, trim(p_name), true)
    returning id into v_config_id;
  else
    select id into v_config_id
      from public.budget_configs
     where id = p_config_id
       and household_id = p_household_id
     for update;

    if v_config_id is null then
      raise exception 'Monthly budget configuration not found.';
    end if;

    update public.budget_configs
       set is_active = false
     where household_id = p_household_id
       and id <> v_config_id
       and is_active;

    update public.budget_configs
       set name = trim(p_name),
           is_active = true
     where id = v_config_id;
  end if;

  update public.households
     set income_mode = p_income_mode,
         remaining_cash_strategy = p_remaining_cash_strategy,
         fixed_remaining_cash_amount = p_fixed_remaining_cash_amount,
         excess_cash_distribution_method = p_excess_cash_distribution_method,
         updated_at = now()
   where id = p_household_id;

  -- Rules no longer sent by the editor are retained for 30 days.
  update public.budget_rules br
     set deleted_at = now()
   where br.budget_config_id = v_config_id
     and br.deleted_at is null
     and not exists (
       select 1
       from jsonb_array_elements(p_rules) candidate
       where candidate ? 'id'
         and nullif(candidate->>'id', '')::uuid = br.id
     );

  for v_rule in select value from jsonb_array_elements(p_rules)
  loop
    v_rule_id := nullif(v_rule->>'id', '')::uuid;
    v_rule_name := trim(v_rule->>'name');
    v_source_account_id := nullif(v_rule->>'source_account_id', '')::uuid;
    v_amount := (v_rule->>'amount')::numeric;
    v_allocation_mode := coalesce(nullif(v_rule->>'allocation_mode', ''), 'equal_split')::public.budget_rule_allocation_mode;

    if v_rule->'allocations' is null
       or jsonb_typeof(v_rule->'allocations') <> 'array'
       or jsonb_array_length(v_rule->'allocations') = 0 then
      raise exception 'Rule "%" needs at least one destination account.', v_rule_name;
    end if;

    v_dest_ids := array(
      select nullif(elem->>'destination_account_id', '')::uuid
      from jsonb_array_elements(v_rule->'allocations') elem
    );
    v_alloc_category_ids := array(
      select nullif(elem->>'category_id', '')::uuid
      from jsonb_array_elements(v_rule->'allocations') elem
    );
    v_count := array_length(v_dest_ids, 1);

    if exists (select 1 from unnest(v_dest_ids) d where d is null) then
      raise exception 'Rule "%" has an allocation with no destination account.', v_rule_name;
    end if;

    select count(distinct d) into v_distinct_count from unnest(v_dest_ids) d;
    if v_distinct_count <> v_count then
      raise exception 'Rule "%" cannot use the same destination account twice.', v_rule_name;
    end if;

    if v_source_account_id is not null and v_source_account_id = any(v_dest_ids) then
      raise exception 'Rule "%" cannot use the same source and destination account.', v_rule_name;
    end if;

    foreach v_category_id in array v_alloc_category_ids
    loop
      if v_category_id is not null and not exists (
        select 1 from public.categories
         where id = v_category_id
           and household_id = p_household_id
      ) then
        raise exception 'Rule "%" has an allocation category that does not belong to this household.', v_rule_name;
      end if;
    end loop;

    v_total_cents := round(coalesce(v_amount, 0) * 100)::integer;

    if v_allocation_mode = 'equal_split' then
      -- Recomputed server-side so the client never has to (and can't
      -- desync) — distribute the remainder cent-by-cent to the first N
      -- accounts in the given order so the sum always equals the total.
      v_base_cents := v_total_cents / v_count;
      v_remainder_cents := v_total_cents % v_count;
      v_alloc_amounts := array(
        select (case when gs <= v_remainder_cents then v_base_cents + 1 else v_base_cents end)::numeric / 100.0
        from generate_series(1, v_count) gs
      );
    else
      v_alloc_amounts := array(
        select round(coalesce((elem->>'amount')::numeric, 0), 2)
        from jsonb_array_elements(v_rule->'allocations') elem
      );

      if exists (select 1 from unnest(v_alloc_amounts) x where x <= 0) then
        raise exception 'Rule "%" needs a positive amount for every destination account.', v_rule_name;
      end if;

      select coalesce(sum(x), 0) into v_sum from unnest(v_alloc_amounts) x;
      if round(v_sum, 2) <> round(coalesce(v_amount, 0), 2) then
        raise exception 'Rule "%" custom allocation amounts (%) do not match its total (%).', v_rule_name, v_sum, v_amount;
      end if;
    end if;

    if v_rule_id is null then
      insert into public.budget_rules (
        budget_config_id, name, section, source_account_id,
        owner_member_id, amount, allocation_mode, frequency, priority, is_active,
        active_months, active_from_month, active_to_month
      )
      values (
        v_config_id,
        v_rule_name,
        (v_rule->>'section')::public.monthly_budget_section,
        v_source_account_id,
        nullif(v_rule->>'owner_member_id', '')::uuid,
        v_amount,
        v_allocation_mode,
        'monthly'::public.recurring_frequency,
        coalesce((v_rule->>'priority')::integer, 0),
        coalesce((v_rule->>'is_active')::boolean, true),
        coalesce(array(select jsonb_array_elements_text(coalesce(v_rule->'active_months', '[]'::jsonb))::smallint), '{}'::smallint[]),
        nullif(v_rule->>'active_from_month', '')::smallint,
        nullif(v_rule->>'active_to_month', '')::smallint
      )
      returning id into v_rule_id;
    else
      update public.budget_rules
         set name = v_rule_name,
             section = (v_rule->>'section')::public.monthly_budget_section,
             source_account_id = v_source_account_id,
             owner_member_id = nullif(v_rule->>'owner_member_id', '')::uuid,
             amount = v_amount,
             allocation_mode = v_allocation_mode,
             frequency = 'monthly'::public.recurring_frequency,
             priority = coalesce((v_rule->>'priority')::integer, 0),
             is_active = coalesce((v_rule->>'is_active')::boolean, true),
             active_months = coalesce(array(select jsonb_array_elements_text(coalesce(v_rule->'active_months', '[]'::jsonb))::smallint), '{}'::smallint[]),
             active_from_month = nullif(v_rule->>'active_from_month', '')::smallint,
             active_to_month = nullif(v_rule->>'active_to_month', '')::smallint,
             deleted_at = null
       where id = v_rule_id
         and budget_config_id = v_config_id;

      if not found then
        raise exception 'A budget rule does not belong to this configuration.';
      end if;
    end if;

    delete from public.budget_rule_allocations where rule_id = v_rule_id;

    insert into public.budget_rule_allocations (rule_id, destination_account_id, amount, category_id, sort_order)
    select v_rule_id, v_dest_ids[gs], v_alloc_amounts[gs], v_alloc_category_ids[gs], gs - 1
    from generate_series(1, v_count) gs;
  end loop;

  return v_config_id;
end;
$$;


--
-- Name: save_transaction_allocations(uuid, jsonb); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.save_transaction_allocations(p_transaction_id uuid, p_allocations jsonb) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_household_id uuid;
  v_amount numeric;
  v_transfer_group_id uuid;
  v_allocation jsonb;
  v_source_type text;
  v_account_id uuid;
  v_pot_id uuid;
  v_amount_value numeric;
  v_sum numeric := 0;
  v_seen_keys text[] := '{}';
  v_seen_account_ids uuid[] := '{}';
  v_seen_pot_ids uuid[] := '{}';
  v_key text;
  v_sort_order integer := 0;
  v_representative_account_id uuid;
  v_representative_amount numeric;
begin
  select household_id, amount, transfer_group_id
  into v_household_id, v_amount, v_transfer_group_id
  from public.transactions
  where id = p_transaction_id
  for update;

  if v_household_id is null then
    raise exception using errcode = '22023', message = 'Transaction not found.';
  end if;

  if not public.is_household_member(v_household_id, (select auth.uid())) then
    raise exception using errcode = '42501', message = 'Household membership is required.';
  end if;

  if v_transfer_group_id is not null then
    raise exception using errcode = '22023', message = 'Transfers cannot be split.';
  end if;

  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' then
    raise exception using errcode = '22023', message = 'Allocations must be an array.';
  end if;

  -- Empty array = convert a split transaction back to a single source. The
  -- transaction's own account_id/pot_id (set separately via the normal
  -- transaction update path) become authoritative again.
  if jsonb_array_length(p_allocations) = 0 then
    delete from public.transaction_allocations where transaction_id = p_transaction_id;
    update public.transactions set is_split = false where id = p_transaction_id;
    return;
  end if;

  if jsonb_array_length(p_allocations) < 2 then
    raise exception using errcode = '22023', message = 'A split transaction requires at least two allocations.';
  end if;

  for v_allocation in select value from jsonb_array_elements(p_allocations)
  loop
    v_source_type := v_allocation->>'source_type';
    v_account_id := nullif(v_allocation->>'account_id', '')::uuid;
    v_pot_id := nullif(v_allocation->>'pot_id', '')::uuid;
    v_amount_value := round(coalesce((v_allocation->>'amount')::numeric, 0), 2);

    if v_source_type not in ('account', 'pot') then
      raise exception using errcode = '22023', message = 'Each allocation needs source_type "account" or "pot".';
    end if;

    if v_source_type = 'account' then
      if v_account_id is null or v_pot_id is not null then
        raise exception using errcode = '22023', message = 'An account allocation needs account_id and no pot_id.';
      end if;
      if not exists (select 1 from public.accounts a where a.id = v_account_id and a.household_id = v_household_id) then
        raise exception using errcode = '22023', message = 'Allocation account must belong to this household.';
      end if;
      v_key := 'account:' || v_account_id::text;
      v_seen_account_ids := array_append(v_seen_account_ids, v_account_id);
    else
      if v_pot_id is null or v_account_id is not null then
        raise exception using errcode = '22023', message = 'A pot allocation needs pot_id and no account_id.';
      end if;
      if not exists (select 1 from public.saving_pots sp where sp.id = v_pot_id and sp.household_id = v_household_id) then
        raise exception using errcode = '22023', message = 'Allocation pot must belong to this household.';
      end if;
      v_key := 'pot:' || v_pot_id::text;
      v_seen_pot_ids := array_append(v_seen_pot_ids, v_pot_id);
    end if;

    if v_amount_value <= 0 then
      raise exception using errcode = '22023', message = 'Every allocation amount must be greater than zero.';
    end if;

    if v_key = any(v_seen_keys) then
      raise exception using errcode = '23505', message = 'Each account or pot can only be used once per transaction.';
    end if;
    v_seen_keys := array_append(v_seen_keys, v_key);

    v_sum := v_sum + v_amount_value;
  end loop;

  -- Guard against double counting: an allocation cannot use both a pot and
  -- (on another row of the same transaction) an account that backs that
  -- same pot -- otherwise money leaving that account would be counted
  -- twice by account_balances/saving_pot_balances (once via the account
  -- row, once via the pot row). See docs/split-transactions-plan.md §2.6.
  if array_length(v_seen_account_ids, 1) > 0 and array_length(v_seen_pot_ids, 1) > 0
    and exists (
      select 1
      from public.saving_pot_accounts spa
      where spa.pot_id = any(v_seen_pot_ids)
        and spa.account_id = any(v_seen_account_ids)
    )
  then
    raise exception using
      errcode = '23514',
      message = 'An allocation cannot use both a pot and one of its own backing accounts on the same transaction.';
  end if;

  if round(v_sum, 2) <> round(v_amount, 2) then
    raise exception using
      errcode = '22023',
      message = format('Allocations (%s) must sum to the transaction amount (%s).', v_sum, v_amount);
  end if;

  delete from public.transaction_allocations where transaction_id = p_transaction_id;

  v_sort_order := 0;
  v_representative_account_id := null;
  v_representative_amount := -1;

  for v_allocation in select value from jsonb_array_elements(p_allocations)
  loop
    v_account_id := nullif(v_allocation->>'account_id', '')::uuid;
    v_amount_value := round(coalesce((v_allocation->>'amount')::numeric, 0), 2);

    insert into public.transaction_allocations (
      household_id, transaction_id, source_type, account_id, pot_id, amount, sort_order
    )
    values (
      v_household_id,
      p_transaction_id,
      v_allocation->>'source_type',
      v_account_id,
      nullif(v_allocation->>'pot_id', '')::uuid,
      v_amount_value,
      v_sort_order
    );

    -- The largest account allocation becomes the transaction's
    -- representative account_id, used by account filters/joins that are
    -- not split-aware. Ties keep the first row in the given order.
    if v_account_id is not null and v_amount_value > v_representative_amount then
      v_representative_account_id := v_account_id;
      v_representative_amount := v_amount_value;
    end if;

    v_sort_order := v_sort_order + 1;
  end loop;

  update public.transactions
  set is_split = true,
      pot_id = null,
      account_id = coalesce(v_representative_account_id, account_id)
  where id = p_transaction_id;
end;
$$;


--
-- Name: FUNCTION save_transaction_allocations(p_transaction_id uuid, p_allocations jsonb); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.save_transaction_allocations(p_transaction_id uuid, p_allocations jsonb) IS 'Replaces a transaction''s funding-source breakdown. p_allocations is a JSON array of {source_type: "account"|"pot", account_id|pot_id, amount}. Validates household membership, no duplicate/self-conflicting sources, and that amounts sum to the transaction''s amount to the cent. An empty array reverts the transaction to a single (non-split) source.';


--
-- Name: seed_categories_on_household_insert(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.seed_categories_on_household_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
    perform public.create_default_categories(new.id);
    return new;
end;
$$;


--
-- Name: set_default_household(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.set_default_household(p_household_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        raise exception 'You must be authenticated to set a default household.';
    end if;

    if not exists (
        select 1
        from public.household_members hm
        where hm.user_id = v_user_id
            and hm.household_id = p_household_id
            and hm.status = 'accepted'
    ) then
        raise exception 'You are not an accepted member of this household.';
    end if;

    update public.profiles
    set default_household_id = p_household_id
    where id = v_user_id;

    return p_household_id;
end;
$$;


--
-- Name: set_saving_pot_accounts(uuid, uuid[]); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.set_saving_pot_accounts(p_pot_id uuid, p_account_ids uuid[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_household_id uuid;
    v_invalid_account_ids uuid[];
    v_conflicting_account_id uuid;
begin
    select household_id
    into v_household_id
    from public.saving_pots
    where id = p_pot_id
    for update;

    if v_household_id is null then
        raise exception 'Saving pot not found';
    end if;

    if not public.is_household_member(v_household_id, auth.uid()) then
        raise exception 'Not authorized to update this saving pot';
    end if;

    if coalesce(cardinality(p_account_ids), 0) = 0 then
        raise exception using
            errcode = '23514',
            message = 'A saving pot must have at least one account.';
    end if;

    if array_position(p_account_ids, null) is not null then
        raise exception using
            errcode = '23502',
            message = 'Saving pot account selections cannot contain null values.';
    end if;

    if cardinality(p_account_ids) <> (
        select count(distinct account_id)
        from unnest(p_account_ids) as selected(account_id)
    ) then
        raise exception using
            errcode = '23505',
            message = 'A saving pot account can only be selected once.';
    end if;

    select array_agg(selected.account_id order by selected.account_id)
    into v_invalid_account_ids
    from unnest(p_account_ids) as selected(account_id)
    left join public.accounts a on a.id = selected.account_id
    where a.id is null
       or a.household_id <> v_household_id;

    if v_invalid_account_ids is not null then
        raise exception using
            errcode = '23514',
            message = 'Every saving pot account must belong to the same household as the saving pot.',
            detail = array_to_string(v_invalid_account_ids, ', ');
    end if;

    -- Lock the selected accounts so concurrent updates cannot race the
    -- account-to-pot uniqueness constraint with misleading UI state.
    perform 1
    from public.accounts a
    where a.id = any(p_account_ids)
    for update;

    select spa.account_id
    into v_conflicting_account_id
    from public.saving_pot_accounts spa
    where spa.account_id = any(p_account_ids)
      and spa.pot_id <> p_pot_id
    limit 1;

    if v_conflicting_account_id is not null then
        raise exception using
            errcode = '23505',
            message = 'An account can belong to only one saving pot.',
            detail = format('Account %s is already assigned to another saving pot.', v_conflicting_account_id);
    end if;

    delete from public.saving_pot_accounts
    where pot_id = p_pot_id;

    insert into public.saving_pot_accounts (pot_id, account_id)
    select p_pot_id, selected.account_id
    from unnest(p_account_ids) as selected(account_id);
end;
$$;


--
-- Name: set_transaction_tags(uuid, uuid[]); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.set_transaction_tags(p_transaction_id uuid, p_tag_ids uuid[]) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_household_id uuid;
  v_type public.transaction_type;
  v_transfer_group_id uuid;
  v_count integer := 0;
  v_tag_ids uuid[] := array(
    select distinct tag_id
    from unnest(coalesce(p_tag_ids, '{}'::uuid[])) as tag_id
    where tag_id is not null
  );
begin
  select t.household_id, t.type, t.transfer_group_id
    into v_household_id, v_type, v_transfer_group_id
  from public.transactions t
  where t.id = p_transaction_id;

  if v_household_id is null then
    raise exception 'Transaction not found.' using errcode = 'no_data_found';
  end if;

  if not public.is_household_member(v_household_id, auth.uid()) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;

  if cardinality(v_tag_ids) > 0
     and (v_type <> 'expense' or v_transfer_group_id is not null) then
    raise exception 'Tags can only be assigned to expense transactions.'
      using errcode = 'check_violation';
  end if;

  delete from public.transaction_tag_assignments
  where transaction_id = p_transaction_id
    and household_id = v_household_id;

  if cardinality(v_tag_ids) > 0 then
    insert into public.transaction_tag_assignments (household_id, transaction_id, tag_id)
    select v_household_id, p_transaction_id, tag_id
    from unnest(v_tag_ids) as tag_id;
    get diagnostics v_count = row_count;
  end if;

  return v_count;
end;
$$;


--
-- Name: skip_planned_item_occurrence(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.skip_planned_item_occurrence(p_occurrence_id uuid) RETURNS public.planned_item_occurrences
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can skip a planned item occurrence';
    end if;

    if v_occurrence.status <> 'planned' then
        raise exception 'Only a planned occurrence can be skipped (occurrence % is %)', p_occurrence_id, v_occurrence.status;
    end if;

    update public.planned_item_occurrences
       set status = 'skipped'
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;


--
-- Name: submit_app_feedback(text, text, text, jsonb, text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.submit_app_feedback(p_category text, p_title text, p_description text, p_app_context jsonb, p_idempotency_key text) RETURNS public.app_feedback
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_result jsonb;
begin
    v_result := public.submit_app_feedback(
        p_idempotency_key,
        p_category,
        p_title,
        p_description,
        null,
        case
            when p_app_context ->> 'platform' in ('android', 'ios', 'web')
            then p_app_context ->> 'platform'
            else null
        end,
        coalesce(p_app_context, '{}'::jsonb)
    );
    return jsonb_populate_record(null::public.app_feedback, v_result);
end;
$$;


--
-- Name: submit_app_feedback(text, text, text, text, text, text, jsonb); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.submit_app_feedback(p_idempotency_key text, p_category text, p_title text, p_description text, p_app_version text DEFAULT NULL::text, p_platform text DEFAULT NULL::text, p_context jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_actor uuid := auth.uid();
    v_feedback public.app_feedback%rowtype;
    v_response jsonb;
    v_admin record;
begin
    if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    perform public.assert_feedback_idempotency_key(p_idempotency_key);
    perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':submit:' || p_idempotency_key, 0));

    select response into v_response
    from public.feedback_rpc_requests
    where actor_id = v_actor and operation = 'submit' and idempotency_key = p_idempotency_key;
    if found then return v_response; end if;

    perform public.consume_feedback_rate_limit(v_actor, 'submit', 5, interval '1 hour');
    perform public.consume_feedback_rate_limit(v_actor, 'submit_daily', 20, interval '24 hours');

    if p_context is null or jsonb_typeof(p_context) <> 'object' or octet_length(p_context::text) > 16384 then
        raise exception 'Context must be a JSON object no larger than 16 KiB' using errcode = '22023';
    end if;

    insert into public.app_feedback (
        user_id, category, title, description, app_version, platform, app_context, idempotency_key
    ) values (
        v_actor, p_category, btrim(p_title), btrim(p_description),
        nullif(btrim(p_app_version), ''), p_platform, p_context, p_idempotency_key
    ) returning * into v_feedback;

    insert into public.feedback_events(feedback_id, actor_id, event_type, to_value)
    values (v_feedback.id, v_actor, 'submitted', 'submitted');

    -- Creation alerts go only to active platform admins, never back to the author.
    for v_admin in
        select user_id from public.platform_admins where is_active and user_id <> v_actor
    loop
        perform public.notify_feedback_recipient(
            v_admin.user_id,
            'feedback_created',
            'New app feedback',
            v_feedback.title,
            jsonb_build_object('feedback_id', v_feedback.id, 'category', v_feedback.category),
            'feedback:new:' || v_feedback.id::text || ':admin:' || v_admin.user_id::text
        );
    end loop;

    v_response := to_jsonb(v_feedback);
    insert into public.feedback_rpc_requests(actor_id, operation, idempotency_key, response)
    values (v_actor, 'submit', p_idempotency_key, v_response);
    return v_response;
end;
$$;


--
-- Name: summarize_transaction_movements(uuid, text, uuid, uuid, uuid, uuid, boolean, uuid, date, date, boolean, text, numeric, numeric, uuid[]); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.summarize_transaction_movements(p_household_id uuid, p_kind text DEFAULT NULL::text, p_account_id uuid DEFAULT NULL::uuid, p_source_account_id uuid DEFAULT NULL::uuid, p_destination_account_id uuid DEFAULT NULL::uuid, p_category_id uuid DEFAULT NULL::uuid, p_uncategorized boolean DEFAULT false, p_created_by uuid DEFAULT NULL::uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_exclude_transfers boolean DEFAULT false, p_search text DEFAULT NULL::text, p_min_amount numeric DEFAULT NULL::numeric, p_max_amount numeric DEFAULT NULL::numeric, p_account_ids uuid[] DEFAULT NULL::uuid[]) RETURNS TABLE(movement_count integer, income_total numeric, expense_total numeric, net_total numeric)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  with transfer_integrity as (
    select t.transfer_group_id
    from public.transactions t
    where t.household_id = p_household_id
      and t.transfer_group_id is not null
    group by t.transfer_group_id
    having count(*) = 2
      and count(*) filter (where t.type = 'expense') = 1
      and count(*) filter (where t.type = 'income') = 1
  ),
  regular as (
    select
      t.id as movement_id,
      t.id as transaction_id,
      t.type::text as movement_kind,
      t.household_id,
      t.account_id,
      null::uuid as source_account_id,
      null::uuid as destination_account_id,
      t.category_id,
      t.created_by,
      t.title,
      t.notes,
      t.merchant_name,
      t.amount,
      t.transaction_date
    from public.transactions t
    where t.household_id = p_household_id
      and t.transfer_group_id is null
  ),
  transfers as (
    select
      outgoing.transfer_group_id as movement_id,
      null::uuid as transaction_id,
      'transfer'::text as movement_kind,
      outgoing.household_id,
      null::uuid as account_id,
      outgoing.account_id as source_account_id,
      incoming.account_id as destination_account_id,
      outgoing.category_id,
      outgoing.created_by,
      outgoing.title,
      outgoing.notes,
      outgoing.merchant_name,
      outgoing.amount,
      outgoing.transaction_date
    from transfer_integrity valid
    join public.transactions outgoing
      on outgoing.transfer_group_id = valid.transfer_group_id and outgoing.household_id = p_household_id and outgoing.type = 'expense'
    join public.transactions incoming
      on incoming.transfer_group_id = valid.transfer_group_id and incoming.household_id = p_household_id and incoming.type = 'income'
  ),
  movements as (
    select * from regular
    union all
    select * from transfers
  ),
  filtered as (
    select m.*
    from movements m
    where (p_kind is null or m.movement_kind = p_kind)
      and (not p_exclude_transfers or m.movement_kind <> 'transfer')
      and (
        p_account_id is null
        or m.account_id = p_account_id
        or m.source_account_id = p_account_id
        or m.destination_account_id = p_account_id
        or exists (
          select 1
          from public.transaction_allocations ta
          where ta.transaction_id = m.transaction_id
            and ta.account_id = p_account_id
        )
      )
      and (
        p_account_ids is null
        or m.account_id = any(p_account_ids)
        or m.source_account_id = any(p_account_ids)
        or m.destination_account_id = any(p_account_ids)
        or exists (
          select 1
          from public.transaction_allocations ta
          where ta.transaction_id = m.transaction_id
            and ta.account_id = any(p_account_ids)
        )
      )
      and (p_source_account_id is null or m.source_account_id = p_source_account_id)
      and (p_destination_account_id is null or m.destination_account_id = p_destination_account_id)
      and (not p_uncategorized or (m.movement_kind <> 'transfer' and m.category_id is null))
      and (
        p_uncategorized
        or p_category_id is null
        or m.category_id = p_category_id
        or m.category_id in (
          select c.id
          from public.categories c
          where c.parent_id = p_category_id
            and c.household_id = p_household_id
        )
      )
      and (p_created_by is null or m.created_by = p_created_by)
      and (p_from is null or m.transaction_date::date >= p_from)
      and (p_to is null or m.transaction_date::date <= p_to)
      and (
        p_search is null
        or btrim(p_search) = ''
        or m.title ilike '%' || p_search || '%'
        or m.notes ilike '%' || p_search || '%'
        or m.merchant_name ilike '%' || p_search || '%'
      )
      and (p_min_amount is null or m.amount >= p_min_amount)
      and (p_max_amount is null or m.amount <= p_max_amount)
  )
  select
    count(*)::integer as movement_count,
    coalesce(sum(amount) filter (where movement_kind = 'income'), 0) as income_total,
    coalesce(sum(amount) filter (where movement_kind = 'expense'), 0) as expense_total,
    coalesce(sum(amount) filter (where movement_kind = 'income'), 0)
      - coalesce(sum(amount) filter (where movement_kind = 'expense'), 0) as net_total
  from filtered;
$$;


--
-- Name: FUNCTION summarize_transaction_movements(p_household_id uuid, p_kind text, p_account_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_category_id uuid, p_uncategorized boolean, p_created_by uuid, p_from date, p_to date, p_exclude_transfers boolean, p_search text, p_min_amount numeric, p_max_amount numeric, p_account_ids uuid[]); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.summarize_transaction_movements(p_household_id uuid, p_kind text, p_account_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_category_id uuid, p_uncategorized boolean, p_created_by uuid, p_from date, p_to date, p_exclude_transfers boolean, p_search text, p_min_amount numeric, p_max_amount numeric, p_account_ids uuid[]) IS 'Aggregates the full transaction/transfer movement set matching the same filters as list_transaction_movements (minus sort/limit/offset). p_account_ids matches a movement touching ANY of the given accounts -- used by the replenishment wizard''s "total selected / total per account" summary across multiple "accounts to replenish".';


--
-- Name: summarize_transaction_tags(uuid, date, date); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.summarize_transaction_tags(p_household_id uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date) RETURNS TABLE(tag_id uuid, name text, color text, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, transaction_count integer, gross_total numeric, reimbursed_total numeric, net_total numeric, last_transaction_date timestamp with time zone)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  with reimbursements as (
    select r.transaction_id, sum(r.amount) as reimbursed_total
    from public.transaction_reimbursements r
    where r.household_id = p_household_id
    group by r.transaction_id
  ),
  tagged as (
    select
      a.tag_id,
      t.id as transaction_id,
      t.amount,
      coalesce(re.reimbursed_total, 0) as reimbursed_total,
      t.transaction_date
    from public.transaction_tag_assignments a
    join public.transactions t
      on t.id = a.transaction_id
     and t.household_id = a.household_id
    left join reimbursements re on re.transaction_id = t.id
    where a.household_id = p_household_id
      and t.type = 'expense'
      and t.transfer_group_id is null
      and (p_from is null or t.transaction_date::date >= p_from)
      and (p_to is null or t.transaction_date::date <= p_to)
  )
  select
    tag.id as tag_id,
    tag.name,
    tag.color,
    tag.created_by,
    tag.created_at,
    tag.updated_at,
    count(x.transaction_id)::integer as transaction_count,
    coalesce(sum(x.amount), 0)::numeric as gross_total,
    coalesce(sum(x.reimbursed_total), 0)::numeric as reimbursed_total,
    (coalesce(sum(x.amount), 0) - coalesce(sum(x.reimbursed_total), 0))::numeric as net_total,
    max(x.transaction_date) as last_transaction_date
  from public.transaction_tags tag
  left join tagged x on x.tag_id = tag.id
  where tag.household_id = p_household_id
  group by tag.id;
$$;


--
-- Name: sync_reimbursement_income_transaction(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.sync_reimbursement_income_transaction() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_expense_title text;
  v_title text;
begin
  select t.title into v_expense_title
  from public.transactions t
  where t.id = new.transaction_id;

  v_title := coalesce(v_expense_title, '') || ' · ' || new.payer_name;

  perform set_config('app.reimbursement_sync', 'on', true);

  if new.source_type = 'account' and new.account_id is not null then
    update public.transactions
    set account_id = new.account_id,
        amount = new.amount,
        transaction_date = new.received_on::timestamptz,
        title = v_title,
        notes = new.note
    where reimbursement_id = new.id;

    if not found then
      insert into public.transactions (
        household_id, account_id, category_id, title, notes, amount, type,
        transaction_date, created_by, reimbursement_id
      )
      values (
        new.household_id, new.account_id, null, v_title, new.note, new.amount, 'income',
        new.received_on::timestamptz, new.created_by, new.id
      );
    end if;
  else
    -- Pot (or legacy source-less) reimbursement: no income row.
    delete from public.transactions where reimbursement_id = new.id;
  end if;

  perform set_config('app.reimbursement_sync', 'off', true);
  return new;
end;
$$;


--
-- Name: transfer_household_ownership(uuid, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.transfer_household_ownership(p_household_id uuid, p_new_owner_id uuid) RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_current_user_id uuid := auth.uid();
    v_current_owner_id uuid;
    v_new_owner_exists boolean;
    v_new_owner_accepted boolean;
begin
    -- Validate current user is authenticated
    if v_current_user_id is null then
        return query select false, 'You must be authenticated.'::text;
        return;
    end if;

    -- Get current owner
    select owner_id into v_current_owner_id
    from public.households
    where id = p_household_id;

    if v_current_owner_id is null then
        return query select false, 'Household not found.'::text;
        return;
    end if;

    -- Verify caller is the owner
    if v_current_owner_id != v_current_user_id then
        return query select false, 'Only the household owner can transfer ownership.'::text;
        return;
    end if;

    -- Prevent transferring to self
    if p_new_owner_id = v_current_user_id then
        return query select false, 'Cannot transfer ownership to yourself.'::text;
        return;
    end if;

    -- Verify new owner is an accepted member
    select exists(
        select 1 from public.household_members
        where household_id = p_household_id
          and user_id = p_new_owner_id
          and status = 'accepted'
    ) into v_new_owner_exists;

    if not v_new_owner_exists then
        return query select false, 'New owner must be an accepted member of the household.'::text;
        return;
    end if;

    -- Update household owner
    update public.households
    set owner_id = p_new_owner_id, updated_at = now()
    where id = p_household_id;

    -- Promote new owner to 'owner' role
    update public.household_members
    set role = 'owner'
    where household_id = p_household_id and user_id = p_new_owner_id;

    -- Demote current owner to 'admin'
    update public.household_members
    set role = 'admin'
    where household_id = p_household_id and user_id = v_current_user_id;

    return query select true, 'Ownership transferred successfully.'::text;
end;
$$;


--
-- Name: undo_monthly_budget_batch(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.undo_monthly_budget_batch(p_batch_id uuid) RETURNS public.monthly_budget_batches
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_batch public.monthly_budget_batches%rowtype;
    v_occurrence_ids uuid[];
    v_blocked_count integer;
begin
    select * into v_batch
      from public.monthly_budget_batches
     where id = p_batch_id
     for update;

    if not found then
        raise exception 'Monthly budget batch % not found', p_batch_id;
    end if;
    if not public.is_household_admin(v_batch.household_id, auth.uid()) then
        raise exception 'Only household admins can undo a monthly budget batch';
    end if;
    if v_batch.status <> 'active' then
        return v_batch; -- already undone: nothing to do
    end if;

    select count(*) into v_blocked_count
      from public.transactions t
      join public.replenishment_run_transactions rrt on rrt.transaction_id = t.id
     where t.monthly_budget_batch_id = p_batch_id;

    if v_blocked_count > 0 then
        raise exception 'Cannot undo: % transaction(s) from this batch are used in a Replenishment (Reposição) run. Remove them from that run first.', v_blocked_count;
    end if;

    select coalesce(array_agg(distinct t.planned_item_occurrence_id), '{}'::uuid[]) into v_occurrence_ids
      from public.transactions t
     where t.monthly_budget_batch_id = p_batch_id
       and t.planned_item_occurrence_id is not null;

    delete from public.transactions
     where monthly_budget_batch_id = p_batch_id;

    update public.planned_item_occurrences
       set status = 'planned',
           confirmed_at = null,
           confirmed_by = null,
           is_overridden = false
     where id = any(v_occurrence_ids)
       and status = 'confirmed';

    update public.monthly_budget_periods
       set status = 'open',
           confirmed_at = null,
           confirmed_by = null
     where household_id = v_batch.household_id
       and month = v_batch.month
       and status in ('committed', 'closed');

    update public.monthly_budget_batches
       set status = 'undone',
           undone_at = now(),
           undone_by = auth.uid()
     where id = p_batch_id
     returning * into v_batch;

    return v_batch;
end;
$$;


--
-- Name: FUNCTION undo_monthly_budget_batch(p_batch_id uuid); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.undo_monthly_budget_batch(p_batch_id uuid) IS 'Deletes exactly the transactions a Monthly Budget "Create all transfers" batch created (transactions.monthly_budget_batch_id), returns their occurrences to planned, reopens the month and marks the batch undone. Never touches any other transaction.';


--
-- Name: unlink_planned_item_occurrence_transaction(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.unlink_planned_item_occurrence_transaction(p_occurrence_id uuid) RETURNS public.planned_item_occurrences
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
    v_transaction_id uuid;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can unlink a planned item occurrence''s transaction';
    end if;

    if v_occurrence.status <> 'confirmed' then
        raise exception 'Occurrence % is %, not confirmed -- use unmatch_planned_item_occurrence for a matched occurrence instead', p_occurrence_id, v_occurrence.status;
    end if;

    select id into v_transaction_id
      from public.transactions
     where planned_item_occurrence_id = p_occurrence_id
       and planned_item_occurrence_destination_id is null
       and planned_item_transaction_role = 'plain_expense'
     for update;

    if v_transaction_id is not null then
        update public.transactions
           set planned_item_occurrence_id = null,
               planned_item_occurrence_destination_id = null,
               planned_item_transaction_role = null
         where id = v_transaction_id;
    end if;

    update public.planned_item_occurrences
       set status = 'planned',
           confirmed_at = null,
           confirmed_by = null
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;


--
-- Name: unmatch_planned_item_occurrence(uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.unmatch_planned_item_occurrence(p_occurrence_id uuid) RETURNS public.planned_item_occurrences
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can unmatch a planned item occurrence';
    end if;

    delete from public.planned_item_matches where occurrence_id = p_occurrence_id;

    update public.planned_item_occurrences
       set status = 'planned'
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;


--
-- Name: update_app_feedback(uuid, text, text, text, text, text, text, jsonb); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.update_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_app_version text DEFAULT NULL::text, p_platform text DEFAULT NULL::text, p_context jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_actor uuid := auth.uid();
    v_feedback public.app_feedback%rowtype;
    v_response jsonb;
    v_changes jsonb := '{}'::jsonb;
begin
    if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    perform public.assert_feedback_idempotency_key(p_idempotency_key);
    perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':update:' || p_idempotency_key, 0));

    select response into v_response from public.feedback_rpc_requests
    where actor_id = v_actor and operation = 'update' and idempotency_key = p_idempotency_key;
    if found then return v_response; end if;

    select * into v_feedback from public.app_feedback
    where id = p_feedback_id and user_id = v_actor for update;
    if not found then raise exception 'Feedback not found' using errcode = 'P0002'; end if;
    if v_feedback.status in ('resolved', 'closed', 'rejected', 'withdrawn') then
        raise exception 'Terminal feedback cannot be edited' using errcode = 'P0001';
    end if;
    if p_title is null and p_description is null and p_category is null
       and p_app_version is null and p_platform is null and p_context is null then
        raise exception 'At least one field is required' using errcode = '22023';
    end if;
    if p_context is not null
       and (jsonb_typeof(p_context) <> 'object' or octet_length(p_context::text) > 16384) then
        raise exception 'Context must be a JSON object no larger than 16 KiB' using errcode = '22023';
    end if;

    perform public.consume_feedback_rate_limit(v_actor, 'update', 30, interval '1 hour');

    if p_title is not null then v_changes := v_changes || jsonb_build_object('title', true); end if;
    if p_description is not null then v_changes := v_changes || jsonb_build_object('description', true); end if;
    if p_category is not null then v_changes := v_changes || jsonb_build_object('category', true); end if;
    if p_app_version is not null then v_changes := v_changes || jsonb_build_object('app_version', true); end if;
    if p_platform is not null then v_changes := v_changes || jsonb_build_object('platform', true); end if;
    if p_context is not null then v_changes := v_changes || jsonb_build_object('context', true); end if;

    update public.app_feedback
    set title = case when p_title is null then title else btrim(p_title) end,
        description = case when p_description is null then description else btrim(p_description) end,
        category = coalesce(p_category, category),
        app_version = case when p_app_version is null then app_version else nullif(btrim(p_app_version), '') end,
        platform = coalesce(p_platform, platform),
        app_context = coalesce(p_context, app_context),
        last_activity_at = now()
    where id = p_feedback_id
    returning * into v_feedback;

    insert into public.feedback_events(feedback_id, actor_id, event_type, metadata)
    values (p_feedback_id, v_actor, 'author_updated', jsonb_build_object('changed', v_changes));

    v_response := to_jsonb(v_feedback);
    insert into public.feedback_rpc_requests(actor_id, operation, idempotency_key, response)
    values (v_actor, 'update', p_idempotency_key, v_response);
    return v_response;
end;
$$;


--
-- Name: update_completed_transfer(uuid, uuid, uuid, numeric, text, text, timestamp with time zone, uuid); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.update_completed_transfer(p_transfer_group_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_amount numeric, p_title text, p_notes text DEFAULT NULL::text, p_transaction_date timestamp with time zone DEFAULT now(), p_category_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_household_id uuid;
  v_row_count integer;
begin
  if p_amount <= 0 then raise exception 'Transfer amount must be greater than zero'; end if;
  if p_source_account_id = p_destination_account_id then raise exception 'Source and destination accounts must be different'; end if;
  if nullif(btrim(p_title), '') is null then raise exception 'Transfer title is required'; end if;

  perform 1 from public.transactions t
  where t.transfer_group_id = p_transfer_group_id
  order by t.id
  for update;

  select min(t.household_id::text)::uuid, count(*) into v_household_id, v_row_count
  from public.transactions t
  where t.transfer_group_id = p_transfer_group_id;

  if v_row_count <> 2
    or (select count(*) from public.transactions t where t.transfer_group_id = p_transfer_group_id and t.type = 'expense') <> 1
    or (select count(*) from public.transactions t where t.transfer_group_id = p_transfer_group_id and t.type = 'income') <> 1
  then raise exception 'Transfer group is malformed or unavailable'; end if;

  if not public.is_household_member(v_household_id, (select auth.uid())) then raise exception 'Not authorized for this household'; end if;
  if (select count(*) from public.accounts a where a.id in (p_source_account_id, p_destination_account_id) and a.household_id = v_household_id) <> 2
  then raise exception 'Transfer accounts must belong to the transfer household'; end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories c
     where c.id = p_category_id
       and c.household_id = v_household_id
       and c.type in ('account', 'expense')
  ) then raise exception 'Transfer category must be an account or expense category in this household'; end if;

  update public.transactions t
  set account_id = case when t.type = 'expense' then p_source_account_id else p_destination_account_id end,
      category_id = p_category_id,
      amount = p_amount,
      title = btrim(p_title),
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      transaction_date = p_transaction_date
  where t.transfer_group_id = p_transfer_group_id;

  if not found then raise exception 'Transfer group is unavailable'; end if;
  return p_transfer_group_id;
end;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


--
-- Name: validate_planned_item_destination(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.validate_planned_item_destination() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    v_source_account_id uuid;
    v_allocation_mode public.planned_item_allocation_mode;
begin
    select source_account_id, allocation_mode
        into v_source_account_id, v_allocation_mode
        from public.planned_items
        where id = new.planned_item_id;

    if not found then
        raise exception 'Planned item % does not exist', new.planned_item_id;
    end if;

    if v_source_account_id is not null and new.destination_account_id = v_source_account_id then
        raise exception 'Destination account cannot be the same as the planned item''s source account (item %)', new.planned_item_id;
    end if;

    if v_allocation_mode in ('single', 'equal_split') then
        if new.amount is not null or new.percent is not null then
            raise exception '% destinations must not specify amount or percent (item %)', v_allocation_mode, new.planned_item_id;
        end if;
    elsif v_allocation_mode = 'custom_amount' then
        if new.amount is null then
            raise exception 'custom_amount destinations require an amount (item %)', new.planned_item_id;
        end if;
        if new.percent is not null then
            raise exception 'custom_amount destinations must not specify percent (item %)', new.planned_item_id;
        end if;
    elsif v_allocation_mode = 'custom_percent' then
        if new.percent is null then
            raise exception 'custom_percent destinations require a percent (item %)', new.planned_item_id;
        end if;
        if new.amount is not null then
            raise exception 'custom_percent destinations must not specify amount (item %)', new.planned_item_id;
        end if;
    end if;

    return new;
end;
$$;


--
-- Name: FUNCTION validate_planned_item_destination(); Type: COMMENT; Schema: public
--

COMMENT ON FUNCTION public.validate_planned_item_destination() IS 'BEFORE INSERT OR UPDATE trigger on planned_item_destinations: rejects a destination equal to the parent''s source account, and enforces that amount/percent are populated (or not) according to the parent planned_items.allocation_mode. single/equal_split treated identically -- neither stores a per-destination figure at the template level.';


--
-- Name: validate_recurring_run_execution_household(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.validate_recurring_run_execution_household() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_rule_household_id uuid;
begin
    select rule.household_id
    into v_rule_household_id
    from public.recurring_transactions rule
    where rule.id = new.recurring_transaction_id;

    if not found then
        raise exception 'Recurring execution must reference an existing rule';
    end if;

    if new.household_id is null then
        new.household_id := v_rule_household_id;
    elsif new.household_id <> v_rule_household_id then
        raise exception 'Recurring execution must belong to the rule household';
    end if;

    return new;
end;
$$;


--
-- Name: validate_recurring_transaction_destinations(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.validate_recurring_transaction_destinations() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
    if not exists (
        select 1 from public.accounts account
        where account.id = new.account_id
          and account.household_id = new.household_id
    ) then
        raise exception 'Recurring source account must belong to the same household';
    end if;

    if new.category_id is not null and not exists (
        select 1 from public.categories category
        where category.id = new.category_id
          and category.household_id = new.household_id
    ) then
        raise exception 'Recurring category must belong to the same household';
    end if;

    if new.pot_id is not null and not exists (
        select 1 from public.saving_pots pot
        where pot.id = new.pot_id
          and pot.household_id = new.household_id
    ) then
        raise exception 'Recurring pot must belong to the same household';
    end if;

    if new.destination_account_id is not null and not exists (
        select 1 from public.accounts account
        where account.id = new.destination_account_id
          and account.household_id = new.household_id
    ) then
        raise exception 'Recurring destination account must belong to the same household';
    end if;

    if new.destination_pot_id is not null and not exists (
        select 1 from public.saving_pots pot
        where pot.id = new.destination_pot_id
          and pot.household_id = new.household_id
    ) then
        raise exception 'Recurring destination pot must belong to the same household';
    end if;

    return new;
end;
$$;


--
-- Name: validate_transaction_recurring_execution_household(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.validate_transaction_recurring_execution_household() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
    if new.recurring_execution_id is not null and not exists (
        select 1 from public.recurring_run_executions execution
        where execution.id = new.recurring_execution_id
          and execution.household_id = new.household_id
    ) then
        raise exception 'Recurring execution must belong to the transaction household';
    end if;

    return new;
end;
$$;


--
-- Name: withdraw_app_feedback(uuid, text, text); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.withdraw_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
    v_actor uuid := auth.uid();
    v_feedback public.app_feedback%rowtype;
    v_response jsonb;
    v_from_status text;
begin
    if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    perform public.assert_feedback_idempotency_key(p_idempotency_key);
    if p_reason is not null and char_length(p_reason) > 1000 then
        raise exception 'Withdrawal reason is too long' using errcode = '22023';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':withdraw:' || p_idempotency_key, 0));

    select response into v_response from public.feedback_rpc_requests
    where actor_id = v_actor and operation = 'withdraw' and idempotency_key = p_idempotency_key;
    if found then return v_response; end if;

    select * into v_feedback from public.app_feedback
    where id = p_feedback_id and user_id = v_actor for update;
    if not found then raise exception 'Feedback not found' using errcode = 'P0002'; end if;
    if v_feedback.status = 'closed' and v_feedback.withdrawn_at is not null then
        v_response := to_jsonb(v_feedback);
    else
        v_from_status := v_feedback.status;
        update public.app_feedback
        set status = 'closed', withdrawn_at = now(), resolved_at = null,
            closed_at = now(), last_activity_at = now()
        where id = p_feedback_id returning * into v_feedback;

        insert into public.feedback_events(
            feedback_id, actor_id, event_type, from_value, to_value, metadata
        ) values (
            p_feedback_id, v_actor, 'status_changed', v_from_status, 'closed',
            jsonb_strip_nulls(jsonb_build_object('withdrawn', true, 'reason', p_reason))
        );
        v_response := to_jsonb(v_feedback);
    end if;

    insert into public.feedback_rpc_requests(actor_id, operation, idempotency_key, response)
    values (v_actor, 'withdraw', p_idempotency_key, v_response);
    return v_response;
end;
$$;
