-- ============================================================
-- SmartFinance baseline 04/09 -- Views
-- ============================================================
-- Read-model views.
--
-- Generated 2026-10-01 by squashing the 107 historical migrations
-- (archived in supabase/migrations_archive/) into the final schema they
-- produce. To change the schema from now on, add a NEW migration after
-- these files -- never edit the baseline.

set check_function_bodies = false;

--
-- Name: account_balances; Type: VIEW; Schema: public
--

CREATE VIEW public.account_balances WITH (security_invoker='true') AS
 WITH direct AS (
         SELECT t.account_id,
            sum(
                CASE
                    WHEN (t.type = 'income'::public.transaction_type) THEN t.amount
                    ELSE (- t.amount)
                END) AS delta
           FROM public.transactions t
          WHERE (t.is_split = false)
          GROUP BY t.account_id
        ), split AS (
         SELECT ta.account_id,
            sum(
                CASE
                    WHEN (t.type = 'income'::public.transaction_type) THEN ta.amount
                    ELSE (- ta.amount)
                END) AS delta
           FROM (public.transaction_allocations ta
             JOIN public.transactions t ON ((t.id = ta.transaction_id)))
          WHERE (ta.account_id IS NOT NULL)
          GROUP BY ta.account_id
        )
 SELECT a.id,
    a.household_id,
    a.name,
    a.type,
    a.currency,
    a.initial_balance,
    ((a.initial_balance + COALESCE(direct.delta, (0)::numeric)) + COALESCE(split.delta, (0)::numeric)) AS current_balance
   FROM ((public.accounts a
     LEFT JOIN direct ON ((direct.account_id = a.id)))
     LEFT JOIN split ON ((split.account_id = a.id)));


--
-- Name: transaction_effective_amounts; Type: VIEW; Schema: public
--

CREATE VIEW public.transaction_effective_amounts WITH (security_invoker='true') AS
 SELECT t.id AS transaction_id,
    t.household_id,
    t.amount AS original_amount,
    COALESCE(r.reimbursed_total, (0)::numeric) AS reimbursed_total,
        CASE
            WHEN (t.reimbursement_id IS NOT NULL) THEN (0)::numeric
            WHEN (t.type = 'expense'::public.transaction_type) THEN (t.amount - COALESCE(r.reimbursed_total, (0)::numeric))
            ELSE t.amount
        END AS effective_amount,
    (t.reimbursement_id IS NOT NULL) AS is_reimbursement_income
   FROM (public.transactions t
     LEFT JOIN ( SELECT transaction_reimbursements.transaction_id,
            sum(transaction_reimbursements.amount) AS reimbursed_total
           FROM public.transaction_reimbursements
          GROUP BY transaction_reimbursements.transaction_id) r ON ((r.transaction_id = t.id)));


--
-- Name: VIEW transaction_effective_amounts; Type: COMMENT; Schema: public
--

COMMENT ON VIEW public.transaction_effective_amounts IS 'One row per transaction. effective_amount = amount minus reimbursements for expenses (can go negative when reimbursed more than spent); unchanged for income. Feeds monthly_summary and monthly_category_spending so reimbursed/over-reimbursed expenses net correctly into monthly totals.';


--
-- Name: monthly_category_spending; Type: VIEW; Schema: public
--

CREATE VIEW public.monthly_category_spending WITH (security_invoker='true') AS
 SELECT t.household_id,
    t.category_id,
    (date_trunc('month'::text, t.transaction_date))::date AS month,
    sum(tea.effective_amount) AS total
   FROM (public.transactions t
     JOIN public.transaction_effective_amounts tea ON ((tea.transaction_id = t.id)))
  WHERE (t.type = 'expense'::public.transaction_type)
  GROUP BY t.household_id, t.category_id, (date_trunc('month'::text, t.transaction_date));


--
-- Name: monthly_summary; Type: VIEW; Schema: public
--

