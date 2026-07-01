create table if not exists public.invitation_email_logs (
	id uuid primary key default gen_random_uuid(),
	household_id uuid not null
		references public.households(id)
		on delete cascade,
	requested_by uuid not null
		references public.profiles(id)
		on delete cascade,
	recipient_email text not null,
	recipient_role household_role not null,
	invite_link text not null,
	provider text not null default 'resend',
	provider_message_id text,
	status text not null check (status in ('queued', 'sent', 'failed')),
	error_message text,
	sent_at timestamptz,
	created_at timestamptz not null default now()
);

create index if not exists idx_invitation_email_logs_household_id
	on public.invitation_email_logs(household_id);

create index if not exists idx_invitation_email_logs_requested_by
	on public.invitation_email_logs(requested_by);

create index if not exists idx_invitation_email_logs_status
	on public.invitation_email_logs(status);

alter table public.invitation_email_logs enable row level security;

create policy "Admins can view invitation email logs"
on public.invitation_email_logs
for select
using (
	public.is_household_admin(household_id, auth.uid())
);

create policy "Admins can insert invitation email logs"
on public.invitation_email_logs
for insert
with check (
	public.is_household_admin(household_id, auth.uid())
	and requested_by = auth.uid()
);

create policy "Admins can update invitation email logs"
on public.invitation_email_logs
for update
using (
	public.is_household_admin(household_id, auth.uid())
)
with check (
	public.is_household_admin(household_id, auth.uid())
);
