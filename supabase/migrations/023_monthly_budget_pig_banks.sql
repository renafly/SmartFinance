-- ============================================================
-- Monthly Budget Pig Bank Destinations
-- ============================================================

alter table public.budget_rules
  add column if not exists destination_pot_id uuid references public.saving_pots(id) on delete set null;

create index if not exists idx_budget_rules_destination_pot on public.budget_rules(destination_pot_id);
