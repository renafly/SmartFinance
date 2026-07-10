-- Roll back recurring budget movements if scripts/seed_recurring_budget_movements.sql was run.
--
-- This only removes rows tagged by that recurring seed.

begin;

delete from public.recurring_transactions
where notes like '[seed-recurring-budget-movements]%';

commit;
