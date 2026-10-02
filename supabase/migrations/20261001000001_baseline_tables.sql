-- ============================================================
-- SmartFinance baseline 02/09 -- Tables
-- ============================================================
-- Every table (columns, defaults, sequences) plus table/column comments. Constraints, indexes, triggers, RLS and grants follow in later files.
--
-- Generated 2026-10-01 by squashing the 107 historical migrations
-- (archived in supabase/migrations_archive/) into the final schema they
-- produce. To change the schema from now on, add a NEW migration after
-- these files -- never edit the baseline.

set check_function_bodies = false;

--
-- Name: feedback_messages; Type: TABLE; Schema: public
--

CREATE TABLE public.feedback_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feedback_id uuid NOT NULL,
    author_id uuid NOT NULL,
    message_type text DEFAULT 'reply'::text NOT NULL,
    is_admin_reply boolean DEFAULT false NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone,
    CONSTRAINT feedback_messages_body_check CHECK (((char_length(btrim(body)) >= 1) AND (char_length(btrim(body)) <= 5000))),
    CONSTRAINT feedback_messages_check CHECK (((edited_at IS NULL) OR (edited_at >= created_at))),
    CONSTRAINT feedback_messages_message_type_check CHECK ((message_type = ANY (ARRAY['reply'::text, 'internal_note'::text])))
);


--
-- Name: app_feedback; Type: TABLE; Schema: public
--

CREATE TABLE public.app_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    assigned_to uuid,
    resolved_in_release_id uuid,
    app_version text,
    platform text,
    app_context jsonb DEFAULT '{}'::jsonb NOT NULL,
    idempotency_key text NOT NULL,
    withdrawn_at timestamp with time zone,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_feedback_app_context_check CHECK ((jsonb_typeof(app_context) = 'object'::text)),
    CONSTRAINT app_feedback_app_context_check1 CHECK ((octet_length((app_context)::text) <= 16384)),
    CONSTRAINT app_feedback_app_version_check CHECK (((app_version IS NULL) OR ((char_length(btrim(app_version)) >= 1) AND (char_length(btrim(app_version)) <= 64)))),
    CONSTRAINT app_feedback_category_check CHECK ((category = ANY (ARRAY['bug'::text, 'feature_request'::text, 'feature'::text, 'improvement'::text, 'question'::text, 'other'::text]))),
    CONSTRAINT app_feedback_check CHECK (((withdrawn_at IS NULL) OR (status = ANY (ARRAY['withdrawn'::text, 'closed'::text])))),
    CONSTRAINT app_feedback_check1 CHECK (((status = 'resolved'::text) OR (resolved_at IS NULL))),
    CONSTRAINT app_feedback_description_check CHECK (((char_length(btrim(description)) >= 1) AND (char_length(btrim(description)) <= 10000))),
    CONSTRAINT app_feedback_idempotency_key_check CHECK (((char_length(idempotency_key) >= 8) AND (char_length(idempotency_key) <= 128))),
    CONSTRAINT app_feedback_platform_check CHECK (((platform IS NULL) OR (platform = ANY (ARRAY['android'::text, 'ios'::text, 'web'::text])))),
    CONSTRAINT app_feedback_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT app_feedback_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'under_review'::text, 'planned'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text, 'triaged'::text, 'waiting_for_user'::text, 'rejected'::text, 'withdrawn'::text]))),
    CONSTRAINT app_feedback_title_check CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 160)))
);


--
-- Name: transactions; Type: TABLE; Schema: public
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    account_id uuid NOT NULL,
    category_id uuid,
    transfer_group_id uuid,
    title text NOT NULL,
    notes text,
    amount numeric(14,2) NOT NULL,
    type public.transaction_type NOT NULL,
    transaction_date timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pot_id uuid,
    monthly_budget_run_id uuid,
    generated_by_rule_id uuid,
    budget_section public.monthly_budget_section,
    recurring_execution_id uuid,
    merchant_name text,
    import_batch_id uuid,
    import_source_row integer,
    import_fingerprint text,
    amount_enc bytea,
    title_enc bytea,
    notes_enc bytea,
    merchant_name_enc bytea,
    enc_version smallint DEFAULT 0 NOT NULL,
    is_split boolean DEFAULT false NOT NULL,
    replenishment_run_id uuid,
    planned_item_occurrence_id uuid,
    planned_item_occurrence_destination_id uuid,
    planned_item_transaction_role public.planned_item_transaction_role,
    original_source_type text,
    original_account_id uuid,
    original_pot_id uuid,
    reimbursement_id uuid,
    monthly_budget_batch_id uuid,
    CONSTRAINT transaction_import_provenance_complete CHECK ((((import_batch_id IS NULL) AND (import_source_row IS NULL) AND (import_fingerprint IS NULL)) OR ((import_batch_id IS NOT NULL) AND (import_source_row IS NOT NULL) AND (import_fingerprint IS NOT NULL)))),
    CONSTRAINT transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT transactions_import_source_row_check CHECK (((import_source_row IS NULL) OR (import_source_row >= 2))),
    CONSTRAINT transactions_original_source_shape_check CHECK ((((original_source_type IS NULL) AND (original_account_id IS NULL) AND (original_pot_id IS NULL)) OR ((original_source_type = 'account'::text) AND (original_account_id IS NOT NULL) AND (original_pot_id IS NULL)) OR ((original_source_type = 'pot'::text) AND (original_pot_id IS NOT NULL) AND (original_account_id IS NULL)))),
    CONSTRAINT transactions_original_source_type_check CHECK ((original_source_type = ANY (ARRAY['account'::text, 'pot'::text])))
);


--
-- Name: TABLE transactions; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.transactions IS 'Transactions remain household-member managed. Cross-household access is blocked by RLS through household_id membership checks.';


--
-- Name: COLUMN transactions.transfer_group_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.transfer_group_id IS 'Links two transactions representing an account transfer.';


--
-- Name: COLUMN transactions.pot_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.pot_id IS 'Optional link to a saving pot this transaction contributed to or was spent from.';


--
-- Name: COLUMN transactions.recurring_execution_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.recurring_execution_id IS 'Links a generated recurring transaction, including both legs of a transfer, to its execution record.';


--
-- Name: COLUMN transactions.amount_enc; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.amount_enc IS 'Ciphertext of amount, encrypted client-side with the household data key. NULL until this household completes the E2E migration (see household_encryption_status). Plaintext "amount" column is retained until a later, separate cleanup migration — see docs/e2e-encryption-plan.md §6.';


--
-- Name: COLUMN transactions.is_split; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.is_split IS 'True when this transaction''s funding source is broken down across multiple transaction_allocations rows. When true, account_id/pot_id on this row are only a representative/display value -- transaction_allocations is authoritative for balance math.';


--
-- Name: COLUMN transactions.replenishment_run_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.replenishment_run_id IS 'Historically (runs confirmed before this migration): set on the two transfer-leg transactions a confirmed run generated, never on the original expense transaction. Going forward: set directly on the covered transaction itself when a replenishment reassigns its origin -- a transaction only ever carries this when it was itself replenished.';


--
-- Name: COLUMN transactions.planned_item_occurrence_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.planned_item_occurrence_id IS 'Monthly Budget rebuild (Phase 2) lineage: the planned_item_occurrence this transaction was generated from, if any. on delete set null so deleting a planned occurrence never cascades into deleting real financial history.';


--
-- Name: COLUMN transactions.planned_item_occurrence_destination_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.planned_item_occurrence_destination_id IS 'Monthly Budget rebuild (Phase 2) lineage: the specific occurrence-destination leg this transaction settles, for multi-destination planned items. Null for a single-leg (plain_expense) transaction. on delete set null, same rationale as planned_item_occurrence_id.';


--
-- Name: COLUMN transactions.planned_item_transaction_role; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.planned_item_transaction_role IS 'Which leg of a planned item generation this transaction represents. Null for transactions with no Monthly Budget lineage.';


