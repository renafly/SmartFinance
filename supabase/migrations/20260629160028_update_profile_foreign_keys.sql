-- Households

alter table public.households
drop constraint households_owner_id_fkey;

alter table public.households
add constraint households_owner_id_fkey
foreign key (owner_id)
references public.profiles(id)
on delete cascade;

-- Household Members

alter table public.household_members
drop constraint household_members_user_id_fkey;

alter table public.household_members
add constraint household_members_user_id_fkey
foreign key (user_id)
references public.profiles(id)
on delete cascade;