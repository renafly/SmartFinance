-- ============================================================
-- Reimbursements: third-party repayments toward an expense
-- ============================================================
-- See docs/recurring-end-conditions-reimbursements-bug-fab-plan.md §2.

create table public.transaction_reimbursements (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    transaction_id uuid not null references public.transactions(id) on delete cascade,
    payer_name text not null check (length(btrim(payer_name)) > 0),
    amount numeric(14,2) not null check (amount > 0),
    amount_enc text,
    enc_version integer not null default 0,
    note text,
    created_by uuid not null references public.profiles(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.transaction_reimbursements is
  'Money a third party paid back toward one expense transaction. Sum(amount) for a transaction can exceed the transaction''s own amount (the payer covered more than the expense cost); the resulting effective amount then goes negative -- see transaction_effective_amounts.';
comment on column public.transaction_reimbursements.amount_enc is
  'Reserved for the in-progress E2E-encryption migration (docs/e2e-encryption-plan.md). Unused today, mirrors the amount_enc/enc_version shape already present on every other money column in this schema.';

create index idx_transaction_reimbursements_transaction on public.transaction_reimbursements(transaction_id);
create index idx_transaction_reimbursements_household on public.transaction_reimbursements(household_id);

create trigger set_transaction_reimbursements_updated_at
before update on public.transaction_reimbursements
for each row
execute function public.update_updated_at();

-- A reimbursement only makes sense against an expense, and must stay in
-- the same household as the transaction it targets.
create or replace function public.enforce_reimbursement_target()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_type public.transaction_type;
  v_household_id uuid;
begin
  select type, household_id into v_type, v_household_id
  from public.transactions
  where id = new.transaction_id;

  if not found then
    raise exception 'Reimbursement references a transaction that does not exist.';
  end if;

  if v_type <> 'expense' then
    raise exception 'Reimbursements can only be added to expense transactions.';
  end if;

  if v_household_id <> new.household_id then
    raise exception 'Reimbursement household_id must match its transaction''s household_id.';
  end if;

  return new;
end;
$$;

create trigger enforce_transaction_reimbursements_target
before insert or update on public.transaction_reimbursements
for each row
execute function public.enforce_reimbursement_target();

alter table public.transaction_reimbursements enable row level security;

create policy "Members can view reimbursements"
on public.transaction_reimbursements
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage reimbursements"
on public.transaction_reimbursements
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);

revoke all on table public.transaction_reimbursements from anon;
grant select, insert, update, delete on table public.transaction_reimbursements to authenticated;

-- ============================================================
-- Effective amount: original amount net of reimbursements.
-- Can be negative when reimbursements exceed the original amount.
-- ============================================================
create or replace view public.transaction_effective_amounts as
select
    t.id as transaction_id,
    t.household_id,
    t.amount as original_amount,
    coalesce(r.reimbursed_total, 0) as reimbursed_total,
    case
      when t.type = 'expense' then t.amount - coalesce(r.reimbursed_total, 0)
      else t.amount
    end as effective_amount
from public.transactions t
left join (
    select transaction_id, sum(amount) as reimbursed_total
    from public.transaction_reimbursements
    group by transaction_id
) r on r.transaction_id = t.id;

comment on view public.transaction_effective_amounts is
  'One row per transaction. effective_amount = amount minus reimbursements for expenses (can go negative when reimbursed more than spent); unchanged for income. Feeds monthly_summary and monthly_category_spending so reimbursed/over-reimbursed expenses net correctly into monthly totals.';

grant select on public.transaction_effective_amounts to authenticated;

-- ============================================================
-- Monthly totals now net out reimbursements (via effective_amount)
-- instead of raw transactions.amount for expenses. Same column
-- signature as before (013_views.sql), so every existing caller
-- (src/repositories/transactions.repository.ts) keeps working.
-- ============================================================
create or replace view public.monthly_summary as
select
    t.household_id,
    date_trunc('month', t.transaction_date)::date as month,
    sum(case when t.type = 'income' then t.amount else 0 end) as income,
    sum(case when t.type = 'expense' then tea.effective_amount else 0 end) as expenses,
    sum(case when t.type = 'income' then t.amount else -tea.effective_amount end) as balance
from public.transactions t
join public.transaction_effective_amounts tea on tea.transaction_id = t.id
group by t.household_id, date_trunc('month', t.transaction_date);

create or replace view public.monthly_category_spending as
select
    t.household_id,
    t.category_id,
    date_trunc('month', t.transaction_date)::date as month,
    sum(tea.effective_amount) as total
from public.transactions t
join public.transaction_effective_amounts tea on tea.transaction_id = t.id
where t.type = 'expense'
group by t.household_id, t.category_id, date_trunc('month', t.transaction_date);