--
-- Name: COLUMN transactions.original_source_type; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.original_source_type IS 'Set once, the first time a replenishment reassigns this transaction''s account_id/pot_id -- never overwritten again (a transaction can only be replenished once, enforced by confirm_replenishment_run''s double-repayment guard). Null on a transaction that has never been replenished, including every transaction replenished under the pre-2026-09 transfer-creating model (those were never mutated, so they have nothing to snapshot).';


--
-- Name: COLUMN transactions.original_account_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.original_account_id IS 'The account_id this transaction was recorded against before a replenishment reassigned it. Set together with original_source_type = ''account'' (the only case the wizard currently produces -- a transaction is always originally attributed to an account, never directly to a pot).';


--
-- Name: COLUMN transactions.original_pot_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.original_pot_id IS 'Reserved for a future original_source_type = ''pot'' case. Always null today.';


--
-- Name: COLUMN transactions.reimbursement_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.reimbursement_id IS 'Set on the income transaction automatically created for an account reimbursement (transaction_reimbursements). Managed by sync_reimbursement_income_transaction -- deleted with the reimbursement, and its amount/account/date/type cannot be edited directly.';


--
-- Name: COLUMN transactions.monthly_budget_batch_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transactions.monthly_budget_batch_id IS 'The Monthly Budget "Create all transfers" batch that created this transaction (null for everything else). Undo deletes by this id only.';


--
-- Name: planned_item_occurrences; Type: TABLE; Schema: public
--

CREATE TABLE public.planned_item_occurrences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    planned_item_id uuid NOT NULL,
    household_id uuid NOT NULL,
    month date NOT NULL,
    status public.planned_item_occurrence_status DEFAULT 'planned'::public.planned_item_occurrence_status NOT NULL,
    expected_amount numeric(14,2) NOT NULL,
    expected_amount_enc bytea,
    source_account_id uuid,
    category_id uuid NOT NULL,
    is_estimate boolean NOT NULL,
    source_definition_version integer NOT NULL,
    is_overridden boolean DEFAULT false NOT NULL,
    confirmed_at timestamp with time zone,
    confirmed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    enc_version smallint DEFAULT 0 NOT NULL
);


--
-- Name: TABLE planned_item_occurrences; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.planned_item_occurrences IS 'One row per planned_items row per active month -- the resolved, per-month instance. source_definition_version snapshots planned_items.definition_version as it stood when this occurrence was generated/last resynced, so later edits to the definition do not silently rewrite history for months already generated or confirmed. is_overridden marks an occurrence a user has hand-edited away from what the definition would currently produce.';


--
-- Name: COLUMN planned_item_occurrences.source_account_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.planned_item_occurrences.source_account_id IS 'uuid, references accounts(id) -- snapshot of the planned item''s source account at generation time. Null for inflow occurrences, matching planned_items.source_account_id.';


--
-- Name: COLUMN planned_item_occurrences.source_definition_version; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.planned_item_occurrences.source_definition_version IS 'Snapshot of planned_items.definition_version at the time this occurrence was generated/last resynced. Used to detect that the definition has since changed underneath an already-generated occurrence.';


--
-- Name: feedback_email_outbox; Type: TABLE; Schema: public
--

CREATE TABLE public.feedback_email_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_id uuid NOT NULL,
    recipient_email text NOT NULL,
    template text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_key text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_at timestamp with time zone,
    locked_by text,
    sent_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_email_outbox_attempt_count_check CHECK (((attempt_count >= 0) AND (attempt_count <= 100))),
    CONSTRAINT feedback_email_outbox_check CHECK (((status = 'sent'::text) OR (sent_at IS NULL))),
    CONSTRAINT feedback_email_outbox_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text)),
    CONSTRAINT feedback_email_outbox_payload_check1 CHECK ((octet_length((payload)::text) <= 32768)),
    CONSTRAINT feedback_email_outbox_recipient_email_check CHECK ((POSITION(('@'::text) IN (recipient_email)) > 1)),
    CONSTRAINT feedback_email_outbox_source_key_check CHECK (((char_length(source_key) >= 8) AND (char_length(source_key) <= 255))),
    CONSTRAINT feedback_email_outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'retry'::text, 'sent'::text, 'dead'::text]))),
    CONSTRAINT feedback_email_outbox_template_check CHECK (((char_length(template) >= 1) AND (char_length(template) <= 80)))
);


--
-- Name: monthly_budget_runs; Type: TABLE; Schema: public
--

CREATE TABLE public.monthly_budget_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    budget_config_id uuid NOT NULL,
    month date NOT NULL,
    status public.monthly_budget_run_status DEFAULT 'draft'::public.monthly_budget_run_status NOT NULL,
    income_mode_snapshot public.household_income_mode DEFAULT 'shared'::public.household_income_mode NOT NULL,
    remaining_cash_strategy_snapshot public.remaining_cash_strategy DEFAULT 'keep'::public.remaining_cash_strategy NOT NULL,
    preview_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: monthly_budget_periods; Type: TABLE; Schema: public
--

CREATE TABLE public.monthly_budget_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    month date NOT NULL,
    status public.monthly_budget_period_status DEFAULT 'open'::public.monthly_budget_period_status NOT NULL,
    confirmed_at timestamp with time zone,
    confirmed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE monthly_budget_periods; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.monthly_budget_periods IS 'Month-level lock/gate for a household''s Monthly Budget. status = closed is purely derived (see maybe_close_monthly_budget_period()) -- application code only ever sets open or committed.';


--
-- Name: replenishment_runs; Type: TABLE; Schema: public
--

CREATE TABLE public.replenishment_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    status public.replenishment_run_status DEFAULT 'draft'::public.replenishment_run_status NOT NULL,
    title text,
    total_amount numeric(14,2) DEFAULT 0 NOT NULL,
    preview_snapshot jsonb,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    CONSTRAINT replenishment_runs_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


--
-- Name: TABLE replenishment_runs; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.replenishment_runs IS 'A replenishment (reposição) operation: a set of expense transactions that need repaying, plus the accounts/pots that funded the repayment.';


--
-- Name: COLUMN replenishment_runs.preview_snapshot; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.replenishment_runs.preview_snapshot IS 'The exact preview (selected transactions, sources, computed transfers) the user confirmed. Used both as an audit trail and to guard confirm_replenishment_run against a stale/tampered payload.';


--
-- Name: households; Type: TABLE; Schema: public
--

CREATE TABLE public.households (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    income_mode public.household_income_mode DEFAULT 'shared'::public.household_income_mode NOT NULL,
    remaining_cash_strategy public.remaining_cash_strategy DEFAULT 'keep'::public.remaining_cash_strategy NOT NULL,
    fixed_remaining_cash_amount numeric(14,2) DEFAULT 0 NOT NULL,
    excess_cash_distribution_method public.excess_cash_distribution_method DEFAULT 'even_split'::public.excess_cash_distribution_method NOT NULL
);


--
-- Name: feedback_attachments; Type: TABLE; Schema: public
--

CREATE TABLE public.feedback_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feedback_id uuid NOT NULL,
    message_id uuid,
    uploaded_by uuid NOT NULL,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint NOT NULL,
    width integer,
    height integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_attachments_file_name_check CHECK (((char_length(file_name) >= 1) AND (char_length(file_name) <= 255))),
    CONSTRAINT feedback_attachments_file_size_check CHECK (((file_size >= 1) AND (file_size <= 10485760))),
    CONSTRAINT feedback_attachments_height_check CHECK (((height IS NULL) OR ((height >= 1) AND (height <= 20000)))),
    CONSTRAINT feedback_attachments_mime_type_check CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]))),
    CONSTRAINT feedback_attachments_storage_path_check CHECK (((char_length(storage_path) >= 10) AND (char_length(storage_path) <= 1024))),
    CONSTRAINT feedback_attachments_width_check CHECK (((width IS NULL) OR ((width >= 1) AND (width <= 20000))))
);


--
-- Name: monthly_budget_batches; Type: TABLE; Schema: public
--

CREATE TABLE public.monthly_budget_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    month date NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    income_count integer DEFAULT 0 NOT NULL,
    income_total numeric(14,2) DEFAULT 0 NOT NULL,
    transfer_count integer DEFAULT 0 NOT NULL,
    transfer_total numeric(14,2) DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    undone_by uuid,
    undone_at timestamp with time zone,
    CONSTRAINT monthly_budget_batches_status_check CHECK ((status = ANY (ARRAY['active'::text, 'undone'::text])))
);