CREATE VIEW public.monthly_summary WITH (security_invoker='true') AS
 SELECT t.household_id,
    (date_trunc('month'::text, t.transaction_date))::date AS month,
    sum(
        CASE
            WHEN (t.type = 'income'::public.transaction_type) THEN tea.effective_amount
            ELSE (0)::numeric
        END) AS income,
    sum(
        CASE
            WHEN (t.type = 'expense'::public.transaction_type) THEN tea.effective_amount
            ELSE (0)::numeric
        END) AS expenses,
    sum(
        CASE
            WHEN (t.type = 'income'::public.transaction_type) THEN tea.effective_amount
            ELSE (- tea.effective_amount)
        END) AS balance
   FROM (public.transactions t
     JOIN public.transaction_effective_amounts tea ON ((tea.transaction_id = t.id)))
  GROUP BY t.household_id, (date_trunc('month'::text, t.transaction_date));


--
-- Name: saving_pot_balances; Type: VIEW; Schema: public
--

CREATE VIEW public.saving_pot_balances WITH (security_invoker='true') AS
 WITH selected_account_counts AS (
         SELECT saving_pot_accounts.pot_id,
            (count(*))::integer AS selected_account_count
           FROM public.saving_pot_accounts
          GROUP BY saving_pot_accounts.pot_id
        ), account_totals AS (
         SELECT spa.pot_id,
            COALESCE(sum(
                CASE
                    WHEN (ab.current_balance > (0)::numeric) THEN ab.current_balance
                    ELSE (0)::numeric
                END), (0)::numeric) AS saved,
            COALESCE(sum(
                CASE
                    WHEN (ab.current_balance < (0)::numeric) THEN abs(ab.current_balance)
                    ELSE (0)::numeric
                END), (0)::numeric) AS spent,
            COALESCE(sum(ab.current_balance), (0)::numeric) AS balance
           FROM (public.saving_pot_accounts spa
             JOIN public.account_balances ab ON ((ab.id = spa.account_id)))
          GROUP BY spa.pot_id
        ), allocation_totals AS (
         SELECT ta.pot_id,
            COALESCE(sum(
                CASE
                    WHEN (t.type = 'income'::public.transaction_type) THEN ta.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS saved,
            COALESCE(sum(
                CASE
                    WHEN (t.type = 'expense'::public.transaction_type) THEN ta.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS spent,
            COALESCE(sum(
                CASE
                    WHEN (t.type = 'income'::public.transaction_type) THEN ta.amount
                    ELSE (- ta.amount)
                END), (0)::numeric) AS balance
           FROM (public.transaction_allocations ta
             JOIN public.transactions t ON ((t.id = ta.transaction_id)))
          WHERE (ta.pot_id IS NOT NULL)
          GROUP BY ta.pot_id
        ), reimbursement_totals AS (
         SELECT r.pot_id,
            COALESCE(sum(r.amount), (0)::numeric) AS saved
           FROM public.transaction_reimbursements r
          WHERE ((r.source_type = 'pot'::text) AND (r.pot_id IS NOT NULL))
          GROUP BY r.pot_id
        )
 SELECT sp.id,
    sp.household_id,
    sp.name,
    sp.target_amount,
    sp.color,
    sp.icon,
    ((COALESCE(acct.saved, (0)::numeric) + COALESCE(alloc.saved, (0)::numeric)) + COALESCE(reimb.saved, (0)::numeric)) AS saved,
    (COALESCE(acct.spent, (0)::numeric) + COALESCE(alloc.spent, (0)::numeric)) AS spent,
    ((COALESCE(acct.balance, (0)::numeric) + COALESCE(alloc.balance, (0)::numeric)) + COALESCE(reimb.saved, (0)::numeric)) AS balance,
    COALESCE(sac.selected_account_count, 0) AS selected_account_count
   FROM ((((public.saving_pots sp
     LEFT JOIN selected_account_counts sac ON ((sac.pot_id = sp.id)))
     LEFT JOIN account_totals acct ON ((acct.pot_id = sp.id)))
     LEFT JOIN allocation_totals alloc ON ((alloc.pot_id = sp.id)))
     LEFT JOIN reimbursement_totals reimb ON ((reimb.pot_id = sp.id)));
