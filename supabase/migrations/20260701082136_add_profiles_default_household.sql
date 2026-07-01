alter table public.profiles
add column if not exists default_household_id uuid;

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'profiles_default_household_id_fkey'
			and conrelid = 'public.profiles'::regclass
	) then
		alter table public.profiles
		add constraint profiles_default_household_id_fkey
			foreign key (default_household_id)
			references public.households(id)
			on delete set null;
	end if;
end $$;

create index if not exists idx_profiles_default_household_id
	on public.profiles(default_household_id);

update public.profiles p
set default_household_id = hm.household_id
from (
	select distinct on (user_id) user_id, household_id
	from public.household_members
	where status = 'accepted'
	order by user_id, joined_at desc nulls last
) hm
where hm.user_id = p.id
	and p.default_household_id is null;

create or replace function public.set_default_household(
	p_household_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
begin
	if v_user_id is null then
		raise exception 'You must be authenticated to set a default household.';
	end if;

	if not exists (
		select 1
		from public.household_members hm
		where hm.user_id = v_user_id
			and hm.household_id = p_household_id
			and hm.status = 'accepted'
	) then
		raise exception 'You are not an accepted member of this household.';
	end if;

	update public.profiles
	set default_household_id = p_household_id
	where id = v_user_id;

	return p_household_id;
end;
$$;

revoke all on function public.set_default_household(uuid) from public;
grant execute on function public.set_default_household(uuid) to authenticated;