--
-- Name: TABLE monthly_budget_batches; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.monthly_budget_batches IS 'One row per Monthly Budget "Create all transfers" action. transactions.monthly_budget_batch_id links every transaction it created, so "Undo batch" removes exactly those. See 20260929120000_monthly_budget_batches.sql.';


--
-- Name: accounts; Type: TABLE; Schema: public
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    owner_profile_id uuid,
    name text NOT NULL,
    type public.account_type NOT NULL,
    currency public.currency_code DEFAULT 'EUR'::public.currency_code NOT NULL,
    initial_balance numeric(14,2) DEFAULT 0 NOT NULL,
    icon text,
    color text,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    initial_balance_enc bytea,
    enc_version smallint DEFAULT 0 NOT NULL
);


--
-- Name: TABLE accounts; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.accounts IS 'Household members can manage accounts by current product design; owner/shared account semantics are enforced in application flows.';


--
-- Name: COLUMN accounts.owner_profile_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.accounts.owner_profile_id IS 'NULL indicates a shared household account.';


--
-- Name: COLUMN accounts.initial_balance; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.accounts.initial_balance IS 'Opening balance. Current balance is calculated from transactions.';


--
-- Name: transaction_allocations; Type: TABLE; Schema: public
--

CREATE TABLE public.transaction_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    source_type text NOT NULL,
    account_id uuid,
    pot_id uuid,
    amount numeric(14,2) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    original_source_type text,
    original_account_id uuid,
    original_pot_id uuid,
    replenishment_run_id uuid,
    CONSTRAINT transaction_allocations_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT transaction_allocations_check CHECK ((((source_type = 'account'::text) AND (account_id IS NOT NULL) AND (pot_id IS NULL)) OR ((source_type = 'pot'::text) AND (pot_id IS NOT NULL) AND (account_id IS NULL)))),
    CONSTRAINT transaction_allocations_original_source_shape_check CHECK ((((original_source_type IS NULL) AND (original_account_id IS NULL) AND (original_pot_id IS NULL)) OR ((original_source_type = 'account'::text) AND (original_account_id IS NOT NULL) AND (original_pot_id IS NULL)) OR ((original_source_type = 'pot'::text) AND (original_pot_id IS NOT NULL) AND (original_account_id IS NULL)))),
    CONSTRAINT transaction_allocations_original_source_type_check CHECK ((original_source_type = ANY (ARRAY['account'::text, 'pot'::text]))),
    CONSTRAINT transaction_allocations_sort_order_check CHECK ((sort_order >= 0)),
    CONSTRAINT transaction_allocations_source_type_check CHECK ((source_type = ANY (ARRAY['account'::text, 'pot'::text])))
);


--
-- Name: TABLE transaction_allocations; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.transaction_allocations IS 'Funding-source breakdown for a split transaction. amount is the source of truth; percentage is always derived client-side (never stored). Requires transactions.is_split = true and >= 2 rows summing exactly to transactions.amount -- enforced by enforce_transaction_allocations_integrity below. The only intended write path is save_transaction_allocations().';


--
-- Name: COLUMN transaction_allocations.original_source_type; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transaction_allocations.original_source_type IS 'Same idea as transactions.original_source_type, scoped to this one allocation row: which account/pot this specific funding slice came from before a replenishment reassigned it.';


--
-- Name: COLUMN transaction_allocations.replenishment_run_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transaction_allocations.replenishment_run_id IS 'The run that reassigned this allocation row''s source, if any -- audit trail only, set together with original_source_type/original_account_id.';


--
-- Name: account_reconciliations; Type: TABLE; Schema: public
--

CREATE TABLE public.account_reconciliations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    account_id uuid NOT NULL,
    statement_date date NOT NULL,
    statement_balance numeric(14,2) NOT NULL,
    ledger_balance numeric(14,2) NOT NULL,
    difference numeric(14,2) GENERATED ALWAYS AS ((statement_balance - ledger_balance)) STORED,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    statement_balance_enc bytea,
    ledger_balance_enc bytea,
    enc_version smallint DEFAULT 0 NOT NULL
);


--
-- Name: TABLE account_reconciliations; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.account_reconciliations IS 'Immutable statement checkpoints. Difference records statement minus ledger balance without altering transaction history.';


--
-- Name: app_notifications; Type: TABLE; Schema: public
--

CREATE TABLE public.app_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    recipient_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_key text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    push_dispatch_status text DEFAULT 'pending'::text NOT NULL,
    push_dispatch_attempted_at timestamp with time zone,
    native_push_dispatched_at timestamp with time zone,
    web_push_dispatched_at timestamp with time zone,
    push_dispatched_at timestamp with time zone,
    CONSTRAINT app_notifications_push_dispatch_status_check CHECK ((push_dispatch_status = ANY (ARRAY['pending'::text, 'processing'::text, 'delivered'::text])))
);


--
-- Name: app_releases; Type: TABLE; Schema: public
--

CREATE TABLE public.app_releases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text NOT NULL,
    build_number text DEFAULT 'unknown'::text NOT NULL,
    channel text DEFAULT 'production'::text NOT NULL,
    commit_sha text,
    platform text DEFAULT 'all'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    title text,
    release_notes text,
    is_active boolean DEFAULT false NOT NULL,
    released_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_releases_build_number_check CHECK (((char_length(btrim(build_number)) >= 1) AND (char_length(btrim(build_number)) <= 64))),
    CONSTRAINT app_releases_channel_check CHECK ((channel = ANY (ARRAY['development'::text, 'preview'::text, 'production'::text]))),
    CONSTRAINT app_releases_check CHECK (((status <> 'published'::text) OR (released_at IS NOT NULL))),
    CONSTRAINT app_releases_platform_check CHECK ((platform = ANY (ARRAY['all'::text, 'android'::text, 'ios'::text, 'web'::text]))),
    CONSTRAINT app_releases_release_notes_check CHECK (((release_notes IS NULL) OR (char_length(release_notes) <= 20000))),
    CONSTRAINT app_releases_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'withdrawn'::text]))),
    CONSTRAINT app_releases_title_check CHECK (((title IS NULL) OR ((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 160)))),
    CONSTRAINT app_releases_version_check CHECK (((char_length(btrim(version)) >= 1) AND (char_length(btrim(version)) <= 64)))
);


--
-- Name: attachments; Type: TABLE; Schema: public
--

CREATE TABLE public.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint NOT NULL,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attachments_file_size_check CHECK ((file_size > 0))
);


--
-- Name: TABLE attachments; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.attachments IS 'Attachment metadata is protected through transaction household membership. Storage objects are additionally restricted by bucket path policies.';


--
-- Name: audit_logs; Type: TABLE; Schema: public
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    profile_id uuid,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_logs_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.audit_logs IS 'Tracks changes made to financial records.';


--
-- Name: budget_configs; Type: TABLE; Schema: public
--

CREATE TABLE public.budget_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: budget_rule_allocations; Type: TABLE; Schema: public
--

CREATE TABLE public.budget_rule_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid NOT NULL,
    destination_account_id uuid NOT NULL,
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category_id uuid,
    amount_enc bytea,
    enc_version smallint DEFAULT 0 NOT NULL,
    CONSTRAINT budget_rule_allocations_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: budget_rules; Type: TABLE; Schema: public
--

