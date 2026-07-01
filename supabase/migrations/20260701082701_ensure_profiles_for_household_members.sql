-- Backfill missing public.profiles rows for users that already exist as household members.
insert into public.profiles (
	id,
	email,
	full_name,
	avatar_url
)
select
	au.id,
	coalesce(au.email, au.id::text || '@local.invalid') as email,
	coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name') as full_name,
	au.raw_user_meta_data->>'avatar_url' as avatar_url
from public.household_members hm
join auth.users au on au.id = hm.user_id
left join public.profiles p on p.id = hm.user_id
where p.id is null
on conflict (id) do nothing;

-- Ensure accepting an invitation always has a profile row so member queries can join profile data.
create or replace function public.accept_household_invitation(
	p_token text
)
returns table (
	household_id uuid,
	role household_role
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_email text;
	v_invite public.household_invitations%rowtype;
begin
	if v_user_id is null then
		raise exception 'You must be authenticated to accept an invitation.';
	end if;

	select p.email into v_email
	from public.profiles p
	where p.id = v_user_id;

	if v_email is null then
		select coalesce(au.email, au.id::text || '@local.invalid')
		into v_email
		from auth.users au
		where au.id = v_user_id;
	end if;

	if v_email is null then
		raise exception 'Profile/email not found for authenticated user.';
	end if;

	insert into public.profiles (
		id,
		email,
		full_name,
		avatar_url
	)
	select
		au.id,
		coalesce(au.email, au.id::text || '@local.invalid') as email,
		coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name') as full_name,
		au.raw_user_meta_data->>'avatar_url' as avatar_url
	from auth.users au
	where au.id = v_user_id
	on conflict (id) do nothing;

	select hi.* into v_invite
	from public.household_invitations hi
	where hi.token = p_token
	  and hi.accepted_at is null
	  and (hi.expires_at is null or hi.expires_at > now())
	limit 1
	for update;

	if not found then
		raise exception 'Invitation not found or expired.';
	end if;

	if lower(v_invite.email) <> lower(v_email) then
		raise exception 'This invitation does not belong to your account email.';
	end if;

	insert into public.household_members (
		household_id,
		user_id,
		role,
		status,
		joined_at
	)
	values (
		v_invite.household_id,
		v_user_id,
		v_invite.role,
		'accepted',
		now()
	)
	on conflict on constraint household_members_pkey
	do update
	set
		role = excluded.role,
		status = 'accepted',
		joined_at = coalesce(public.household_members.joined_at, now());

	update public.household_invitations
	set accepted_at = now()
	where id = v_invite.id;

	return query
	select v_invite.household_id, v_invite.role;
end;
$$;

revoke all on function public.accept_household_invitation(text) from public;
grant execute on function public.accept_household_invitation(text) to authenticated;

create policy "Members can view household profiles"
on public.profiles
for select
using (
		auth.uid() = id
		or exists (
				select 1
				from public.household_members hm_viewer
				join public.household_members hm_target
					on hm_target.household_id = hm_viewer.household_id
				 and hm_target.status = 'accepted'
				where hm_viewer.user_id = auth.uid()
					and hm_viewer.status = 'accepted'
					and hm_target.user_id = profiles.id
		)
);
