-- ============================================================
-- Current Account Balances
-- ============================================================

create or replace view public.account_balances as

select

    a.id,

    a.household_id,

    a.name,

    a.type,

    a.currency,

    a.initial_balance,

    a.initial_balance
        + coalesce(sum(
            case
                when t.type = 'income' then t.amount
                when t.type = 'expense' then -t.amount
            end
        ), 0) as current_balance

from public.accounts a

left join public.transactions t
    on t.account_id = a.id

group by
    a.id;

    -- ============================================================
-- Monthly Summary
-- ============================================================

create or replace view public.monthly_summary as

select

    household_id,

    date_trunc('month', transaction_date)::date as month,

    sum(case when type = 'income' then amount else 0 end) as income,

    sum(case when type = 'expense' then amount else 0 end) as expenses,

    sum(case
            when type = 'income'
                then amount
            else
                -amount
        end) as balance

from public.transactions

group by
    household_id,
    date_trunc('month', transaction_date);


    -- ============================================================
-- Budget Progress
-- ============================================================

create or replace view public.budget_progress as

select

    b.id,

    b.household_id,

    b.category_id,

    c.name as category,

    b.amount as budget,

    coalesce(sum(t.amount), 0) as spent,

    b.amount - coalesce(sum(t.amount), 0) as remaining

from public.budgets b

join public.categories c
    on c.id = b.category_id

left join public.transactions t
    on t.category_id = b.category_id
    and t.type = 'expense'
    and t.transaction_date::date
        between b.start_date and b.end_date

group by

    b.id,

    c.name;


    create or replace view public.monthly_category_spending as

select

    household_id,

    category_id,

    date_trunc('month', transaction_date)::date as month,

    sum(amount) as total

from public.transactions

where type = 'expense'

group by

    household_id,

    category_id,

    date_trunc('month', transaction_date);