CREATE TABLE public.budget_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_config_id uuid NOT NULL,
    name text NOT NULL,
    section public.monthly_budget_section NOT NULL,
    source_account_id uuid NOT NULL,
    owner_member_id uuid,
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    frequency public.recurring_frequency DEFAULT 'monthly'::public.recurring_frequency NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    active_months smallint[] DEFAULT '{}'::smallint[] NOT NULL,
    active_from_month smallint,
    active_to_month smallint,
    deleted_at timestamp with time zone,
    allocation_mode public.budget_rule_allocation_mode DEFAULT 'equal_split'::public.budget_rule_allocation_mode NOT NULL,
    amount_enc bytea,
    enc_version smallint DEFAULT 0 NOT NULL,
    CONSTRAINT budget_rules_active_from_month_check CHECK (((active_from_month IS NULL) OR ((active_from_month >= 1) AND (active_from_month <= 12)))),
    CONSTRAINT budget_rules_active_to_month_check CHECK (((active_to_month IS NULL) OR ((active_to_month >= 1) AND (active_to_month <= 12)))),
    CONSTRAINT budget_rules_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: categories; Type: TABLE; Schema: public
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    name text NOT NULL,
    type public.category_type NOT NULL,
    icon text,
    color text,
    parent_id uuid,
    is_default boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    is_discretionary boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN categories.is_discretionary; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.categories.is_discretionary IS 'Household-set flag marking this category as discretionary/non-essential spending (used by spending breakdowns like the Wage Flow chart). Meaningful for expense-type categories; ignored for income/account categories.';


--
-- Name: category_budgets; Type: TABLE; Schema: public
--

CREATE TABLE public.category_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    category_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    effective_month date NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT category_budgets_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: TABLE category_budgets; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.category_budgets IS 'Monthly spending limit for a category, effective-dated so changing a limit never rewrites an already-reported month. The active limit for a category in month Y is the row with the latest effective_month <= Y (see resolveActiveCategoryBudgets in category-budget-view-model.ts). "Amount spent" is computed separately, client-side, from transactions + planned_item_occurrences -- this table only stores the limit itself.';


--
-- Name: COLUMN category_budgets.effective_month; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.category_budgets.effective_month IS 'First-of-month date this limit takes effect from (inclusive), applying to every later month until a newer row for the same category_id supersedes it. Rows are immutable in practice -- the app always inserts a new row to change a limit, never updates one.';


--
-- Name: dashboard_network_configs; Type: TABLE; Schema: public
--

CREATE TABLE public.dashboard_network_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    account_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    investment_account_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    savings_account_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    pot_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE dashboard_network_configs; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.dashboard_network_configs IS 'Per-profile display preference: which accounts/pots appear as nodes in the Dashboard 3D accounts network. One row per profile.';


--
-- Name: COLUMN dashboard_network_configs.account_ids; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.dashboard_network_configs.account_ids IS 'Every-day accounts (bank, cash, credit card) selected to appear in the network.';


--
-- Name: COLUMN dashboard_network_configs.investment_account_ids; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.dashboard_network_configs.investment_account_ids IS 'Investment/ppr accounts selected to appear in the network.';


--
-- Name: COLUMN dashboard_network_configs.savings_account_ids; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.dashboard_network_configs.savings_account_ids IS 'Savings accounts selected to appear in the network.';


--
-- Name: COLUMN dashboard_network_configs.pot_ids; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.dashboard_network_configs.pot_ids IS 'Saving pots selected to appear in the network.';


--
-- Name: feedback_email_attempts; Type: TABLE; Schema: public
--

CREATE TABLE public.feedback_email_attempts (
    id bigint NOT NULL,
    outbox_id uuid NOT NULL,
    attempt_number integer NOT NULL,
    succeeded boolean NOT NULL,
    provider_message_id text,
    error_code text,
    error_message text,
    provider_response jsonb DEFAULT '{}'::jsonb NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_email_attempts_attempt_number_check CHECK ((attempt_number > 0)),
    CONSTRAINT feedback_email_attempts_provider_response_check CHECK ((jsonb_typeof(provider_response) = 'object'::text)),
    CONSTRAINT feedback_email_attempts_provider_response_check1 CHECK ((octet_length((provider_response)::text) <= 32768))
);


--
-- Name: feedback_email_attempts_id_seq; Type: SEQUENCE; Schema: public
--

ALTER TABLE public.feedback_email_attempts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.feedback_email_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: feedback_events; Type: TABLE; Schema: public
--

CREATE TABLE public.feedback_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feedback_id uuid NOT NULL,
    actor_id uuid,
    event_type text NOT NULL,
    from_value text,
    to_value text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    visible_to_author boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_events_event_type_check CHECK ((event_type = ANY (ARRAY['submitted'::text, 'author_updated'::text, 'withdrawn'::text, 'status_changed'::text, 'admin_updated'::text, 'reply_added'::text, 'internal_note_added'::text, 'attachment_added'::text, 'attachment_removed'::text, 'priority_changed'::text, 'assigned'::text, 'message_added'::text, 'attachment_deleted'::text]))),
    CONSTRAINT feedback_events_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text)),
    CONSTRAINT feedback_events_metadata_check1 CHECK ((octet_length((metadata)::text) <= 16384))
);


--
-- Name: feedback_rate_limit_events; Type: TABLE; Schema: public
--

CREATE TABLE public.feedback_rate_limit_events (
    id bigint NOT NULL,
    actor_id uuid NOT NULL,
    action text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_rate_limit_events_action_check CHECK (((char_length(action) >= 1) AND (char_length(action) <= 64)))
);


--
-- Name: feedback_rate_limit_events_id_seq; Type: SEQUENCE; Schema: public
--

ALTER TABLE public.feedback_rate_limit_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.feedback_rate_limit_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: feedback_rpc_requests; Type: TABLE; Schema: public
--

CREATE TABLE public.feedback_rpc_requests (
    actor_id uuid NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    response jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_rpc_requests_idempotency_key_check CHECK (((char_length(idempotency_key) >= 8) AND (char_length(idempotency_key) <= 128))),
    CONSTRAINT feedback_rpc_requests_operation_check CHECK (((char_length(operation) >= 1) AND (char_length(operation) <= 64))),
    CONSTRAINT feedback_rpc_requests_response_check CHECK ((jsonb_typeof(response) = 'object'::text))
);


--
-- Name: household_encryption_status; Type: TABLE; Schema: public
--

CREATE TABLE public.household_encryption_status (
    household_id uuid NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    enabled_at timestamp with time zone,
    enabled_by uuid,
    migration_status text DEFAULT 'not_started'::text NOT NULL,
    migration_progress jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT household_encryption_status_migration_status_check CHECK ((migration_status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])))
);


--
-- Name: TABLE household_encryption_status; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.household_encryption_status IS 'One row per household. migration_progress is a per-table row-count/cursor map used by the client-side migration tool to resume after interruption — see docs/e2e-encryption-plan.md §5.';


--
-- Name: household_invitations; Type: TABLE; Schema: public
--

CREATE TABLE public.household_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    email text NOT NULL,
    role public.household_role DEFAULT 'member'::public.household_role NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: household_key_wraps; Type: TABLE; Schema: public
--

