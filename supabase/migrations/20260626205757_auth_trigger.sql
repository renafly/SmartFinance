create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    new_household_id uuid;
begin

    -- Criar perfil do utilizador
    insert into public.users (
        id,
        email,
        full_name,
        avatar_url
    )
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );

    -- Criar Household
    insert into public.households (
        name,
        owner_id
    )
    values (
        concat(
            coalesce(new.raw_user_meta_data->>'full_name', 'My'),
            '''s Household'
        ),
        new.id
    )
    returning id
    into new_household_id;

    -- Adicionar Owner
    insert into public.household_members (
        household_id,
        user_id,
        role,
        status
    )
    values (
        new_household_id,
        new.id,
        'owner',
        'accepted'
    );

    return new;

end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();