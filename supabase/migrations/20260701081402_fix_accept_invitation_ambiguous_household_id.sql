drop function if exists public.accept_household_invitation(text);

create function public.accept_household_invitation(
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
		raise exception 'Profile not found for authenticated user.';
	end if;

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
