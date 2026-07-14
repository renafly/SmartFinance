-- Allow authenticated users to create notifications for themselves.
create policy "Users can create their own notifications"
on public.app_notifications for insert to authenticated
with check (recipient_id = auth.uid());

grant insert on public.app_notifications to authenticated;