CREATE TABLE public.household_key_wraps (
    household_id uuid NOT NULL,
    member_user_id uuid NOT NULL,
    wrapped_household_key bytea NOT NULL,
    wrapped_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE household_key_wraps; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.household_key_wraps IS 'Per-member wrap of a household''s data key (HDK). wrapped_by_user_id is an audit trail of which member performed the wrap (see docs/e2e-encryption-plan.md §2.2).';


--
-- Name: household_members; Type: TABLE; Schema: public
--

CREATE TABLE public.household_members (
    household_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.household_role NOT NULL,
    status public.household_member_status NOT NULL,
    joined_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE household_members; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.household_members IS 'Membership table. Policies intentionally allow household admins to manage members, while owner-only destructive actions stay enforced by RPCs.';


--
-- Name: income_sources; Type: TABLE; Schema: public
--

CREATE TABLE public.income_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    name text NOT NULL,
    notes text,
    amount numeric(14,2) NOT NULL,
    category_id uuid,
    destination_account_id uuid NOT NULL,
    owner_member_id uuid,
    recurrence_type public.recurring_expense_recurrence_type DEFAULT 'monthly'::public.recurring_expense_recurrence_type NOT NULL,
    recurrence_months smallint[] DEFAULT '{}'::smallint[] NOT NULL,
    recurrence_interval_months integer,
    one_time_month date,
    start_date date NOT NULL,
    end_date date,
    is_paused boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT income_sources_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT income_sources_end_date_after_start CHECK (((end_date IS NULL) OR (end_date >= start_date))),
    CONSTRAINT income_sources_recurrence_months_valid CHECK ((recurrence_months <@ ARRAY[(1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint, (7)::smallint, (8)::smallint, (9)::smallint, (10)::smallint, (11)::smallint, (12)::smallint])),
    CONSTRAINT income_sources_recurrence_shape CHECK ((((recurrence_type = 'monthly'::public.recurring_expense_recurrence_type) AND (recurrence_months = '{}'::smallint[]) AND (recurrence_interval_months IS NULL) AND (one_time_month IS NULL)) OR ((recurrence_type = 'specific_months'::public.recurring_expense_recurrence_type) AND (array_length(recurrence_months, 1) > 0) AND (recurrence_interval_months IS NULL) AND (one_time_month IS NULL)) OR ((recurrence_type = 'interval'::public.recurring_expense_recurrence_type) AND (recurrence_interval_months IS NOT NULL) AND (recurrence_interval_months > 0) AND (recurrence_months = '{}'::smallint[]) AND (one_time_month IS NULL)) OR ((recurrence_type = 'one_time'::public.recurring_expense_recurrence_type) AND (one_time_month IS NOT NULL) AND (recurrence_months = '{}'::smallint[]) AND (recurrence_interval_months IS NULL))))
);


--
-- Name: TABLE income_sources; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.income_sources IS 'Named, recurring or one-time income sources feeding the Monthly Budget overview (Salary, Meal Allowance, Rent Income, Bonus, ...). Planning data -- see monthly_income_inputs for what was actually credited when a month is confirmed.';


--
-- Name: COLUMN income_sources.destination_account_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.income_sources.destination_account_id IS 'Account this income is expected to be credited to.';


--
-- Name: COLUMN income_sources.owner_member_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.income_sources.owner_member_id IS 'Household member this income belongs to. Null means shared/household income, same convention as budget_rules.owner_member_id.';


--
-- Name: COLUMN income_sources.one_time_month; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.income_sources.one_time_month IS 'First day of the single month this income happens, e.g. 2026-12-01. Only set when recurrence_type = one_time.';


--
-- Name: invitation_email_logs; Type: TABLE; Schema: public
--

CREATE TABLE public.invitation_email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    recipient_email text NOT NULL,
    recipient_role public.household_role NOT NULL,
    invite_link text NOT NULL,
    provider text DEFAULT 'resend'::text NOT NULL,
    provider_message_id text,
    status text NOT NULL,
    error_message text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invitation_email_logs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: merchant_aliases; Type: TABLE; Schema: public
--

CREATE TABLE public.merchant_aliases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    alias text NOT NULL,
    normalized_alias text NOT NULL,
    merchant_name text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    alias_enc bytea,
    normalized_alias_enc bytea,
    merchant_name_enc bytea,
    enc_version smallint DEFAULT 0 NOT NULL,
    CONSTRAINT merchant_aliases_alias_check CHECK (((length(btrim(alias)) >= 1) AND (length(btrim(alias)) <= 240))),
    CONSTRAINT merchant_aliases_merchant_name_check CHECK (((length(btrim(merchant_name)) >= 1) AND (length(btrim(merchant_name)) <= 160))),
    CONSTRAINT merchant_aliases_normalized_alias_check CHECK (((length(btrim(normalized_alias)) >= 1) AND (length(btrim(normalized_alias)) <= 240)))
);


--
-- Name: TABLE merchant_aliases; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.merchant_aliases IS 'Household-specific mappings from bank descriptions to canonical merchants.';


--
-- Name: transaction_reimbursements; Type: TABLE; Schema: public
--

CREATE TABLE public.transaction_reimbursements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    payer_name text NOT NULL,
    amount numeric(14,2) NOT NULL,
    amount_enc text,
    enc_version integer DEFAULT 0 NOT NULL,
    note text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source_type text,
    account_id uuid,
    pot_id uuid,
    received_on date DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT transaction_reimbursements_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT transaction_reimbursements_payer_name_check CHECK ((length(btrim(payer_name)) > 0)),
    CONSTRAINT transaction_reimbursements_source_target_check CHECK ((((source_type IS NULL) AND (account_id IS NULL) AND (pot_id IS NULL)) OR ((source_type = 'account'::text) AND (account_id IS NOT NULL) AND (pot_id IS NULL)) OR ((source_type = 'pot'::text) AND (pot_id IS NOT NULL) AND (account_id IS NULL)))),
    CONSTRAINT transaction_reimbursements_source_type_check CHECK ((source_type = ANY (ARRAY['account'::text, 'pot'::text])))
);


--
-- Name: TABLE transaction_reimbursements; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.transaction_reimbursements IS 'Money a third party paid back toward one expense transaction. Sum(amount) for a transaction can exceed the transaction''s own amount (the payer covered more than the expense cost); the resulting effective amount then goes negative -- see transaction_effective_amounts.';


--
-- Name: COLUMN transaction_reimbursements.amount_enc; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transaction_reimbursements.amount_enc IS 'Reserved for the in-progress E2E-encryption migration (docs/e2e-encryption-plan.md). Unused today, mirrors the amount_enc/enc_version shape already present on every other money column in this schema.';


--
-- Name: COLUMN transaction_reimbursements.source_type; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transaction_reimbursements.source_type IS 'Which of the household''s own accounts/pots this reimbursement''s money landed in. Null on a legacy payer-name-only row.';


--
-- Name: COLUMN transaction_reimbursements.account_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transaction_reimbursements.account_id IS 'Set when source_type = ''account''. The account the reimbursement was deposited into.';


--
-- Name: COLUMN transaction_reimbursements.pot_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transaction_reimbursements.pot_id IS 'Set when source_type = ''pot''. The saving pot the reimbursement was deposited into.';


--
-- Name: COLUMN transaction_reimbursements.received_on; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.transaction_reimbursements.received_on IS 'Date the repayment was received. Dates the linked income transaction (account reimbursements). Backfilled from the expense date for rows created before this column existed.';


--
-- Name: monthly_income_inputs; Type: TABLE; Schema: public
--

CREATE TABLE public.monthly_income_inputs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    monthly_budget_run_id uuid NOT NULL,
    member_id uuid,
    cash_account_id uuid NOT NULL,
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    available_month date NOT NULL,
    amount_enc bytea,
    enc_version smallint DEFAULT 0 NOT NULL,
    income_source_id uuid,
    name text,
    category_id uuid,
    CONSTRAINT monthly_income_inputs_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT monthly_income_inputs_available_month_first_day CHECK ((available_month = (date_trunc('month'::text, (available_month)::timestamp with time zone))::date))
);


--
-- Name: planned_item_destinations; Type: TABLE; Schema: public
--

CREATE TABLE public.planned_item_destinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    planned_item_id uuid NOT NULL,
    destination_account_id uuid NOT NULL,
    amount numeric(14,2),
    amount_enc bytea,
    percent numeric(5,2),
    category_id uuid,
    sort_order smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    enc_version smallint DEFAULT 0 NOT NULL,
    CONSTRAINT planned_item_destinations_percent_check CHECK (((percent > (0)::numeric) AND (percent <= (100)::numeric)))
);


--
-- Name: TABLE planned_item_destinations; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.planned_item_destinations IS 'Template-level fan-out of a planned_items row across destination accounts. amount is populated only when the parent''s allocation_mode = custom_amount; percent only when custom_percent. equal_split/single destinations carry neither -- there is nothing stored to sum at the template level for those modes.';


--
-- Name: COLUMN planned_item_destinations.enc_version; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.planned_item_destinations.enc_version IS 'Shared per-row E2E encryption marker for amount_enc, same convention as planned_items.enc_version.';


--
-- Name: planned_item_matches; Type: TABLE; Schema: public
--

CREATE TABLE public.planned_item_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    occurrence_id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    matched_by uuid,
    matched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE planned_item_matches; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.planned_item_matches IS 'Reconciliation link between an estimate planned_item_occurrence and the real transaction that settled it. transaction_id is unique (added in architecture review) so one real transaction can never be matched to more than one occurrence.';


--
-- Name: planned_item_occurrence_destinations; Type: TABLE; Schema: public
--

