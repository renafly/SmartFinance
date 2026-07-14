-- Add soft-delete support for notifications and allow users to remove their own rows.
alter table public.app_notifications
  add column if not exists deleted_at timestamptz;

create policy "Users can delete their own notifications"
on public.app_notifications for delete to authenticated
using (recipient_id = auth.uid());

grant update (read_at, deleted_at) on public.app_notifications to authenticated;
grant delete on public.app_notifications to authenticated;
