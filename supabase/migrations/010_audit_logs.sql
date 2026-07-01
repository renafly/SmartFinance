-- ============================================================
-- Audit Logs
-- ============================================================

create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    -- nullable: on household delete set null so cascade user deletion doesn't error
    household_id uuid references public.households(id) on delete set null,
    profile_id uuid references public.profiles(id) on delete set null,
    table_name text not null,
    record_id uuid not null,
    action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz not null default now()
);

comment on table public.audit_logs is 'Tracks changes made to financial records.';

create index idx_audit_household on public.audit_logs(household_id);
create index idx_audit_profile on public.audit_logs(profile_id);
create index idx_audit_table on public.audit_logs(table_name);
create index idx_audit_record on public.audit_logs(record_id);
create index idx_audit_created_at on public.audit_logs(created_at desc);

-- ============================================================
-- Audit Trigger Function
-- ============================================================

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_household_id uuid := null;
begin

    if tg_table_name = 'households' then
        v_household_id := coalesce(new.id, old.id);

    elsif tg_table_name in (
        'accounts', 'categories', 'transactions',
        'recurring_transactions', 'saving_pots'
    ) then
        v_household_id := coalesce(new.household_id, old.household_id);

    elsif tg_table_name = 'attachments' then
        select t.household_id into v_household_id
        from public.transactions t
        where t.id = coalesce(new.transaction_id, old.transaction_id);

    else
        return coalesce(new, old);
    end if;

    begin
        insert into public.audit_logs (
            household_id, profile_id, table_name,
            record_id, action, old_data, new_data
        )
        values (
            v_household_id, auth.uid(), tg_table_name,
            coalesce(new.id, old.id), tg_op,
            to_jsonb(old), to_jsonb(new)
        );
    exception when foreign_key_violation then
        -- Household already deleted (cascade); record with null household_id
        insert into public.audit_logs (
            household_id, profile_id, table_name,
            record_id, action, old_data, new_data
        )
        values (
            null, auth.uid(), tg_table_name,
            coalesce(new.id, old.id), tg_op,
            to_jsonb(old), to_jsonb(new)
        );
    end;

    return coalesce(new, old);

end;
$$;

-- ============================================================
-- Audit Triggers
-- ============================================================

create trigger audit_accounts
after insert or update or delete on public.accounts
for each row execute function public.audit_trigger();

create trigger audit_categories
after insert or update or delete on public.categories
for each row execute function public.audit_trigger();

create trigger audit_transactions
after insert or update or delete on public.transactions
for each row execute function public.audit_trigger();

create trigger audit_saving_pots
after insert or update or delete on public.saving_pots
for each row execute function public.audit_trigger();

create trigger audit_recurring_transactions
after insert or update or delete on public.recurring_transactions
for each row execute function public.audit_trigger();

create trigger audit_attachments
after insert or update or delete on public.attachments
for each row execute function public.audit_trigger();

-- ============================================================
-- RLS
-- ============================================================

alter table public.audit_logs enable row level security;

create policy "Members can view audit logs"
on public.audit_logs
for select
using (
    public.is_household_member(household_id, auth.uid())
);
