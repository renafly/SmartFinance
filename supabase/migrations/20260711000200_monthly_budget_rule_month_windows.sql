alter table public.budget_rules
  add column if not exists active_months smallint[] not null default '{}',
  add column if not exists active_from_month smallint,
  add column if not exists active_to_month smallint;

alter table public.budget_rules
  add constraint budget_rules_active_from_month_check
    check (active_from_month is null or (active_from_month between 1 and 12)),
  add constraint budget_rules_active_to_month_check
    check (active_to_month is null or (active_to_month between 1 and 12));

