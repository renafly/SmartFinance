-- ============================================================
-- Secure product feedback, support workflow, and email outbox
-- ============================================================

create table public.platform_admins (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    role text not null default 'support'
        check (role in ('support', 'admin', 'super_admin')),
    is_active boolean not null default true,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.platform_admins is
    'Platform-wide support administrators. Membership is managed only by service_role/database operators.';

create table public.app_releases (
    id uuid primary key default gen_random_uuid(),
    version text not null,
    build_number text not null default 'unknown',
    channel text not null default 'production'
        check (channel in ('development', 'preview', 'production')),
    commit_sha text,
    platform text not null default 'all'
        check (platform in ('all', 'android', 'ios', 'web')),
    status text not null default 'draft'
        check (status in ('draft', 'published', 'withdrawn')),
    title text,
    release_notes text,
    is_active boolean not null default false,
    released_at timestamptz,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (version, build_number, platform),
    check (char_length(btrim(version)) between 1 and 64),
    check (char_length(btrim(build_number)) between 1 and 64),
    check (title is null or char_length(btrim(title)) between 1 and 160),
    check (release_notes is null or char_length(release_notes) <= 20000),
    check (status <> 'published' or released_at is not null)
);

create table public.app_feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    category text not null
        check (category in ('bug', 'feature_request', 'feature', 'improvement', 'question', 'other')),
    title text not null,
    description text not null,
    status text not null default 'submitted'
        check (status in (
            'submitted', 'under_review', 'planned', 'in_progress', 'resolved', 'closed',
            'triaged', 'waiting_for_user', 'rejected', 'withdrawn'
        )),
    priority text not null default 'normal'
        check (priority in ('low', 'normal', 'high', 'urgent')),
    assigned_to uuid references public.platform_admins(user_id) on delete set null,
    resolved_in_release_id uuid references public.app_releases(id) on delete set null,
    app_version text,
    platform text check (platform is null or platform in ('android', 'ios', 'web')),
    app_context jsonb not null default '{}'::jsonb,
    idempotency_key text not null,
    withdrawn_at timestamptz,
    resolved_at timestamptz,
    closed_at timestamptz,
    last_activity_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, idempotency_key),
    check (char_length(btrim(title)) between 1 and 160),
    check (char_length(btrim(description)) between 1 and 10000),
    check (app_version is null or char_length(btrim(app_version)) between 1 and 64),
    check (jsonb_typeof(app_context) = 'object'),
    check (octet_length(app_context::text) <= 16384),
    check (char_length(idempotency_key) between 8 and 128),
    check (withdrawn_at is null or status in ('withdrawn', 'closed')),
    check (status = 'resolved' or resolved_at is null)
);

create index idx_app_feedback_author_created
    on public.app_feedback(user_id, created_at desc);
create index idx_app_feedback_admin_queue
    on public.app_feedback(status, priority, created_at)
    where status not in ('resolved', 'rejected', 'withdrawn');
create index idx_app_feedback_assignee
    on public.app_feedback(assigned_to, status)
    where assigned_to is not null;

create table public.feedback_attachments (
    id uuid primary key default gen_random_uuid(),
    feedback_id uuid not null references public.app_feedback(id) on delete cascade,
    message_id uuid,
    uploaded_by uuid not null references public.profiles(id) on delete cascade,
    storage_path text not null unique,
    file_name text not null,
    mime_type text not null
        check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
    file_size bigint not null check (file_size between 1 and 10485760),
    width integer check (width is null or width between 1 and 20000),
    height integer check (height is null or height between 1 and 20000),
    created_at timestamptz not null default now(),
    check (char_length(file_name) between 1 and 255),
    check (char_length(storage_path) between 10 and 1024)
);

create index idx_feedback_attachments_feedback
    on public.feedback_attachments(feedback_id, created_at);