CREATE TABLE public.planned_item_occurrence_destinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    occurrence_id uuid NOT NULL,
    planned_item_destination_id uuid,
    destination_account_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    amount_enc bytea,
    category_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    enc_version smallint DEFAULT 0 NOT NULL
);


--
-- Name: TABLE planned_item_occurrence_destinations; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.planned_item_occurrence_destinations IS 'Resolved (always-concrete) per-account split for one occurrence, this month. No generated_transaction_id column by design -- transaction lineage lives on transactions.planned_item_occurrence_destination_id / transactions.planned_item_occurrence_id instead.';


--
-- Name: planned_items; Type: TABLE; Schema: public
--

CREATE TABLE public.planned_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    name text NOT NULL,
    name_enc bytea,
    direction public.planned_item_direction NOT NULL,
    amount numeric(14,2) NOT NULL,
    amount_enc bytea,
    source_account_id uuid,
    category_id uuid NOT NULL,
    owner_member_id uuid,
    is_estimate boolean DEFAULT false NOT NULL,
    allocation_mode public.planned_item_allocation_mode DEFAULT 'single'::public.planned_item_allocation_mode NOT NULL,
    recurrence_type public.planned_item_recurrence_type DEFAULT 'monthly'::public.planned_item_recurrence_type NOT NULL,
    recurrence_months smallint[],
    recurrence_interval_months smallint,
    one_time_month date,
    start_month date,
    end_month date,
    is_active boolean DEFAULT true NOT NULL,
    definition_version integer DEFAULT 1 NOT NULL,
    notes text,
    notes_enc bytea,
    deleted_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    enc_version smallint DEFAULT 0 NOT NULL,
    CONSTRAINT planned_items_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT planned_items_recurrence_months_valid CHECK (((recurrence_months IS NULL) OR (recurrence_months <@ ARRAY[(1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint, (7)::smallint, (8)::smallint, (9)::smallint, (10)::smallint, (11)::smallint, (12)::smallint]))),
    CONSTRAINT planned_items_recurrence_shape CHECK ((((recurrence_type = 'monthly'::public.planned_item_recurrence_type) AND (COALESCE(recurrence_months, '{}'::smallint[]) = '{}'::smallint[]) AND (recurrence_interval_months IS NULL) AND (one_time_month IS NULL)) OR ((recurrence_type = 'specific_months'::public.planned_item_recurrence_type) AND (recurrence_months IS NOT NULL) AND (array_length(recurrence_months, 1) > 0) AND (recurrence_interval_months IS NULL) AND (one_time_month IS NULL)) OR ((recurrence_type = 'interval'::public.planned_item_recurrence_type) AND (recurrence_interval_months IS NOT NULL) AND (recurrence_interval_months > 0) AND (COALESCE(recurrence_months, '{}'::smallint[]) = '{}'::smallint[]) AND (one_time_month IS NULL)) OR ((recurrence_type = 'one_time'::public.planned_item_recurrence_type) AND (one_time_month IS NOT NULL) AND (COALESCE(recurrence_months, '{}'::smallint[]) = '{}'::smallint[]) AND (recurrence_interval_months IS NULL)))),
    CONSTRAINT planned_items_source_account_by_direction CHECK ((((direction = 'outflow'::public.planned_item_direction) AND (source_account_id IS NOT NULL)) OR ((direction = 'inflow'::public.planned_item_direction) AND (source_account_id IS NULL))))
);


--
-- Name: TABLE planned_items; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.planned_items IS 'Definition of a planned, recurring or one-time expense/income for the Monthly Budget rebuild (Phase 2). Ground-up replacement for budget_rules/income_sources/recurring_transactions in this domain -- those tables are migrated away from in a later phase, not this one.';


--
-- Name: COLUMN planned_items.category_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.planned_items.category_id IS 'Mandatory by design (Phase 2 architecture review) -- every planned item must be categorized, unlike the optional category on income_sources/budget_rule_allocations.';


--
-- Name: COLUMN planned_items.definition_version; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.planned_items.definition_version IS 'Bumped whenever a change to this row (amount, source_account_id, category_id, allocation_mode) or to its destinations would invalidate the snapshot already captured on existing planned_item_occurrences. See planned_item_occurrences.source_definition_version.';


--
-- Name: COLUMN planned_items.enc_version; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.planned_items.enc_version IS 'Shared per-row E2E encryption marker for this table''s *_enc columns (name_enc, amount_enc, notes_enc), same convention as budget_rules.enc_version / transactions.enc_version (see 20260814120000_e2e_encryption_foundation.sql). 0 = plaintext only / not yet migrated, 1 = ciphertext populated.';


--
-- Name: platform_admins; Type: TABLE; Schema: public
--

CREATE TABLE public.platform_admins (
    user_id uuid NOT NULL,
    role text DEFAULT 'support'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT platform_admins_role_check CHECK ((role = ANY (ARRAY['support'::text, 'admin'::text, 'super_admin'::text])))
);


--
-- Name: TABLE platform_admins; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.platform_admins IS 'Platform-wide support administrators. Membership is managed only by service_role/database operators.';


--
-- Name: profiles; Type: TABLE; Schema: public
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    preferred_currency text DEFAULT 'EUR'::text NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    timezone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    default_household_id uuid,
    onboarding_guides jsonb DEFAULT '{}'::jsonb NOT NULL,
    theme text DEFAULT 'dark'::text NOT NULL,
    CONSTRAINT profiles_onboarding_guides_is_object CHECK ((jsonb_typeof(onboarding_guides) = 'object'::text)),
    CONSTRAINT profiles_theme_is_valid CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text, 'blue'::text, 'ultra'::text, 'system'::text])))
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users.';


--
-- Name: COLUMN profiles.preferred_currency; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.profiles.preferred_currency IS 'ISO 4217 currency code (EUR, USD, GBP...)';


--
-- Name: COLUMN profiles.locale; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.profiles.locale IS 'Preferred locale (en, pt-PT, es...)';


--
-- Name: COLUMN profiles.timezone; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.profiles.timezone IS 'IANA timezone (Europe/Lisbon, Europe/Madrid...)';


--
-- Name: COLUMN profiles.onboarding_guides; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.profiles.onboarding_guides IS 'Map of onboarding guide keys to the latest completed guide version for the profile.';


--
-- Name: COLUMN profiles.theme; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.profiles.theme IS 'Preferred UI theme (light, dark, blue, ultra, system).';


--
-- Name: push_devices; Type: TABLE; Schema: public
--

CREATE TABLE public.push_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    expo_push_token text NOT NULL,
    platform text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT push_devices_platform_check CHECK ((platform = ANY (ARRAY['android'::text, 'ios'::text])))
);


--
-- Name: recurring_expense_matches; Type: TABLE; Schema: public
--

CREATE TABLE public.recurring_expense_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recurring_expense_id uuid NOT NULL,
    occurrence_month date NOT NULL,
    transaction_id uuid NOT NULL,
    matched_by uuid,
    matched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE recurring_expense_matches; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.recurring_expense_matches IS 'Manual link from a planned recurring-expense occurrence to the real transaction that fulfilled it, so the forecast and the actual expense are not both shown as outstanding.';


--
-- Name: COLUMN recurring_expense_matches.occurrence_month; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_expense_matches.occurrence_month IS 'First day of the calendar month this occurrence belongs to (e.g. 2026-03-01), not the transaction date itself.';


--
-- Name: recurring_expenses; Type: TABLE; Schema: public
--

