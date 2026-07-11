-- ============================================================
-- Saving-pot account exclusivity
-- ============================================================
-- A saving pot is a goal backed only by its explicitly selected accounts.
-- Accounts cannot contribute to more than one pot.

do $$
declare
    v_duplicate_accounts text;
    v_unassigned_pots text;
    v_cross_household_mappings text;
begin
    select string_agg(format('%s (%s pots)', account_id, pot_count), ', ')
    into v_duplicate_accounts
    from (
        select account_id, count(*) as pot_count
        from public.saving_pot_accounts
        group by account_id
        having count(*) > 1
    ) duplicates;

    if v_duplicate_accounts is not null then
        raise exception using
            errcode = '23505',
            message = 'Saving-pot account contract cannot be applied because one or more accounts belong to multiple saving pots.',
            detail = v_duplicate_accounts,
            hint = 'Keep each listed account in exactly one saving pot, then run this migration again.';
    end if;

    select string_agg(format('%s (%s)', sp.name, sp.id), ', ')
    into v_unassigned_pots
    from public.saving_pots sp
    where not exists (
        select 1
        from public.saving_pot_accounts spa
        where spa.pot_id = sp.id
    );

    if v_unassigned_pots is not null then
        raise exception using
            errcode = '23514',
            message = 'Saving-pot account contract cannot be applied because one or more saving pots have no assigned account.',
            detail = v_unassigned_pots,
            hint = 'Assign at least one account to every listed saving pot, then run this migration again.';
    end if;

    select string_agg(format('pot %s -> account %s', spa.pot_id, spa.account_id), ', ')
    into v_cross_household_mappings
    from public.saving_pot_accounts spa
    join public.saving_pots sp on sp.id = spa.pot_id
    join public.accounts a on a.id = spa.account_id
    where sp.household_id <> a.household_id;

    if v_cross_household_mappings is not null then
        raise exception using
            errcode = '23514',
            message = 'Saving-pot account contract cannot be applied because one or more accounts belong to a different household than their saving pot.',
            detail = v_cross_household_mappings,
            hint = 'Remove or replace every cross-household account mapping, then run this migration again.';
    end if;
end;
$$;

alter table public.saving_pot_accounts
    add constraint saving_pot_accounts_account_unique unique (account_id);

comment on table public.saving_pot_accounts is
    'Explicit accounts used to calculate each saving pot goal. Every account can belong to at most one saving pot.';

