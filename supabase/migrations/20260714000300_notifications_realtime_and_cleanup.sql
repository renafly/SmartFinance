-- Prepare notifications for realtime delivery and backend-driven cleanup.
alter publication supabase_realtime add table public.app_notifications;

create index if not exists idx_app_notifications_recipient_read
  on public.app_notifications(recipient_id, read_at desc)
  where read_at is not null;

create or replace function public.purge_read_notifications_older_than(p_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.purge_read_notifications_older_than(integer) from public;
grant execute on function public.purge_read_notifications_older_than(integer) to service_role;
