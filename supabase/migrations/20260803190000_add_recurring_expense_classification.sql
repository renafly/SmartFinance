create type public.recurring_expense_kind as enum ('subscription', 'bill', 'other');

alter table public.recurring_transactions
  add column expense_kind public.recurring_expense_kind;

update public.recurring_transactions
set expense_kind = 'other'
where rule_kind = 'transaction'
  and type = 'expense';

alter table public.recurring_transactions
  add constraint recurring_transactions_expense_kind_shape_check
  check (
    expense_kind is null
    or (rule_kind = 'transaction' and type = 'expense')
  );

comment on column public.recurring_transactions.expense_kind is
  'Explicit recurring expense classification. Null for income and transfers; existing unclassified expenses are other.';

grant usage on type public.recurring_expense_kind to authenticated;
