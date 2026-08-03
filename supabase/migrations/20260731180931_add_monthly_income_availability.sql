alter table public.monthly_income_inputs
add column available_month date;

update public.monthly_income_inputs as income
set available_month = runs.month
from public.monthly_budget_runs as runs
where runs.id = income.monthly_budget_run_id
  and income.available_month is null;

alter table public.monthly_income_inputs
alter column available_month set not null;

alter table public.monthly_income_inputs
add constraint monthly_income_inputs_available_month_first_day
check (available_month = date_trunc('month', available_month)::date);

create index idx_monthly_income_inputs_available_month
on public.monthly_income_inputs(available_month);