create table public.feedback_messages (
    id uuid primary key default gen_random_uuid(),
    feedback_id uuid not null references public.app_feedback(id) on delete cascade,
    author_id uuid not null references public.profiles(id) on delete cascade,
    message_type text not null default 'reply'
        check (message_type in ('reply', 'internal_note')),
    is_admin_reply boolean not null default false,
    body text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    edited_at timestamptz,
    check (char_length(btrim(body)) between 1 and 5000),
    check (edited_at is null or edited_at >= created_at)
);

create index idx_feedback_messages_feedback_created
    on public.feedback_messages(feedback_id, created_at);

alter table public.feedback_attachments
    add constraint feedback_attachments_message_id_fkey
    foreign key (message_id) references public.feedback_messages(id) on delete cascade;

create table public.feedback_events (
    id uuid primary key default gen_random_uuid(),
    feedback_id uuid not null references public.app_feedback(id) on delete cascade,
    actor_id uuid references public.profiles(id) on delete set null,
    event_type text not null
        check (event_type in (
            'submitted', 'author_updated', 'withdrawn', 'status_changed',
            'admin_updated', 'reply_added', 'internal_note_added',
            'attachment_added', 'attachment_removed', 'priority_changed',
            'assigned', 'message_added', 'attachment_deleted'
        )),
    from_value text,
    to_value text,
    metadata jsonb not null default '{}'::jsonb,
    visible_to_author boolean not null default true,
    created_at timestamptz not null default now(),
    check (jsonb_typeof(metadata) = 'object'),
    check (octet_length(metadata::text) <= 16384)
);

create index idx_feedback_events_feedback_created
    on public.feedback_events(feedback_id, created_at);

-- RPC results make retried mobile requests deterministic without duplicating side effects.
create table public.feedback_rpc_requests (
    actor_id uuid not null references public.profiles(id) on delete cascade,
    operation text not null,
    idempotency_key text not null,
    response jsonb not null,
    created_at timestamptz not null default now(),
    primary key (actor_id, operation, idempotency_key),
    check (char_length(operation) between 1 and 64),
    check (char_length(idempotency_key) between 8 and 128),
    check (jsonb_typeof(response) = 'object')
);

create index idx_feedback_rpc_requests_created
    on public.feedback_rpc_requests(created_at);

create table public.feedback_rate_limit_events (
    id bigint generated always as identity primary key,
    actor_id uuid not null references public.profiles(id) on delete cascade,
    action text not null,
    created_at timestamptz not null default now(),
    check (char_length(action) between 1 and 64)
);

create index idx_feedback_rate_limit_lookup
    on public.feedback_rate_limit_events(actor_id, action, created_at desc);

create table public.feedback_email_outbox (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references public.profiles(id) on delete cascade,
    recipient_email text not null,
    template text not null,
    payload jsonb not null default '{}'::jsonb,
    source_key text not null unique,
    status text not null default 'pending'
        check (status in ('pending', 'processing', 'retry', 'sent', 'dead')),
    attempt_count integer not null default 0 check (attempt_count between 0 and 100),
    available_at timestamptz not null default now(),
    locked_at timestamptz,
    locked_by text,
    sent_at timestamptz,
    last_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (position('@' in recipient_email) > 1),
    check (char_length(template) between 1 and 80),
    check (char_length(source_key) between 8 and 255),
    check (jsonb_typeof(payload) = 'object'),
    check (octet_length(payload::text) <= 32768),
    check (status = 'sent' or sent_at is null)
);

create index idx_feedback_email_outbox_ready
    on public.feedback_email_outbox(available_at, created_at)
    where status in ('pending', 'retry');
create index idx_feedback_email_outbox_stale_lock
    on public.feedback_email_outbox(locked_at)
    where status = 'processing';

create table public.feedback_email_attempts (
    id bigint generated always as identity primary key,
    outbox_id uuid not null references public.feedback_email_outbox(id) on delete cascade,
    attempt_number integer not null check (attempt_number > 0),
    succeeded boolean not null,
    provider_message_id text,
    error_code text,
    error_message text,
    provider_response jsonb not null default '{}'::jsonb,
    attempted_at timestamptz not null default now(),
    unique (outbox_id, attempt_number),
    check (jsonb_typeof(provider_response) = 'object'),
    check (octet_length(provider_response::text) <= 32768)
);

