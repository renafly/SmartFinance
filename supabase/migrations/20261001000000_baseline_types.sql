-- ============================================================
-- SmartFinance baseline 01/09 -- Extensions and enum types
-- ============================================================
-- Every enum the app uses. pgcrypto is created here; Supabase platform extensions (pg_cron, pg_net, supabase_vault) are in 09_platform.
--
-- Generated 2026-10-01 by squashing the 107 historical migrations
-- (archived in supabase/migrations_archive/) into the final schema they
-- produce. To change the schema from now on, add a NEW migration after
-- these files -- never edit the baseline.

set check_function_bodies = false;

create extension if not exists pgcrypto;

-- Name: account_type; Type: TYPE; Schema: public
--

CREATE TYPE public.account_type AS ENUM (
    'cash',
    'bank',
    'credit_card',
    'savings',
    'investment',
    'ppr'
);


--
-- Name: budget_rule_allocation_mode; Type: TYPE; Schema: public
--

CREATE TYPE public.budget_rule_allocation_mode AS ENUM (
    'equal_split',
    'custom'
);


--
-- Name: category_type; Type: TYPE; Schema: public
--

CREATE TYPE public.category_type AS ENUM (
    'income',
    'expense',
    'account'
);


--
-- Name: currency_code; Type: TYPE; Schema: public
--

CREATE TYPE public.currency_code AS ENUM (
    'EUR',
    'USD',
    'GBP'
);


--
-- Name: excess_cash_distribution_method; Type: TYPE; Schema: public
--

CREATE TYPE public.excess_cash_distribution_method AS ENUM (
    'even_split'
);


--
-- Name: household_income_mode; Type: TYPE; Schema: public
--

CREATE TYPE public.household_income_mode AS ENUM (
    'shared',
    'individual'
);


--
-- Name: household_member_status; Type: TYPE; Schema: public
--

CREATE TYPE public.household_member_status AS ENUM (
    'pending',
    'accepted'
);


--
-- Name: household_role; Type: TYPE; Schema: public
--

CREATE TYPE public.household_role AS ENUM (
    'owner',
    'admin',
    'member'
);


--
-- Name: monthly_budget_period_status; Type: TYPE; Schema: public
--

CREATE TYPE public.monthly_budget_period_status AS ENUM (
    'open',
    'committed',
    'closed'
);


--
-- Name: monthly_budget_run_status; Type: TYPE; Schema: public
--

CREATE TYPE public.monthly_budget_run_status AS ENUM (
    'draft',
    'confirmed',
    'cancelled'
);


--
-- Name: monthly_budget_section; Type: TYPE; Schema: public
--

CREATE TYPE public.monthly_budget_section AS ENUM (
    'income',
    'savings',
    'pots',
    'investments',
    'ppr',
    'remaining_cash'
);


--
-- Name: planned_item_allocation_mode; Type: TYPE; Schema: public
--

CREATE TYPE public.planned_item_allocation_mode AS ENUM (
    'single',
    'equal_split',
    'custom_amount',
    'custom_percent'
);


--
-- Name: planned_item_direction; Type: TYPE; Schema: public
--

CREATE TYPE public.planned_item_direction AS ENUM (
    'outflow',
    'inflow'
);


--
-- Name: planned_item_occurrence_status; Type: TYPE; Schema: public
--

CREATE TYPE public.planned_item_occurrence_status AS ENUM (
    'planned',
    'confirmed',
    'matched',
    'skipped',
    'cancelled'
);


--
-- Name: planned_item_recurrence_type; Type: TYPE; Schema: public
--

CREATE TYPE public.planned_item_recurrence_type AS ENUM (
    'monthly',
    'specific_months',
    'interval',
    'one_time'
);


--
-- Name: planned_item_transaction_role; Type: TYPE; Schema: public
--

CREATE TYPE public.planned_item_transaction_role AS ENUM (
    'plain_expense',
    'transfer_source',
    'transfer_destination',
    'income'
);


--
-- Name: recurring_end_condition; Type: TYPE; Schema: public
--

CREATE TYPE public.recurring_end_condition AS ENUM (
    'never',
    'count',
    'date'
);


--
-- Name: recurring_execution_status; Type: TYPE; Schema: public
--

CREATE TYPE public.recurring_execution_status AS ENUM (
    'pending',
    'completed',
    'skipped',
    'failed'
);


--
-- Name: recurring_expense_kind; Type: TYPE; Schema: public
--

CREATE TYPE public.recurring_expense_kind AS ENUM (
    'subscription',
    'bill',
    'other'
);


--
-- Name: recurring_expense_recurrence_type; Type: TYPE; Schema: public
--

CREATE TYPE public.recurring_expense_recurrence_type AS ENUM (
    'monthly',
    'specific_months',
    'interval',
    'one_time'
);


--
-- Name: recurring_frequency; Type: TYPE; Schema: public
--

CREATE TYPE public.recurring_frequency AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'yearly',
    'custom'
);


--
-- Name: recurring_rule_kind; Type: TYPE; Schema: public
--

CREATE TYPE public.recurring_rule_kind AS ENUM (
    'transaction',
    'transfer'
);


--
-- Name: remaining_cash_strategy; Type: TYPE; Schema: public
--

CREATE TYPE public.remaining_cash_strategy AS ENUM (
    'keep',
    'fixed'
);


--
-- Name: replenishment_run_status; Type: TYPE; Schema: public
--

CREATE TYPE public.replenishment_run_status AS ENUM (
    'draft',
    'confirmed',
    'cancelled'
);


--
-- Name: replenishment_source_kind; Type: TYPE; Schema: public
--

CREATE TYPE public.replenishment_source_kind AS ENUM (
    'account',
    'pot'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public
--

CREATE TYPE public.transaction_type AS ENUM (
    'income',
    'expense'
);
