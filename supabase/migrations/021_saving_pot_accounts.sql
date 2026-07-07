-- ============================================================
-- Saving Pot Account Selection
-- ============================================================

create table public.saving_pot_accounts (
    pot_id uuid not null references public.saving_pots(id) on delete cascade,
    account_id uuid not null references public.accounts(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (pot_id, account_id)
);

comment on table public.saving_pot_accounts is 'Accounts used to calculate each saving pot goal. When empty, all household accounts are used.';

create index idx_saving_pot_accounts_pot on public.saving_pot_accounts(pot_id);
create index idx_saving_pot_accounts_account on public.saving_pot_accounts(account_id);

-- ============================================================
-- RPC
-- ============================================================

create or replace function public.set_saving_pot_accounts(
    p_pot_id uuid,
    p_account_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_household_id uuid;
begin
    select household_id
    into v_household_id
    from public.saving_pots
    where id = p_pot_id;

    if v_household_id is null then
        raise exception 'Saving pot not found';
    end if;

    if not public.is_household_member(v_household_id, auth.uid()) then
        raise exception 'Not authorized to update this saving pot';
    end if;

    delete from public.saving_pot_accounts
    where pot_id = p_pot_id;

    if coalesce(array_length(p_account_ids, 1), 0) > 0 then
        insert into public.saving_pot_accounts (pot_id, account_id)
        select p_pot_id, account_id
        from (
            select distinct unnest(p_account_ids) as account_id
        ) selected_accounts
        join public.accounts a on a.id = selected_accounts.account_id
        where a.household_id = v_household_id;
    end if;
end;
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table public.saving_pot_accounts enable row level security;

create policy "Members can view saving pot accounts"
on public.saving_pot_accounts
for select
using (
    exists (
        select 1
        from public.saving_pots sp
        join public.accounts a on a.id = account_id
        where sp.id = pot_id
          and sp.household_id = a.household_id
          and public.is_household_member(sp.household_id, auth.uid())
    )
);

create policy "Members can manage saving pot accounts"
on public.saving_pot_accounts
for all
using (
    exists (
        select 1
        from public.saving_pots sp
        join public.accounts a on a.id = account_id
        where sp.id = pot_id
          and sp.household_id = a.household_id
          and public.is_household_member(sp.household_id, auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.saving_pots sp
        join public.accounts a on a.id = account_id
        where sp.id = pot_id
          and sp.household_id = a.household_id
          and public.is_household_member(sp.household_id, auth.uid())
    )
);

-- ============================================================
-- Views
-- ============================================================

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
),
fallback_account_balances as (
    select
        sp.id as pot_id,
        ab.current_balance
    from public.saving_pots sp
    join public.account_balances ab on ab.household_id = sp.household_id
    where not exists (
        select 1
        from public.saving_pot_accounts spa
        where spa.pot_id = sp.id
    )
),
pot_account_balances as (
    select * from selected_account_balances
    union all
    select * from fallback_account_balances
)
select
    sp.id,
    sp.household_id,
    sp.name,
    sp.target_amount,
    sp.color,
    sp.icon,
    coalesce(sum(case when pab.current_balance > 0 then pab.current_balance else 0 end), 0) as saved,
    coalesce(sum(case when pab.current_balance < 0 then abs(pab.current_balance) else 0 end), 0) as spent,
    coalesce(sum(pab.current_balance), 0) as balance,
    coalesce(sac.selected_account_count, 0) as selected_account_count
from public.saving_pots sp
left join selected_account_counts sac on sac.pot_id = sp.id
left join pot_account_balances pab on pab.pot_id = sp.id
group by sp.id, sp.household_id, sp.name, sp.target_amount, sp.color, sp.icon, sac.selected_account_count;
