-- Roll back the first missing-transactions seed.
--
-- This only removes rows created by scripts/seed_missing_transactions.sql.
-- It does not touch Renato's expense seed, which uses [seed-renato-expenses].
--
-- Preview before deleting:
-- select id, title, amount, type, transaction_date, notes
-- from public.transactions
-- where notes = '[seed-missing-transactions]'
-- order by transaction_date, title, amount;

begin;

delete from public.transactions
where notes = '[seed-missing-transactions]';

commit;
