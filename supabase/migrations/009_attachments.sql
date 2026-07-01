-- ============================================================
-- Attachments
-- ============================================================

create table public.attachments (
    id uuid primary key default gen_random_uuid(),
    transaction_id uuid not null references public.transactions(id) on delete cascade,
    storage_path text not null,
    file_name text not null,
    mime_type text not null,
    file_size bigint not null check (file_size > 0),
    uploaded_by uuid not null references public.profiles(id) on delete restrict,
    created_at timestamptz not null default now()
);

comment on table public.attachments is 'Metadata for files stored in Supabase Storage.';

create index idx_attachments_transaction on public.attachments(transaction_id);
create index idx_attachments_uploaded_by on public.attachments(uploaded_by);

-- ============================================================
-- RLS
-- ============================================================

alter table public.attachments enable row level security;

create policy "Members can view attachments"
on public.attachments
for select
using (
    exists (
        select 1
        from public.transactions t
        where t.id = transaction_id
        and public.is_household_member(t.household_id, auth.uid())
    )
);

create policy "Members can manage attachments"
on public.attachments
for all
using (
    exists (
        select 1
        from public.transactions t
        where t.id = transaction_id
        and public.is_household_member(t.household_id, auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.transactions t
        where t.id = transaction_id
        and public.is_household_member(t.household_id, auth.uid())
    )
);

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
with check (bucket_id = 'attachments');

create policy "Members can view attachments"
on storage.objects
for select
to authenticated
using (bucket_id = 'attachments');

create policy "Members can delete attachments"
on storage.objects
for delete
to authenticated
using (bucket_id = 'attachments');
