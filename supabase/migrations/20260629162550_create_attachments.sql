-- ============================================================
-- Attachments
-- ============================================================

create table public.attachments (

    id uuid primary key default gen_random_uuid(),

    transaction_id uuid not null
        references public.transactions(id)
        on delete cascade,

    storage_path text not null,

    file_name text not null,

    mime_type text not null,

    file_size bigint not null
        check (file_size > 0),

    uploaded_by uuid not null
        references public.profiles(id)
        on delete restrict,

    created_at timestamptz not null default now()
);

comment on table public.attachments is
'Metadata for files stored in Supabase Storage.';

create index idx_attachments_transaction
on public.attachments(transaction_id);

create index idx_attachments_uploaded_by
on public.attachments(uploaded_by);