-- ============================================================
-- Invitation Token Response RPCs
-- ============================================================

create or replace function public.list_my_household_invitations()
returns table (
	id uuid,
	household_id uuid,
	household_name text,
	email text,
	role household_role,
	token text,
	expires_at timestamptz,
	created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_email text;
begin
	if v_user_id is null then
		raise exception 'You must be authenticated to list invitations.';
	end if;

	select p.email into v_email
	from public.profiles p
	where p.id = v_user_id;

	if v_email is null then
		raise exception 'Profile not found for authenticated user.';
	end if;

	return query
	select
		hi.id,
		hi.household_id,
		h.name as household_name,
		hi.email,
		hi.role,
		hi.token,
		hi.expires_at,
		hi.created_at
	from public.household_invitations hi
	join public.households h on h.id = hi.household_id
	where lower(hi.email) = lower(v_email)
	  and hi.accepted_at is null
	  and (hi.expires_at is null or hi.expires_at > now())
	order by hi.created_at desc;
end;
$$;

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
	on conflict (household_id, user_id)
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

create or replace function public.decline_household_invitation(
	p_token text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_email text;
	v_deleted integer;
begin
	if v_user_id is null then
		raise exception 'You must be authenticated to decline an invitation.';
	end if;

	select p.email into v_email
	from public.profiles p
	where p.id = v_user_id;

	if v_email is null then
		raise exception 'Profile not found for authenticated user.';
	end if;

	delete from public.household_invitations hi
	where hi.token = p_token
	  and hi.accepted_at is null
	  and lower(hi.email) = lower(v_email);

	get diagnostics v_deleted = row_count;

	return v_deleted > 0;
end;
$$;

revoke all on function public.list_my_household_invitations() from public;
grant execute on function public.list_my_household_invitations() to authenticated;

revoke all on function public.accept_household_invitation(text) from public;
grant execute on function public.accept_household_invitation(text) to authenticated;

revoke all on function public.decline_household_invitation(text) from public;
grant execute on function public.decline_household_invitation(text) to authenticated;