create index idx_feedback_email_attempts_outbox
    on public.feedback_email_attempts(outbox_id, attempted_at desc);

create trigger set_app_releases_updated_at
before update on public.app_releases
for each row execute function public.update_updated_at();

create trigger set_platform_admins_updated_at
before update on public.platform_admins
for each row execute function public.update_updated_at();

create trigger set_app_feedback_updated_at
before update on public.app_feedback
for each row execute function public.update_updated_at();

create trigger set_feedback_messages_updated_at
before update on public.feedback_messages
for each row execute function public.update_updated_at();

create trigger set_feedback_email_outbox_updated_at
before update on public.feedback_email_outbox
for each row execute function public.update_updated_at();

-- ============================================================
-- Authorization helpers and RLS
-- ============================================================

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
          and pa.is_active
    );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

alter table public.platform_admins enable row level security;
alter table public.app_releases enable row level security;
alter table public.app_feedback enable row level security;
alter table public.feedback_attachments enable row level security;
alter table public.feedback_messages enable row level security;
alter table public.feedback_events enable row level security;
alter table public.feedback_rpc_requests enable row level security;
alter table public.feedback_rate_limit_events enable row level security;
alter table public.feedback_email_outbox enable row level security;
alter table public.feedback_email_attempts enable row level security;

create policy "Platform admins can view admin directory"
on public.platform_admins for select to authenticated
using (public.is_platform_admin());

create policy "Authenticated users can view published releases"
on public.app_releases for select to authenticated
using (is_active or public.is_platform_admin());

create policy "Authors and admins can view feedback"
on public.app_feedback for select to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

create policy "Authors and admins can view feedback attachments"
on public.feedback_attachments for select to authenticated
using (
    public.is_platform_admin()
    or exists (
        select 1 from public.app_feedback f
        where f.id = feedback_id and f.user_id = auth.uid()
    )
);

create policy "Participants can view feedback messages"
on public.feedback_messages for select to authenticated
using (
    public.is_platform_admin()
    or (
        message_type = 'reply'
        and exists (
            select 1 from public.app_feedback f
            where f.id = feedback_id and f.user_id = auth.uid()
        )
    )
);

create policy "Participants can view feedback events"
on public.feedback_events for select to authenticated
using (
    public.is_platform_admin()
    or (
        visible_to_author
        and exists (
            select 1 from public.app_feedback f
            where f.id = feedback_id and f.user_id = auth.uid()
        )
    )
);

revoke all on table public.platform_admins from anon, authenticated;
revoke all on table public.app_releases from anon, authenticated;
revoke all on table public.app_feedback from anon, authenticated;
revoke all on table public.feedback_attachments from anon, authenticated;
revoke all on table public.feedback_messages from anon, authenticated;
revoke all on table public.feedback_events from anon, authenticated;
revoke all on table public.feedback_rpc_requests from anon, authenticated;
revoke all on table public.feedback_rate_limit_events from anon, authenticated;
revoke all on table public.feedback_email_outbox from anon, authenticated;
revoke all on table public.feedback_email_attempts from anon, authenticated;

grant select on table public.platform_admins to authenticated;
grant select on table public.app_releases to authenticated;
grant select on table public.app_feedback to authenticated;
grant select on table public.feedback_attachments to authenticated;
grant select on table public.feedback_messages to authenticated;
grant select on table public.feedback_events to authenticated;
grant select, insert, update, delete on table public.platform_admins to service_role;

-- ============================================================
-- Private screenshot bucket
-- Canonical path: {author_id}/{feedback_id}/{opaque-filename}
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'feedback-screenshots',
    'feedback-screenshots',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.feedback_storage_author_id(p_name text)
returns uuid
language sql
stable
set search_path = public, storage, pg_temp
as $$
    select case
        when cardinality(storage.foldername(p_name)) = 3
         and (storage.foldername(p_name))[1]
             ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((storage.foldername(p_name))[1])::uuid
        else null
    end;
$$;

