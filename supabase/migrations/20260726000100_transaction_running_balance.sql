-- Historical account balance immediately after each transaction.
--
-- This is a PostgREST computed field on public.transactions. Keeping the
-- calculation in PostgreSQL makes it correct even when the API response is
-- filtered or paginated.
create index if not exists idx_transactions_account_ledger_order
on public.transactions(account_id, transaction_date, created_at, id);

create or replace function public.balance_after_transaction(public.transactions)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
    select
        account.initial_balance
        + coalesce(sum(
            case
                when movement.type = 'income' then movement.amount
                when movement.type = 'expense' then -movement.amount
            end
        ), 0)
    from public.accounts as account
    left join public.transactions as movement
        on movement.account_id = account.id
        and (
            movement.transaction_date,
            movement.created_at,
            movement.id
        ) <= (
            $1.transaction_date,
            $1.created_at,
            $1.id
        )
    where account.id = $1.account_id
    group by account.initial_balance;
$$;

comment on function public.balance_after_transaction(public.transactions) is
'Account balance immediately after this transaction, ordered by transaction date, creation date, and id.';

revoke all on function public.balance_after_transaction(public.transactions) from public, anon;
grant execute on function public.balance_after_transaction(public.transactions) to authenticated;

notify pgrst, 'reload schema';