CREATE TABLE public.recurring_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    name text NOT NULL,
    notes text,
    amount numeric(14,2) NOT NULL,
    category_id uuid,
    account_id uuid NOT NULL,
    recurrence_type public.recurring_expense_recurrence_type DEFAULT 'monthly'::public.recurring_expense_recurrence_type NOT NULL,
    recurrence_months smallint[] DEFAULT '{}'::smallint[] NOT NULL,
    recurrence_interval_months integer,
    start_date date NOT NULL,
    end_date date,
    is_paused boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT recurring_expenses_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT recurring_expenses_end_date_after_start CHECK (((end_date IS NULL) OR (end_date >= start_date))),
    CONSTRAINT recurring_expenses_recurrence_months_valid CHECK ((recurrence_months <@ ARRAY[(1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint, (7)::smallint, (8)::smallint, (9)::smallint, (10)::smallint, (11)::smallint, (12)::smallint])),
    CONSTRAINT recurring_expenses_recurrence_shape CHECK ((((recurrence_type = 'monthly'::public.recurring_expense_recurrence_type) AND (recurrence_months = '{}'::smallint[]) AND (recurrence_interval_months IS NULL)) OR ((recurrence_type = 'specific_months'::public.recurring_expense_recurrence_type) AND (array_length(recurrence_months, 1) > 0) AND (recurrence_interval_months IS NULL)) OR ((recurrence_type = 'interval'::public.recurring_expense_recurrence_type) AND (recurrence_interval_months IS NOT NULL) AND (recurrence_interval_months > 0) AND (recurrence_months = '{}'::smallint[]))))
);


--
-- Name: TABLE recurring_expenses; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.recurring_expenses IS 'Forecast-only recurring/planned expenses shown in the Monthly Budget overview. Never auto-generates real transactions; see recurring_expense_matches for linking an actual transaction to an occurrence once it happens.';


--
-- Name: COLUMN recurring_expenses.account_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_expenses.account_id IS 'Account the expense is normally expected to be paid from. Informational for forecasting only -- no money is moved automatically.';


--
-- Name: COLUMN recurring_expenses.recurrence_months; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_expenses.recurrence_months IS 'Calendar months (1-12) this rule is due in, e.g. {3,6,9,12}. Only set when recurrence_type = specific_months.';


--
-- Name: COLUMN recurring_expenses.recurrence_interval_months; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_expenses.recurrence_interval_months IS 'Recurs every N months starting from start_date''s month, e.g. 2 = every other month. Only set when recurrence_type = interval.';


--
-- Name: recurring_run_executions; Type: TABLE; Schema: public
--

CREATE TABLE public.recurring_run_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    recurring_transaction_id uuid NOT NULL,
    scheduled_for date NOT NULL,
    status public.recurring_execution_status DEFAULT 'pending'::public.recurring_execution_status NOT NULL,
    skip_reason text,
    error_message text,
    transaction_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    attempted_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recurring_run_executions_status_details_check CHECK ((((status = 'skipped'::public.recurring_execution_status) AND (skip_reason IS NOT NULL)) OR ((status = 'failed'::public.recurring_execution_status) AND (error_message IS NOT NULL)) OR ((status = ANY (ARRAY['pending'::public.recurring_execution_status, 'completed'::public.recurring_execution_status])) AND (skip_reason IS NULL) AND (error_message IS NULL))))
);


--
-- Name: TABLE recurring_run_executions; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.recurring_run_executions IS 'Idempotent audit records for every scheduled recurring-rule occurrence.';


--
-- Name: recurring_transactions; Type: TABLE; Schema: public
--

CREATE TABLE public.recurring_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    account_id uuid NOT NULL,
    category_id uuid,
    title text NOT NULL,
    notes text,
    amount numeric(14,2) NOT NULL,
    type public.transaction_type NOT NULL,
    frequency public.recurring_frequency NOT NULL,
    next_run date NOT NULL,
    last_run date,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pot_id uuid,
    excluded_months smallint[] DEFAULT '{}'::smallint[] NOT NULL,
    rule_kind public.recurring_rule_kind DEFAULT 'transaction'::public.recurring_rule_kind NOT NULL,
    destination_account_id uuid,
    destination_pot_id uuid,
    expense_kind public.recurring_expense_kind,
    title_enc bytea,
    notes_enc bytea,
    amount_enc bytea,
    enc_version smallint DEFAULT 0 NOT NULL,
    end_condition public.recurring_end_condition DEFAULT 'never'::public.recurring_end_condition NOT NULL,
    end_after_occurrences integer,
    end_date date,
    occurrences_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT recurring_transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT recurring_transactions_destination_shape_check CHECK ((((rule_kind = 'transaction'::public.recurring_rule_kind) AND (destination_account_id IS NULL) AND (destination_pot_id IS NULL)) OR ((rule_kind = 'transfer'::public.recurring_rule_kind) AND (num_nonnulls(destination_account_id, destination_pot_id) = 1)))),
    CONSTRAINT recurring_transactions_direct_destination_differs_check CHECK (((destination_account_id IS NULL) OR (destination_account_id <> account_id))),
    CONSTRAINT recurring_transactions_end_condition_shape CHECK ((((end_condition = 'never'::public.recurring_end_condition) AND (end_after_occurrences IS NULL) AND (end_date IS NULL)) OR ((end_condition = 'count'::public.recurring_end_condition) AND (end_after_occurrences IS NOT NULL) AND (end_after_occurrences > 0) AND (end_date IS NULL)) OR ((end_condition = 'date'::public.recurring_end_condition) AND (end_date IS NOT NULL) AND (end_after_occurrences IS NULL)))),
    CONSTRAINT recurring_transactions_expense_kind_shape_check CHECK (((expense_kind IS NULL) OR ((rule_kind = 'transaction'::public.recurring_rule_kind) AND (type = 'expense'::public.transaction_type)))),
    CONSTRAINT recurring_transactions_occurrences_count_non_negative CHECK ((occurrences_count >= 0))
);


--
-- Name: TABLE recurring_transactions; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.recurring_transactions IS 'Templates used to automatically generate recurring transactions.';


--
-- Name: COLUMN recurring_transactions.pot_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_transactions.pot_id IS 'Legacy optional saving-pot association for recurring income/expense rules. New recurring transfers use destination_pot_id.';


--
-- Name: COLUMN recurring_transactions.destination_account_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_transactions.destination_account_id IS 'Transfer destination account. Required for transfer rules unless destination_pot_id is set.';


--
-- Name: COLUMN recurring_transactions.destination_pot_id; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_transactions.destination_pot_id IS 'Transfer destination saving pot. Required for transfer rules unless destination_account_id is set.';


--
-- Name: COLUMN recurring_transactions.expense_kind; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_transactions.expense_kind IS 'Explicit recurring expense classification. Null for income and transfers; existing unclassified expenses are other.';


--
-- Name: COLUMN recurring_transactions.end_condition; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_transactions.end_condition IS 'How this rule stops generating movements: never, after a fixed occurrence count, or on/after a fixed date.';


--
-- Name: COLUMN recurring_transactions.end_after_occurrences; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_transactions.end_after_occurrences IS 'Total number of occurrences this rule should generate before deactivating. Only set when end_condition = ''count''.';


--
-- Name: COLUMN recurring_transactions.end_date; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_transactions.end_date IS 'Last date this rule may generate an occurrence for. Only set when end_condition = ''date''. A next_run past this date deactivates the rule instead of generating.';


--
-- Name: COLUMN recurring_transactions.occurrences_count; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.recurring_transactions.occurrences_count IS 'Number of movements generated by this rule so far. Incremented by execute_due_recurring_movements; never decremented, including on edit.';


--
-- Name: replenishment_run_sources; Type: TABLE; Schema: public
--

CREATE TABLE public.replenishment_run_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    source_kind public.replenishment_source_kind NOT NULL,
    pot_id uuid,
    resolved_account_id uuid NOT NULL,
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    suggested_amount numeric(14,2) DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT replenishment_run_sources_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT replenishment_run_sources_check CHECK (((source_kind = 'pot'::public.replenishment_source_kind) OR (pot_id IS NULL))),
    CONSTRAINT replenishment_run_sources_check1 CHECK (((source_kind <> 'pot'::public.replenishment_source_kind) OR (pot_id IS NOT NULL))),
    CONSTRAINT replenishment_run_sources_suggested_amount_check CHECK ((suggested_amount >= (0)::numeric))
);


--
-- Name: TABLE replenishment_run_sources; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.replenishment_run_sources IS 'Accounts/pots chosen as the money source for a replenishment run, with both the system-suggested and the final (possibly manually edited) amount. A pot source always resolves to a concrete backing account -- resolved_account_id -- since a real transfer always moves money between two real accounts.';


--
-- Name: replenishment_run_transactions; Type: TABLE; Schema: public
--

