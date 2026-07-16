-- Browser subscriptions and idempotent delivery state for backend push dispatch.
create table public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  user_agent text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_web_push_subscriptions_user
  on public.web_push_subscriptions(user_id);

create trigger set_web_push_subscriptions_updated_at
before update on public.web_push_subscriptions
for each row execute function public.update_updated_at();

alter table public.web_push_subscriptions enable row level security;

create policy "Users manage their own web push subscriptions"
on public.web_push_subscriptions for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on public.web_push_subscriptions from anon;
grant select, insert, update, delete on public.web_push_subscriptions to authenticated;

alter table public.app_notifications
  add column if not exists push_dispatch_status text not null default 'pending'
    check (push_dispatch_status in ('pending', 'processing', 'delivered')),
  add column if not exists push_dispatch_attempted_at timestamptz,
  add column if not exists native_push_dispatched_at timestamptz,
  add column if not exists web_push_dispatched_at timestamptz,
  add column if not exists push_dispatched_at timestamptz;

-- Existing inbox history must not be pushed when this migration is first applied.
update public.app_notifications
set push_dispatch_status = 'delivered',
    native_push_dispatched_at = coalesce(native_push_dispatched_at, created_at),
    web_push_dispatched_at = coalesce(web_push_dispatched_at, created_at),
    push_dispatched_at = coalesce(push_dispatched_at, created_at)
where push_dispatched_at is null;

create index idx_app_notifications_pending_push
  on public.app_notifications(created_at)
  where push_dispatch_status = 'pending';

-- The trigger becomes active after the deployment stores both named secrets in Vault.
-- This keeps project URLs and webhook credentials out of source control.
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.dispatch_app_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
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

revoke all on function public.dispatch_app_notification_push() from public;

drop trigger if exists dispatch_app_notification_push on public.app_notifications;
create trigger dispatch_app_notification_push
after insert on public.app_notifications
for each row execute function public.dispatch_app_notification_push();