create or replace function public.feedback_storage_feedback_id(p_name text)
returns uuid
language sql
stable
set search_path = public, storage, pg_temp
as $$
    select case
        when cardinality(storage.foldername(p_name)) = 3
         and (storage.foldername(p_name))[2]
             ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((storage.foldername(p_name))[2])::uuid
        else null
    end;
$$;

revoke all on function public.feedback_storage_author_id(text) from public;
revoke all on function public.feedback_storage_feedback_id(text) from public;
grant execute on function public.feedback_storage_author_id(text) to authenticated;
grant execute on function public.feedback_storage_feedback_id(text) to authenticated;

create policy "Authors can upload feedback screenshots"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'feedback-screenshots'
    and public.feedback_storage_author_id(name) = auth.uid()
    and exists (
        select 1
        from public.app_feedback f
        where f.id = public.feedback_storage_feedback_id(name)
          and f.user_id = auth.uid()
          and f.status not in ('resolved', 'rejected', 'withdrawn')
    )
);

create policy "Participants can read feedback screenshots"
on storage.objects for select to authenticated
using (
    bucket_id = 'feedback-screenshots'
    and (
        public.is_platform_admin()
        or (
            public.feedback_storage_author_id(name) = auth.uid()
            and exists (
                select 1
                from public.app_feedback f
                where f.id = public.feedback_storage_feedback_id(name)
                  and f.user_id = auth.uid()
            )
        )
    )
);

create policy "Authors can replace feedback screenshots"
on storage.objects for update to authenticated
using (
    bucket_id = 'feedback-screenshots'
    and public.feedback_storage_author_id(name) = auth.uid()
    and exists (
        select 1
        from public.app_feedback f
        where f.id = public.feedback_storage_feedback_id(name)
          and f.user_id = auth.uid()
          and f.status not in ('resolved', 'closed', 'rejected', 'withdrawn')
    )
)
with check (
    bucket_id = 'feedback-screenshots'
    and public.feedback_storage_author_id(name) = auth.uid()
    and exists (
        select 1
        from public.app_feedback f
        where f.id = public.feedback_storage_feedback_id(name)
          and f.user_id = auth.uid()
          and f.status not in ('resolved', 'closed', 'rejected', 'withdrawn')
    )
);

create policy "Participants can delete feedback screenshots"
on storage.objects for delete to authenticated
using (
    bucket_id = 'feedback-screenshots'
    and (
        public.is_platform_admin()
        or (
            public.feedback_storage_author_id(name) = auth.uid()
            and exists (
                select 1
                from public.app_feedback f
                where f.id = public.feedback_storage_feedback_id(name)
                  and f.user_id = auth.uid()
                  and f.status not in ('resolved', 'rejected', 'withdrawn')
            )
        )
    )
);

-- ============================================================
-- Internal helpers
-- ============================================================

create or replace function public.assert_feedback_idempotency_key(p_key text)
returns void
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
    if p_key is null
       or char_length(p_key) not between 8 and 128
       or p_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' then
        raise exception 'Invalid idempotency key' using errcode = '22023';
    end if;
end;
$$;

