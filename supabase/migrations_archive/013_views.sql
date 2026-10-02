-- ============================================================
-- Database Views
-- ============================================================

-- Current balance per account
create or replace view public.account_balances as
select
    a.id,
    a.household_id,
    a.name,
    a.type,
    a.currency,
    a.initial_balance,
    a.initial_balance + coalesce(sum(
        case
            when t.type = 'income'  then  t.amount
            when t.type = 'expense' then -t.amount
        end
    ), 0) as current_balance
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

-- Monthly income / expenses / net balance per household
create or replace view public.monthly_summary as
select
    household_id,
    date_trunc('month', transaction_date)::date as month,
    sum(case when type = 'income'  then amount else 0 end) as income,
    sum(case when type = 'expense' then amount else 0 end) as expenses,
    sum(case when type = 'income'  then amount else -amount end) as balance
from public.transactions
group by household_id, date_trunc('month', transaction_date);

-- Saving pot balances: saved / spent / net balance per pot
create or replace view public.saving_pot_balances as
select
    sp.id,
    sp.household_id,
    sp.name,
    sp.target_amount,
    sp.color,
    sp.icon,
    coalesce(sum(case when t.type = 'income'  then t.amount else 0 end), 0) as saved,
    coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0) as spent,
    coalesce(sum(case when t.type = 'income'  then t.amount else -t.amount end), 0) as balance
from public.saving_pots sp
left join public.transactions t on t.pot_id = sp.id
group by sp.id, sp.household_id, sp.name, sp.target_amount, sp.color, sp.icon;

-- Monthly spending totals per category per household
create or replace view public.monthly_category_spending as
select
    household_id,
    category_id,
    date_trunc('month', transaction_date)::date as month,
    sum(amount) as total
from public.transactions
where type = 'expense'
group by household_id, category_id, date_trunc('month', transaction_date);
