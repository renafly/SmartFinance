-- ============================================================
-- SmartFinance baseline 09/09 -- Supabase platform objects
-- ============================================================
-- Everything that lives outside the public schema or depends on Supabase
-- platform extensions: pg_cron / pg_net / Vault, the auth.users signup
-- trigger, storage buckets + their RLS policies, the realtime publication
-- and the scheduled jobs. These are the final state of the historical
-- migrations (archived in supabase/migrations_archive/).
--
-- Vault secrets (project URL, service-role key used by the notification
-- and feedback dispatchers) are NOT created here -- they are project
-- secrets. Re-create them in the Supabase dashboard (Vault) after a reset;
-- see the names read by public.enqueue_pending_notification_pushes and
-- public.dispatch_feedback_retention_cleanup.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- ---------------------------------------------------------------
-- Auth: create a profile (and optionally a household) on signup
-- ---------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Storage buckets (private) and object policies
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('attachments', 'attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('feedback-screenshots', 'feedback-screenshots', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authors can replace feedback screenshots" on storage.objects;
drop policy if exists "Authors can upload feedback screenshots" on storage.objects;
drop policy if exists "Members can delete attachment files" on storage.objects;
drop policy if exists "Members can read attachment files" on storage.objects;
drop policy if exists "Members can upload attachment files" on storage.objects;
drop policy if exists "Participants can delete feedback screenshots" on storage.objects;
drop policy if exists "Participants can read feedback screenshots" on storage.objects;

create policy "Authors can replace feedback screenshots"
on storage.objects
as permissive
for update
to authenticated
using (((bucket_id = 'feedback-screenshots'::text) AND (public.feedback_storage_author_id(name) = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.app_feedback f
  WHERE ((f.id = public.feedback_storage_feedback_id(objects.name)) AND (f.user_id = auth.uid()) AND (f.status <> ALL (ARRAY['resolved'::text, 'closed'::text, 'rejected'::text, 'withdrawn'::text])))))))
with check (((bucket_id = 'feedback-screenshots'::text) AND (public.feedback_storage_author_id(name) = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.app_feedback f
  WHERE ((f.id = public.feedback_storage_feedback_id(objects.name)) AND (f.user_id = auth.uid()) AND (f.status <> ALL (ARRAY['resolved'::text, 'closed'::text, 'rejected'::text, 'withdrawn'::text])))))));

create policy "Authors can upload feedback screenshots"
on storage.objects
as permissive
for insert
to authenticated
with check (((bucket_id = 'feedback-screenshots'::text) AND (public.feedback_storage_author_id(name) = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.app_feedback f
  WHERE ((f.id = public.feedback_storage_feedback_id(objects.name)) AND (f.user_id = auth.uid()) AND (f.status <> ALL (ARRAY['resolved'::text, 'rejected'::text, 'withdrawn'::text])))))));

create policy "Members can delete attachment files"
on storage.objects
as permissive
for delete
to authenticated
using (((bucket_id = 'attachments'::text) AND (public.attachment_storage_household_id(name) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.transactions t
  WHERE ((t.id = public.attachment_storage_transaction_id(objects.name)) AND (t.household_id = public.attachment_storage_household_id(objects.name)) AND public.is_household_member(t.household_id, auth.uid()))))));

create policy "Members can read attachment files"
on storage.objects
as permissive
for select
to authenticated
using (((bucket_id = 'attachments'::text) AND (public.attachment_storage_household_id(name) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.transactions t
  WHERE ((t.id = public.attachment_storage_transaction_id(objects.name)) AND (t.household_id = public.attachment_storage_household_id(objects.name)) AND public.is_household_member(t.household_id, auth.uid()))))));

create policy "Members can upload attachment files"
on storage.objects
as permissive
for insert
to authenticated
with check (((bucket_id = 'attachments'::text) AND (public.attachment_storage_household_id(name) IS NOT NULL) AND (public.attachment_storage_transaction_id(name) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.transactions t
  WHERE ((t.id = public.attachment_storage_transaction_id(objects.name)) AND (t.household_id = public.attachment_storage_household_id(objects.name)) AND public.is_household_member(t.household_id, auth.uid()))))));

create policy "Participants can delete feedback screenshots"
on storage.objects
as permissive
for delete
to authenticated
using (((bucket_id = 'feedback-screenshots'::text) AND (public.is_platform_admin() OR ((public.feedback_storage_author_id(name) = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.app_feedback f
  WHERE ((f.id = public.feedback_storage_feedback_id(objects.name)) AND (f.user_id = auth.uid()) AND (f.status <> ALL (ARRAY['resolved'::text, 'rejected'::text, 'withdrawn'::text])))))))));

create policy "Participants can read feedback screenshots"
on storage.objects
as permissive
for select
to authenticated
using (((bucket_id = 'feedback-screenshots'::text) AND (public.is_platform_admin() OR ((public.feedback_storage_author_id(name) = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.app_feedback f
  WHERE ((f.id = public.feedback_storage_feedback_id(objects.name)) AND (f.user_id = auth.uid()))))))));

-- ---------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------
alter publication supabase_realtime add table
  public.app_notifications,
  public.app_feedback,
  public.feedback_attachments,
  public.feedback_messages,
  public.feedback_events;

-- ---------------------------------------------------------------
-- Scheduled jobs (pg_cron)
-- ---------------------------------------------------------------
select cron.schedule('purge-soft-deleted-budget-rules-weekly', '30 3 * * 6', $$select public.purge_soft_deleted_budget_rules()$$);
select cron.schedule('retry-notification-pushes', '* * * * *', $$select public.enqueue_pending_notification_pushes(100);$$);
select cron.schedule('purge-approved-notifications', '17 3 * * *', $$select public.purge_read_notifications_older_than(30);$$);
select cron.schedule('purge-feedback-retention', '43 3 * * *', $$select public.dispatch_feedback_retention_cleanup();$$);