create or replace function public.consume_feedback_rate_limit(
    p_actor_id uuid,
    p_action text,
    p_limit integer,
    p_window interval
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.queue_feedback_email(
    p_recipient_id uuid,
    p_template text,
    p_payload jsonb,
    p_source_key text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.notify_feedback_recipient(
    p_recipient_id uuid,
    p_type text,
    p_title text,
    p_body text,
    p_data jsonb,
    p_source_key text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

revoke all on function public.assert_feedback_idempotency_key(text) from public;
revoke all on function public.consume_feedback_rate_limit(uuid, text, integer, interval) from public;
revoke all on function public.queue_feedback_email(uuid, text, jsonb, text) from public;
revoke all on function public.notify_feedback_recipient(uuid, text, text, text, jsonb, text) from public;

-- ============================================================
-- Author RPCs
-- ============================================================

create or replace function public.submit_app_feedback(
    p_idempotency_key text,
    p_category text,
    p_title text,
    p_description text,
    p_app_version text default null,
    p_platform text default null,
    p_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.update_app_feedback(
    p_feedback_id uuid,
    p_idempotency_key text,
    p_title text default null,
    p_description text default null,
    p_category text default null,
    p_app_version text default null,
    p_platform text default null,
    p_context jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.withdraw_app_feedback(
    p_feedback_id uuid,
    p_idempotency_key text,
    p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

-- ============================================================
-- Reply and attachment RPCs
-- ============================================================

create or replace function public.add_feedback_reply(
    p_feedback_id uuid,
    p_idempotency_key text,
    p_body text,
    p_internal boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.register_feedback_attachment(
    p_feedback_id uuid,
    p_idempotency_key text,
    p_storage_path text,
    p_original_filename text,
    p_mime_type text,
    p_size_bytes bigint,
    p_width integer default null,
    p_height integer default null,
    p_message_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
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

create or replace function public.delete_feedback_attachment(
    p_attachment_id uuid,
    p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
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

-- ============================================================
-- Admin workflow RPCs
-- ============================================================

create or replace function public.admin_update_app_feedback(
    p_feedback_id uuid,
    p_idempotency_key text,
    p_status text default null,
    p_priority text default null,
    p_assigned_admin_id uuid default null,
    p_clear_assignment boolean default false,
    p_resolved_in_release_id uuid default null,
    p_clear_release boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.admin_create_app_release(
    p_idempotency_key text,
    p_version text,
    p_platform text default 'all',
    p_status text default 'draft',
    p_title text default null,
    p_release_notes text default null,
    p_released_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.admin_update_app_release(
    p_release_id uuid,
    p_idempotency_key text,
    p_status text default null,
    p_title text default null,
    p_release_notes text default null,
    p_released_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

-- ============================================================
-- Client-contract RPCs
-- These overloads preserve the compact mobile API while delegating to the
-- keyed operations above for authorization, rate limits, and audit events.
-- ============================================================

create or replace function public.submit_app_feedback(
    p_category text,
    p_title text,
    p_description text,
    p_app_context jsonb,
    p_idempotency_key text
)
returns public.app_feedback
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.register_feedback_attachment(
    p_feedback_id uuid,
    p_storage_path text,
    p_file_name text,
    p_mime_type text,
    p_file_size bigint,
    p_message_id uuid default null
)
returns public.feedback_attachments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.delete_feedback_attachment(p_attachment_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.add_feedback_message(p_feedback_id uuid, p_body text)
returns public.feedback_messages
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.admin_update_feedback_status(
    p_feedback_id uuid,
    p_status text
)
returns public.app_feedback
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.admin_set_feedback_priority(
    p_feedback_id uuid,
    p_priority text
)
returns public.app_feedback
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.admin_assign_feedback(
    p_feedback_id uuid,
    p_admin_id uuid
)
returns public.app_feedback
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

-- ============================================================
-- Service-role email delivery and retention
-- ============================================================

create or replace function public.claim_feedback_email_outbox(
    p_limit integer default 25,
    p_worker_id text default null
)
returns setof public.feedback_email_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.record_feedback_email_attempt(
    p_outbox_id uuid,
    p_attempt_number integer,
    p_worker_id text,
    p_succeeded boolean,
    p_provider_message_id text default null,
    p_error_code text default null,
    p_error_message text default null,
    p_provider_response jsonb default '{}'::jsonb,
    p_retry_after interval default interval '5 minutes'
)
returns public.feedback_email_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

create or replace function public.purge_feedback_retention(
    p_withdrawn_days integer default 30,
    p_closed_days integer default 365,
    p_delivery_days integer default 90
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
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

create or replace function public.list_feedback_retention_objects(
    p_withdrawn_days integer default 30,
    p_closed_days integer default 365,
    p_limit integer default 500
)
returns table(storage_path text)
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
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

create or replace function public.dispatch_feedback_retention_cleanup()
returns void
language plpgsql
security definer
set search_path = public, extensions, vault, pg_temp
as $$
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

revoke all on function public.submit_app_feedback(text, text, text, text, text, text, jsonb) from public;
revoke all on function public.update_app_feedback(uuid, text, text, text, text, text, text, jsonb) from public;
revoke all on function public.withdraw_app_feedback(uuid, text, text) from public;
revoke all on function public.add_feedback_reply(uuid, text, text, boolean) from public;
revoke all on function public.register_feedback_attachment(uuid, text, text, text, text, bigint, integer, integer, uuid) from public;
revoke all on function public.delete_feedback_attachment(uuid, text) from public;
revoke all on function public.admin_update_app_feedback(uuid, text, text, text, uuid, boolean, uuid, boolean) from public;
revoke all on function public.admin_create_app_release(text, text, text, text, text, text, timestamptz) from public;
revoke all on function public.admin_update_app_release(uuid, text, text, text, text, timestamptz) from public;
revoke all on function public.claim_feedback_email_outbox(integer, text) from public;
revoke all on function public.record_feedback_email_attempt(uuid, integer, text, boolean, text, text, text, jsonb, interval) from public;
revoke all on function public.purge_feedback_retention(integer, integer, integer) from public;
revoke all on function public.list_feedback_retention_objects(integer, integer, integer) from public;
revoke all on function public.dispatch_feedback_retention_cleanup() from public;
revoke all on function public.submit_app_feedback(text, text, text, jsonb, text) from public;
revoke all on function public.register_feedback_attachment(uuid, text, text, text, bigint, uuid) from public;
revoke all on function public.delete_feedback_attachment(uuid) from public;
revoke all on function public.add_feedback_message(uuid, text) from public;
revoke all on function public.admin_update_feedback_status(uuid, text) from public;
revoke all on function public.admin_set_feedback_priority(uuid, text) from public;
revoke all on function public.admin_assign_feedback(uuid, uuid) from public;

grant execute on function public.submit_app_feedback(text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.update_app_feedback(uuid, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.withdraw_app_feedback(uuid, text, text) to authenticated;
grant execute on function public.add_feedback_reply(uuid, text, text, boolean) to authenticated;
grant execute on function public.register_feedback_attachment(uuid, text, text, text, text, bigint, integer, integer, uuid) to authenticated;
grant execute on function public.delete_feedback_attachment(uuid, text) to authenticated;
grant execute on function public.admin_update_app_feedback(uuid, text, text, text, uuid, boolean, uuid, boolean) to authenticated;
grant execute on function public.admin_create_app_release(text, text, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.admin_update_app_release(uuid, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.claim_feedback_email_outbox(integer, text) to service_role;
grant execute on function public.record_feedback_email_attempt(uuid, integer, text, boolean, text, text, text, jsonb, interval) to service_role;
grant execute on function public.purge_feedback_retention(integer, integer, integer) to service_role;
grant execute on function public.list_feedback_retention_objects(integer, integer, integer) to service_role;
grant execute on function public.submit_app_feedback(text, text, text, jsonb, text) to authenticated;
grant execute on function public.register_feedback_attachment(uuid, text, text, text, bigint, uuid) to authenticated;
grant execute on function public.delete_feedback_attachment(uuid) to authenticated;
grant execute on function public.add_feedback_message(uuid, text) to authenticated;
grant execute on function public.admin_update_feedback_status(uuid, text) to authenticated;
grant execute on function public.admin_set_feedback_priority(uuid, text) to authenticated;
grant execute on function public.admin_assign_feedback(uuid, uuid) to authenticated;

-- Realtime is useful for the author's ticket and message views; RLS still filters rows.
alter publication supabase_realtime add table public.app_feedback;
alter publication supabase_realtime add table public.feedback_attachments;
alter publication supabase_realtime add table public.feedback_messages;
alter publication supabase_realtime add table public.feedback_events;

do $$
declare
    v_job_id bigint;
begin
    select jobid into v_job_id from cron.job where jobname = 'purge-feedback-retention';
    if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end $$;

select cron.schedule(
    'purge-feedback-retention',
    '43 3 * * *',
    $$select public.dispatch_feedback_retention_cleanup();$$
);
