-- ============================================================
-- Storage Bucket
-- ============================================================

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'attachments',
    'attachments',
    false,
    10485760, -- 10 MB
    array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
    ]
)
on conflict (id) do nothing;

-- ============================================================
-- Storage Policies
-- ============================================================

create policy "Members can upload attachments"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'attachments'
);

create policy "Members can view attachments"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'attachments'
);

create policy "Members can delete attachments"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'attachments'
);