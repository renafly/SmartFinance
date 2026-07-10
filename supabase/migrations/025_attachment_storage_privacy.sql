-- ============================================================
-- Attachment storage privacy hardening
-- ============================================================

update storage.buckets
set
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
    ]
where id = 'attachments';

create or replace function public.attachment_storage_household_id(p_name text)
returns uuid
language sql
stable
set search_path = public, storage, pg_temp
as $$
    select case
        when (storage.foldername(p_name))[1] = 'households'
         and (storage.foldername(p_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         and (storage.foldername(p_name))[3] = 'transactions'
        then ((storage.foldername(p_name))[2])::uuid
        else null
    end;
$$;

create or replace function public.attachment_storage_transaction_id(p_name text)
returns uuid
language sql
stable
set search_path = public, storage, pg_temp
as $$
    select case
        when (storage.foldername(p_name))[1] = 'households'
         and (storage.foldername(p_name))[3] = 'transactions'
         and (storage.foldername(p_name))[4] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((storage.foldername(p_name))[4])::uuid
        else null
    end;
$$;

drop policy if exists "Members can upload attachments" on storage.objects;
drop policy if exists "Members can view attachments" on storage.objects;
drop policy if exists "Members can delete attachments" on storage.objects;

create policy "Members can upload attachment files"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'attachments'
    and public.attachment_storage_household_id(name) is not null
    and public.attachment_storage_transaction_id(name) is not null
    and exists (
        select 1
        from public.transactions t
        where t.id = public.attachment_storage_transaction_id(name)
          and t.household_id = public.attachment_storage_household_id(name)
          and public.is_household_member(t.household_id, auth.uid())
    )
);

create policy "Members can read attachment files"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'attachments'
    and public.attachment_storage_household_id(name) is not null
    and exists (
        select 1
        from public.transactions t
        where t.id = public.attachment_storage_transaction_id(name)
          and t.household_id = public.attachment_storage_household_id(name)
          and public.is_household_member(t.household_id, auth.uid())
    )
);

create policy "Members can delete attachment files"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'attachments'
    and public.attachment_storage_household_id(name) is not null
    and exists (
        select 1
        from public.transactions t
        where t.id = public.attachment_storage_transaction_id(name)
          and t.household_id = public.attachment_storage_household_id(name)
          and public.is_household_member(t.household_id, auth.uid())
    )
);