CREATE TABLE public.replenishment_run_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    account_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    category_id uuid,
    transaction_date timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    new_sources jsonb,
    CONSTRAINT replenishment_run_transactions_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: TABLE replenishment_run_transactions; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.replenishment_run_transactions IS 'Snapshot of the original expense transactions a replenishment run covers. Snapshotted (not just referenced) so the run''s own history stays truthful even if the original transaction is later edited or deleted.';


--
-- Name: COLUMN replenishment_run_transactions.new_sources; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.replenishment_run_transactions.new_sources IS 'Populated by confirm_replenishment_run: the funding source(s) this covered unit was reassigned to, as a JSON array of {source_type, account_id, pot_id, amount}. Null while the run is still draft (or, for a run confirmed before this migration, permanently -- those runs created transfer transactions instead and have nothing to record here).';


--
-- Name: saving_pot_accounts; Type: TABLE; Schema: public
--

CREATE TABLE public.saving_pot_accounts (
    pot_id uuid NOT NULL,
    account_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE saving_pot_accounts; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.saving_pot_accounts IS 'Explicit accounts used to calculate each saving pot goal. Every account can belong to at most one saving pot.';


--
-- Name: saving_pots; Type: TABLE; Schema: public
--

CREATE TABLE public.saving_pots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    name text NOT NULL,
    target_amount numeric(14,2),
    color text,
    icon text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    target_amount_enc bytea,
    enc_version smallint DEFAULT 0 NOT NULL
);


--
-- Name: TABLE saving_pots; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.saving_pots IS 'Household saving pots for goal-based savings and spending tracking.';


--
-- Name: transaction_import_batches; Type: TABLE; Schema: public
--

CREATE TABLE public.transaction_import_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    account_id uuid NOT NULL,
    created_by uuid NOT NULL,
    source_file_name text NOT NULL,
    source_file_hash text,
    status text DEFAULT 'preview'::text NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    imported_rows integer DEFAULT 0 NOT NULL,
    skipped_rows integer DEFAULT 0 NOT NULL,
    mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    rolled_back_at timestamp with time zone,
    CONSTRAINT import_batch_status_dates CHECK ((((status <> 'completed'::text) OR (completed_at IS NOT NULL)) AND ((status <> 'rolled_back'::text) OR (rolled_back_at IS NOT NULL)))),
    CONSTRAINT transaction_import_batches_imported_rows_check CHECK ((imported_rows >= 0)),
    CONSTRAINT transaction_import_batches_mapping_check CHECK ((jsonb_typeof(mapping) = 'object'::text)),
    CONSTRAINT transaction_import_batches_skipped_rows_check CHECK ((skipped_rows >= 0)),
    CONSTRAINT transaction_import_batches_source_file_name_check CHECK (((length(TRIM(BOTH FROM source_file_name)) >= 1) AND (length(TRIM(BOTH FROM source_file_name)) <= 255))),
    CONSTRAINT transaction_import_batches_status_check CHECK ((status = ANY (ARRAY['preview'::text, 'completed'::text, 'rolled_back'::text, 'failed'::text]))),
    CONSTRAINT transaction_import_batches_total_rows_check CHECK ((total_rows >= 0))
);


--
-- Name: TABLE transaction_import_batches; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.transaction_import_batches IS 'Household-scoped provenance and lifecycle metadata for transaction CSV imports. Rolled-back batches are retained as an audit record.';


--
-- Name: transaction_rules; Type: TABLE; Schema: public
--

CREATE TABLE public.transaction_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    name text NOT NULL,
    match_type text NOT NULL,
    pattern text NOT NULL,
    normalized_pattern text NOT NULL,
    transaction_type public.transaction_type,
    account_id uuid,
    category_id uuid,
    merchant_name text,
    priority integer DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pattern_enc bytea,
    normalized_pattern_enc bytea,
    merchant_name_enc bytea,
    enc_version smallint DEFAULT 0 NOT NULL,
    CONSTRAINT transaction_rules_match_type_check CHECK ((match_type = ANY (ARRAY['exact'::text, 'contains'::text, 'prefix'::text]))),
    CONSTRAINT transaction_rules_name_check CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120))),
    CONSTRAINT transaction_rules_normalized_pattern_check CHECK (((length(btrim(normalized_pattern)) >= 1) AND (length(btrim(normalized_pattern)) <= 240))),
    CONSTRAINT transaction_rules_pattern_check CHECK (((length(btrim(pattern)) >= 1) AND (length(btrim(pattern)) <= 240))),
    CONSTRAINT transaction_rules_priority_check CHECK (((priority >= 0) AND (priority <= 10000)))
);


--
-- Name: TABLE transaction_rules; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.transaction_rules IS 'Household rules that classify and normalize transactions.';


--
-- Name: transaction_splits; Type: TABLE; Schema: public
--

CREATE TABLE public.transaction_splits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    category_id uuid,
    amount numeric(14,2) NOT NULL,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    amount_enc bytea,
    notes_enc bytea,
    enc_version smallint DEFAULT 0 NOT NULL,
    CONSTRAINT transaction_splits_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT transaction_splits_sort_order_check CHECK ((sort_order >= 0))
);


--
-- Name: TABLE transaction_splits; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.transaction_splits IS 'Category allocations whose total is validated against the parent transaction by the application.';


--
-- Name: transaction_tag_assignments; Type: TABLE; Schema: public
--

CREATE TABLE public.transaction_tag_assignments (
    household_id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transaction_tags; Type: TABLE; Schema: public
--

CREATE TABLE public.transaction_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    name text NOT NULL,
    color text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transaction_tags_name_check CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 60)))
);


--
-- Name: TABLE transaction_tags; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.transaction_tags IS 'Reusable household transaction labels.';


--
-- Name: user_keypairs; Type: TABLE; Schema: public
--

CREATE TABLE public.user_keypairs (
    user_id uuid NOT NULL,
    public_key bytea NOT NULL,
    wrapped_private_key bytea NOT NULL,
    wrap_salt bytea NOT NULL,
    wrap_kdf_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE user_keypairs; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.user_keypairs IS 'X25519 (or equivalent) keypair per user for E2E encryption. wrapped_private_key is ciphertext the server cannot open — see docs/e2e-encryption-plan.md §2.1.';


--
-- Name: COLUMN user_keypairs.wrap_kdf_params; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.user_keypairs.wrap_kdf_params IS 'Argon2id (or chosen KDF) parameters used to derive the wrapping key from the vault passphrase, stored so params can be tuned later without breaking old wraps.';


--
-- Name: wage_flow_categories; Type: TABLE; Schema: public
--

CREATE TABLE public.wage_flow_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#3B82F6'::text NOT NULL,
    icon text DEFAULT 'ellipse-outline'::text NOT NULL,
    include_all_transactions boolean DEFAULT false NOT NULL,
    account_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    category_ids text[] DEFAULT '{}'::uuid[] NOT NULL,
    pot_account_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    include_transfers_between_accounts boolean DEFAULT false NOT NULL,
    include_transfers_into_pots boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE wage_flow_categories; Type: COMMENT; Schema: public
--

COMMENT ON TABLE public.wage_flow_categories IS 'User-configurable Wage Flow categories for the Insights screen. sort_order also drives first-match-wins matching precedence.';


--
-- Name: COLUMN wage_flow_categories.account_ids; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.wage_flow_categories.account_ids IS 'Matches non-transfer expenses spent from, and incoming transfers landing on, these accounts.';


--
-- Name: COLUMN wage_flow_categories.category_ids; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.wage_flow_categories.category_ids IS 'Matches non-transfer expenses in these categories (subcategories of a selected parent are included automatically at query time). May also contain the reserved marker __all_main_categories__, meaning every main category, resolved dynamically at query time so newly created main categories are picked up automatically.';


--
-- Name: COLUMN wage_flow_categories.pot_account_ids; Type: COMMENT; Schema: public
--

COMMENT ON COLUMN public.wage_flow_categories.pot_account_ids IS 'Matches incoming transfers landing on these specific pot/savings accounts.';


--
-- Name: web_push_subscriptions; Type: TABLE; Schema: public
--

CREATE TABLE public.web_push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    expiration_time bigint,
    user_agent text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
