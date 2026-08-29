-- ============================================================
-- Income sources: recurrence enum value (Monthly Budget)
-- ============================================================
-- Split out from 20260901001000_income_sources.sql: Postgres will not let
-- a newly added enum value be used (e.g. in a check constraint) within the
-- same transaction that adds it (SQLSTATE 55P04, "unsafe use of new value
-- of enum type"). This migration only adds the enum value so it is
-- committed before the next migration references it.

alter type public.recurring_expense_recurrence_type add value if not exists 'one_time';
