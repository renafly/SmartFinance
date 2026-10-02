-- ============================================================
-- Add pot_id to recurring_transactions
-- ============================================================

alter table public.recurring_transactions
    add column pot_id uuid references public.saving_pots(id) on delete set null;

comment on column public.recurring_transactions.pot_id is
    'Optional link to a saving pot this recurring transaction contributes to or is spent from.';

create index idx_recurring_pot on public.recurring_transactions(pot_id);

-- ============================================================
-- Support transfers to pots (via transactions table)
-- ============================================================
-- Note: Transfers to pots are implemented as two linked transactions:
-- 1. Debit from source account
-- 2. Credit to destination pot (via income transaction linkage)
-- The pot_id on the income transaction tracks the deposit to the pot.
