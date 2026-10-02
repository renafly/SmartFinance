-- Persistent in-app notifications plus native Expo push-device registrations.
create table public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  source_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_app_notifications_recipient_created
  on public.app_notifications(recipient_id, created_at desc);
create index idx_app_notifications_recipient_unread
  on public.app_notifications(recipient_id, created_at desc)
  where read_at is null;

alter table public.app_notifications enable row level security;

create policy "Users can view their notifications"
on public.app_notifications for select to authenticated
using (recipient_id = auth.uid());

create policy "Users can mark their notifications read"
on public.app_notifications for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

revoke all on public.app_notifications from anon, authenticated;
grant select on public.app_notifications to authenticated;
grant update (read_at) on public.app_notifications to authenticated;

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_push_devices_user on public.push_devices(user_id);

create trigger set_push_devices_updated_at
before update on public.push_devices
for each row execute function public.update_updated_at();

alter table public.push_devices enable row level security;

create policy "Users manage their own push devices"
on public.push_devices for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on public.push_devices from anon;
grant select, insert, update, delete on public.push_devices to authenticated;
