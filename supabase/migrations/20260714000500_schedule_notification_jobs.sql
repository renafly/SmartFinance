-- Retry transient push failures every minute and purge approved notifications daily.
create extension if not exists pg_cron;

create or replace function public.enqueue_pending_notification_pushes(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
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

revoke all on function public.enqueue_pending_notification_pushes(integer) from public;

do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'retry-notification-pushes';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
  select jobid into v_job_id from cron.job where jobname = 'purge-approved-notifications';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end $$;

select cron.schedule(
  'retry-notification-pushes',
  '* * * * *',
  $$select public.enqueue_pending_notification_pushes(100);$$
);

select cron.schedule(
  'purge-approved-notifications',
  '17 3 * * *',
  $$select public.purge_read_notifications_older_than(30);$$
);