-- Preserve the atomic replace behavior while refusing empty, duplicate,
-- cross-household, or already-assigned account selections.
create or replace function public.set_saving_pot_accounts(
    p_pot_id uuid,
    p_account_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_household_id uuid;
    v_invalid_account_ids uuid[];
    v_conflicting_account_id uuid;
begin
    select household_id
    into v_household_id
    from public.saving_pots
    where id = p_pot_id
    for update;

    if v_household_id is null then
        raise exception 'Saving pot not found';
    end if;

    if not public.is_household_member(v_household_id, auth.uid()) then
        raise exception 'Not authorized to update this saving pot';
    end if;

    if coalesce(cardinality(p_account_ids), 0) = 0 then
        raise exception using
            errcode = '23514',
            message = 'A saving pot must have at least one account.';
    end if;

    if array_position(p_account_ids, null) is not null then
        raise exception using
            errcode = '23502',
            message = 'Saving pot account selections cannot contain null values.';
    end if;

    if cardinality(p_account_ids) <> (
        select count(distinct account_id)
        from unnest(p_account_ids) as selected(account_id)
    ) then
        raise exception using
            errcode = '23505',
            message = 'A saving pot account can only be selected once.';
    end if;

    select array_agg(selected.account_id order by selected.account_id)
    into v_invalid_account_ids
    from unnest(p_account_ids) as selected(account_id)
    left join public.accounts a on a.id = selected.account_id
    where a.id is null
       or a.household_id <> v_household_id;

    if v_invalid_account_ids is not null then
        raise exception using
            errcode = '23514',
            message = 'Every saving pot account must belong to the same household as the saving pot.',
            detail = array_to_string(v_invalid_account_ids, ', ');
    end if;

    -- Lock the selected accounts so concurrent updates cannot race the
    -- account-to-pot uniqueness constraint with misleading UI state.
    perform 1
    from public.accounts a
    where a.id = any(p_account_ids)
    for update;

    select spa.account_id
    into v_conflicting_account_id
    from public.saving_pot_accounts spa
    where spa.account_id = any(p_account_ids)
      and spa.pot_id <> p_pot_id
    limit 1;

    if v_conflicting_account_id is not null then
        raise exception using
            errcode = '23505',
            message = 'An account can belong to only one saving pot.',
            detail = format('Account %s is already assigned to another saving pot.', v_conflicting_account_id);
    end if;

    delete from public.saving_pot_accounts
    where pot_id = p_pot_id;

    insert into public.saving_pot_accounts (pot_id, account_id)
    select p_pot_id, selected.account_id
    from unnest(p_account_ids) as selected(account_id);
end;
$$;

-- Direct table writes remain protected by the existing RLS policies. This
-- deferred constraint also prevents a direct delete or update from leaving an
-- existing pot with no valid same-household account.
create or replace function public.enforce_saving_pot_account_integrity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
    v_pot_id uuid;
begin
    for v_pot_id in
        select distinct candidate.pot_id
        from unnest(array[
            case when tg_op in ('UPDATE', 'DELETE') then old.pot_id else null end,
            case when tg_op in ('UPDATE', 'INSERT') then new.pot_id else null end
        ]) as candidate(pot_id)
        where candidate.pot_id is not null
    loop
        -- A cascading saving-pot delete removes the parent first, so there is
        -- no remaining contract to enforce for that pot.
        if exists (select 1 from public.saving_pots sp where sp.id = v_pot_id) then
            if exists (
                select 1
                from public.saving_pot_accounts spa
                join public.saving_pots sp on sp.id = spa.pot_id
                join public.accounts a on a.id = spa.account_id
                where spa.pot_id = v_pot_id
                  and a.household_id <> sp.household_id
            ) then
                raise exception using
                    errcode = '23514',
                    message = 'Every saving pot account must belong to the same household as its saving pot.';
            end if;

            if not exists (
                select 1
                from public.saving_pot_accounts spa
                join public.accounts a on a.id = spa.account_id
                join public.saving_pots sp on sp.id = spa.pot_id
                where spa.pot_id = v_pot_id
                  and a.household_id = sp.household_id
            ) then
                raise exception using
                    errcode = '23514',
                    message = 'A saving pot must retain at least one same-household account.';
            end if;
        end if;
    end loop;

    return null;
end;
$$;

create constraint trigger enforce_saving_pot_account_integrity
after insert or update or delete on public.saving_pot_accounts
deferrable initially deferred
for each row
execute function public.enforce_saving_pot_account_integrity();

create or replace view public.saving_pot_balances as
with selected_account_counts as (
    select
        pot_id,
        count(*)::int as selected_account_count
    from public.saving_pot_accounts
    group by pot_id
),
selected_account_balances as (
    select
        spa.pot_id,
        ab.current_balance
    from public.saving_pot_accounts spa
    join public.account_balances ab on ab.id = spa.account_id
)
select
    sp.id,
    sp.household_id,
    sp.name,
    sp.target_amount,
    sp.color,
    sp.icon,
    coalesce(sum(case when sab.current_balance > 0 then sab.current_balance else 0 end), 0) as saved,
    coalesce(sum(case when sab.current_balance < 0 then abs(sab.current_balance) else 0 end), 0) as spent,
    coalesce(sum(sab.current_balance), 0) as balance,
    coalesce(sac.selected_account_count, 0) as selected_account_count
from public.saving_pots sp
left join selected_account_counts sac on sac.pot_id = sp.id
left join selected_account_balances sab on sab.pot_id = sp.id
group by sp.id, sp.household_id, sp.name, sp.target_amount, sp.color, sp.icon, sac.selected_account_count;

alter view public.saving_pot_balances set (security_invoker = true);
grant select on table public.saving_pot_balances to authenticated;

revoke all on function public.set_saving_pot_accounts(uuid, uuid[]) from public;
grant execute on function public.set_saving_pot_accounts(uuid, uuid[]) to authenticated;
