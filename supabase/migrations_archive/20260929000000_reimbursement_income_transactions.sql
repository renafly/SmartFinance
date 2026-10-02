-- ============================================================
-- Reimbursements: make the money actually land
-- ============================================================
-- Until now a transaction_reimbursements row recorded WHICH account/pot a
-- repayment went into (20260901002500_reimbursement_allocations.sql) but
-- nothing that computes a balance read that table -- account_balances,
-- list_account_ledger, balance_after_transaction, saving_pot_balances all
-- ignored it. The expense got cheaper (transaction_effective_amounts) but
-- the receiving account never went up, so the money vanished.
--
-- Model chosen:
--  * source_type = 'account': every reimbursement owns ONE linked income
--    transaction (transactions.reimbursement_id) in that account, dated
--    received_on and kept in sync by trigger on insert/update. Deleting the
--    reimbursement deletes it (FK cascade). Because it is an ordinary
--    transaction, balances/ledger/running balance/replenishments need no
--    changes.
--  * source_type = 'pot': a single-pot deposit isn't representable as one
--    transaction in this schema (transaction_allocations needs >= 2 rows),
--    so pot reimbursements are added directly into saving_pot_balances.
--  * The linked income row is managed: it can't be deleted or have its
--    money fields changed on its own (guard trigger) -- only title/notes/
--    category stay editable.
--  * Reporting stays net: monthly_summary / transaction_effective_amounts
--    already subtract reimbursements from the expense, so reimbursement
--    income rows are excluded from income there (no double count).
--  * An expense changed into income/a transfer leg drops its
--    reimbursements (previously they were left orphaned).
--
-- Also: transaction_effective_amounts was created without
-- security_invoker, so it ran with the owner's rights and bypassed RLS
-- (any authenticated user could read every household's rows). All
-- money views are (re)set to security_invoker here.

-- ------------------------------------------------------------
-- 1. received_on
-- ------------------------------------------------------------
alter table public.transaction_reimbursements
  add column if not exists received_on date;

update public.transaction_reimbursements r
set received_on = t.transaction_date::date
from public.transactions t
where t.id = r.transaction_id
  and r.received_on is null;

alter table public.transaction_reimbursements
  alter column received_on set default current_date,
  alter column received_on set not null;

comment on column public.transaction_reimbursements.received_on is
  'Date the repayment was received. Dates the linked income transaction (account reimbursements). Backfilled from the expense date for rows created before this column existed.';

create unique index if not exists transaction_reimbursements_id_household_unique
  on public.transaction_reimbursements (id, household_id);

-- ------------------------------------------------------------
-- 2. transactions.reimbursement_id
-- ------------------------------------------------------------
alter table public.transactions
  add column if not exists reimbursement_id uuid;

alter table public.transactions
  add constraint transactions_reimbursement_household_fk
  foreign key (reimbursement_id, household_id)
  references public.transaction_reimbursements (id, household_id)
  on delete cascade;

create unique index if not exists idx_transactions_reimbursement
  on public.transactions (reimbursement_id)
  where reimbursement_id is not null;

comment on column public.transactions.reimbursement_id is
  'Set on the income transaction automatically created for an account reimbursement (transaction_reimbursements). Managed by sync_reimbursement_income_transaction -- deleted with the reimbursement, and its amount/account/date/type cannot be edited directly.';

-- ------------------------------------------------------------
-- 3. Guard: the linked income row is managed by its reimbursement.
-- ------------------------------------------------------------
create or replace function public.guard_reimbursement_income_transaction()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('app.reimbursement_sync', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'Reimbursement income transactions are created automatically.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    -- A cascade from deleting the reimbursement (or its expense) arrives
    -- after the reimbursement row is gone: allow that.
    if exists (select 1 from public.transaction_reimbursements where id = old.reimbursement_id) then
      raise exception 'This income was recorded by a reimbursement. Remove the reimbursement from its expense instead.'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if new.amount is distinct from old.amount
     or new.account_id is distinct from old.account_id
     or new.type is distinct from old.type
     or new.transaction_date is distinct from old.transaction_date
     or new.household_id is distinct from old.household_id
     or new.transfer_group_id is distinct from old.transfer_group_id
     or new.is_split is distinct from old.is_split
     or new.reimbursement_id is distinct from old.reimbursement_id then
    raise exception 'This income was recorded by a reimbursement. Edit the reimbursement from its expense instead.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger guard_reimbursement_income_insert
before insert on public.transactions
for each row
when (new.reimbursement_id is not null)
execute function public.guard_reimbursement_income_transaction();

create trigger guard_reimbursement_income_change
before update or delete on public.transactions
for each row
when (old.reimbursement_id is not null)
execute function public.guard_reimbursement_income_transaction();

-- ------------------------------------------------------------
-- 4. Sync reimbursement -> linked income transaction.
-- ------------------------------------------------------------
-- security definer: the reimbursement write itself already passed RLS
-- (members only) and enforce_reimbursement_target; this derived write must
-- not fail on the transactions policies/guard.
create or replace function public.sync_reimbursement_income_transaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expense_title text;
  v_title text;
begin
  select t.title into v_expense_title
  from public.transactions t
  where t.id = new.transaction_id;

  v_title := coalesce(v_expense_title, '') || ' · ' || new.payer_name;

  perform set_config('app.reimbursement_sync', 'on', true);

  if new.source_type = 'account' and new.account_id is not null then
    update public.transactions
    set account_id = new.account_id,
        amount = new.amount,
        transaction_date = new.received_on::timestamptz,
        title = v_title,
        notes = new.note
    where reimbursement_id = new.id;

    if not found then
      insert into public.transactions (
        household_id, account_id, category_id, title, notes, amount, type,
        transaction_date, created_by, reimbursement_id
      )
      values (
        new.household_id, new.account_id, null, v_title, new.note, new.amount, 'income',
        new.received_on::timestamptz, new.created_by, new.id
      );
    end if;
  else
    -- Pot (or legacy source-less) reimbursement: no income row.
    delete from public.transactions where reimbursement_id = new.id;
  end if;

  perform set_config('app.reimbursement_sync', 'off', true);
  return new;
end;
$$;

revoke all on function public.sync_reimbursement_income_transaction() from public, anon, authenticated;

create trigger sync_reimbursement_income_transaction
after insert or update on public.transaction_reimbursements
for each row
execute function public.sync_reimbursement_income_transaction();

-- ------------------------------------------------------------
-- 5. An expense that stops being an expense drops its reimbursements
--    (enforce_reimbursement_target only checked on reimbursement writes).
-- ------------------------------------------------------------
create or replace function public.drop_reimbursements_when_not_expense()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  delete from public.transaction_reimbursements where transaction_id = new.id;
  return new;
end;
$$;

create trigger drop_reimbursements_when_not_expense
after update of type, transfer_group_id on public.transactions
for each row
when (
  old.type = 'expense' and old.transfer_group_id is null
  and (new.type <> 'expense' or new.transfer_group_id is not null)
)
execute function public.drop_reimbursements_when_not_expense();

-- ------------------------------------------------------------
-- 6. Reporting views
-- ------------------------------------------------------------
-- Reimbursement income rows have effective_amount 0: their money is
-- already reflected by netting the expense. New trailing column only
-- (CREATE OR REPLACE VIEW allows appending).
create or replace view public.transaction_effective_amounts as
select
    t.id as transaction_id,
    t.household_id,
    t.amount as original_amount,
    coalesce(r.reimbursed_total, 0) as reimbursed_total,
    case
      when t.reimbursement_id is not null then 0
      when t.type = 'expense' then t.amount - coalesce(r.reimbursed_total, 0)
      else t.amount
    end as effective_amount,
    (t.reimbursement_id is not null) as is_reimbursement_income
from public.transactions t
left join (
    select transaction_id, sum(amount) as reimbursed_total
    from public.transaction_reimbursements
    group by transaction_id
) r on r.transaction_id = t.id;

create or replace view public.monthly_summary as
select
    t.household_id,
    date_trunc('month', t.transaction_date)::date as month,
    sum(case when t.type = 'income' then tea.effective_amount else 0 end) as income,
    sum(case when t.type = 'expense' then tea.effective_amount else 0 end) as expenses,
    sum(case when t.type = 'income' then tea.effective_amount else -tea.effective_amount end) as balance
from public.transactions t
join public.transaction_effective_amounts tea on tea.transaction_id = t.id
group by t.household_id, date_trunc('month', t.transaction_date);

-- Pot reimbursements add straight into the pot (see header). Otherwise
-- identical to 20260819120000_transaction_allocations.sql §9.
create or replace view public.saving_pot_balances as
with selected_account_counts as (
    select
        pot_id,
        count(*)::int as selected_account_count
    from public.saving_pot_accounts
    group by pot_id
),
account_totals as (
    select
        spa.pot_id,
        coalesce(sum(case when ab.current_balance > 0 then ab.current_balance else 0 end), 0) as saved,
        coalesce(sum(case when ab.current_balance < 0 then abs(ab.current_balance) else 0 end), 0) as spent,
        coalesce(sum(ab.current_balance), 0) as balance
    from public.saving_pot_accounts spa
    join public.account_balances ab on ab.id = spa.account_id
    group by spa.pot_id
),
allocation_totals as (
    select
        ta.pot_id,
        coalesce(sum(case when t.type = 'income' then ta.amount else 0 end), 0) as saved,
        coalesce(sum(case when t.type = 'expense' then ta.amount else 0 end), 0) as spent,
        coalesce(sum(case when t.type = 'income' then ta.amount else -ta.amount end), 0) as balance
    from public.transaction_allocations ta
    join public.transactions t on t.id = ta.transaction_id
    where ta.pot_id is not null
    group by ta.pot_id
),
reimbursement_totals as (
    select
        r.pot_id,
        coalesce(sum(r.amount), 0) as saved
    from public.transaction_reimbursements r
    where r.source_type = 'pot' and r.pot_id is not null
    group by r.pot_id
)
select
    sp.id,
    sp.household_id,
    sp.name,
    sp.target_amount,
    sp.color,
    sp.icon,
    coalesce(acct.saved, 0) + coalesce(alloc.saved, 0) + coalesce(reimb.saved, 0) as saved,
    coalesce(acct.spent, 0) + coalesce(alloc.spent, 0) as spent,
    coalesce(acct.balance, 0) + coalesce(alloc.balance, 0) + coalesce(reimb.saved, 0) as balance,
    coalesce(sac.selected_account_count, 0) as selected_account_count
from public.saving_pots sp
left join selected_account_counts sac on sac.pot_id = sp.id
left join account_totals acct on acct.pot_id = sp.id
left join allocation_totals alloc on alloc.pot_id = sp.id
left join reimbursement_totals reimb on reimb.pot_id = sp.id;

alter view public.transaction_effective_amounts set (security_invoker = true);
alter view public.monthly_summary set (security_invoker = true);
alter view public.monthly_category_spending set (security_invoker = true);
alter view public.saving_pot_balances set (security_invoker = true);
alter view public.account_balances set (security_invoker = true);

grant select on public.transaction_effective_amounts to authenticated;
grant select on public.monthly_summary to authenticated;
grant select on public.saving_pot_balances to authenticated;

-- ------------------------------------------------------------
-- 7. Backfill: create the missing income rows for existing account
--    reimbursements (runs the sync trigger once per row).
-- ------------------------------------------------------------
update public.transaction_reimbursements
set received_on = received_on
where source_type = 'account' and account_id is not null;

notify pgrst, 'reload schema';
