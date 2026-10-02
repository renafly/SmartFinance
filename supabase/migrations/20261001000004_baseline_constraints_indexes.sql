-- ============================================================
-- SmartFinance baseline 05/09 -- Constraints and indexes
-- ============================================================
-- Primary keys, unique/check constraints, foreign keys and indexes (including partial unique indexes used for idempotency).
--
-- Generated 2026-10-01 by squashing the 107 historical migrations
-- (archived in supabase/migrations_archive/) into the final schema they
-- produce. To change the schema from now on, add a NEW migration after
-- these files -- never edit the baseline.

set check_function_bodies = false;

--
-- Name: CONSTRAINT planned_items_recurrence_shape ON planned_items; Type: COMMENT; Schema: public
--

COMMENT ON CONSTRAINT planned_items_recurrence_shape ON public.planned_items IS 'Mirrors income_sources_recurrence_shape (20260901001000_income_sources.sql) for the same four recurrence_type branches, adapted to be null-safe since planned_items.recurrence_months is nullable (income_sources.recurrence_months is NOT NULL DEFAULT ''{}''), unlike income_sources.';


SET default_tablespace = '';

--
-- Name: account_reconciliations account_reconciliation_unique_statement; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.account_reconciliations
    ADD CONSTRAINT account_reconciliation_unique_statement UNIQUE (account_id, statement_date);


--
-- Name: account_reconciliations account_reconciliations_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.account_reconciliations
    ADD CONSTRAINT account_reconciliations_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: app_feedback app_feedback_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_feedback
    ADD CONSTRAINT app_feedback_pkey PRIMARY KEY (id);


--
-- Name: app_feedback app_feedback_user_id_idempotency_key_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_feedback
    ADD CONSTRAINT app_feedback_user_id_idempotency_key_key UNIQUE (user_id, idempotency_key);


--
-- Name: app_notifications app_notifications_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_notifications
    ADD CONSTRAINT app_notifications_pkey PRIMARY KEY (id);


--
-- Name: app_notifications app_notifications_source_key_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_notifications
    ADD CONSTRAINT app_notifications_source_key_key UNIQUE (source_key);


--
-- Name: app_releases app_releases_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_releases
    ADD CONSTRAINT app_releases_pkey PRIMARY KEY (id);


--
-- Name: app_releases app_releases_version_build_number_platform_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_releases
    ADD CONSTRAINT app_releases_version_build_number_platform_key UNIQUE (version, build_number, platform);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: budget_configs budget_configs_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.budget_configs
    ADD CONSTRAINT budget_configs_pkey PRIMARY KEY (id);


--
-- Name: budget_rule_allocations budget_rule_allocations_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.budget_rule_allocations
    ADD CONSTRAINT budget_rule_allocations_pkey PRIMARY KEY (id);


--
-- Name: budget_rule_allocations budget_rule_allocations_rule_id_destination_account_id_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.budget_rule_allocations
    ADD CONSTRAINT budget_rule_allocations_rule_id_destination_account_id_key UNIQUE (rule_id, destination_account_id);


--
-- Name: budget_rules budget_rules_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.budget_rules
    ADD CONSTRAINT budget_rules_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_unique_name; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_unique_name UNIQUE (household_id, type, name);


--
-- Name: category_budgets category_budgets_category_id_effective_month_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_category_id_effective_month_key UNIQUE (category_id, effective_month);


--
-- Name: category_budgets category_budgets_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_pkey PRIMARY KEY (id);


--
-- Name: dashboard_network_configs dashboard_network_configs_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.dashboard_network_configs
    ADD CONSTRAINT dashboard_network_configs_pkey PRIMARY KEY (id);


--
-- Name: dashboard_network_configs dashboard_network_configs_profile_id_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.dashboard_network_configs
    ADD CONSTRAINT dashboard_network_configs_profile_id_key UNIQUE (profile_id);


--
-- Name: feedback_attachments feedback_attachments_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_attachments
    ADD CONSTRAINT feedback_attachments_pkey PRIMARY KEY (id);


--
-- Name: feedback_attachments feedback_attachments_storage_path_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_attachments
    ADD CONSTRAINT feedback_attachments_storage_path_key UNIQUE (storage_path);


--
-- Name: feedback_email_attempts feedback_email_attempts_outbox_id_attempt_number_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_email_attempts
    ADD CONSTRAINT feedback_email_attempts_outbox_id_attempt_number_key UNIQUE (outbox_id, attempt_number);


--
-- Name: feedback_email_attempts feedback_email_attempts_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_email_attempts
    ADD CONSTRAINT feedback_email_attempts_pkey PRIMARY KEY (id);


--
-- Name: feedback_email_outbox feedback_email_outbox_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_email_outbox
    ADD CONSTRAINT feedback_email_outbox_pkey PRIMARY KEY (id);


--
-- Name: feedback_email_outbox feedback_email_outbox_source_key_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_email_outbox
    ADD CONSTRAINT feedback_email_outbox_source_key_key UNIQUE (source_key);


--
-- Name: feedback_events feedback_events_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_events
    ADD CONSTRAINT feedback_events_pkey PRIMARY KEY (id);


--
-- Name: feedback_messages feedback_messages_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_messages
    ADD CONSTRAINT feedback_messages_pkey PRIMARY KEY (id);


--
-- Name: feedback_rate_limit_events feedback_rate_limit_events_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_rate_limit_events
    ADD CONSTRAINT feedback_rate_limit_events_pkey PRIMARY KEY (id);


--
-- Name: feedback_rpc_requests feedback_rpc_requests_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_rpc_requests
    ADD CONSTRAINT feedback_rpc_requests_pkey PRIMARY KEY (actor_id, operation, idempotency_key);


--
-- Name: household_encryption_status household_encryption_status_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_encryption_status
    ADD CONSTRAINT household_encryption_status_pkey PRIMARY KEY (household_id);


--
-- Name: household_invitations household_invitations_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_invitations
    ADD CONSTRAINT household_invitations_pkey PRIMARY KEY (id);


--
-- Name: household_invitations household_invitations_token_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_invitations
    ADD CONSTRAINT household_invitations_token_key UNIQUE (token);


--
-- Name: household_key_wraps household_key_wraps_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_key_wraps
    ADD CONSTRAINT household_key_wraps_pkey PRIMARY KEY (household_id, member_user_id);


--
-- Name: household_members household_members_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_pkey PRIMARY KEY (household_id, user_id);


--
-- Name: households households_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_pkey PRIMARY KEY (id);


--
-- Name: income_sources income_sources_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.income_sources
    ADD CONSTRAINT income_sources_pkey PRIMARY KEY (id);


--
-- Name: invitation_email_logs invitation_email_logs_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.invitation_email_logs
    ADD CONSTRAINT invitation_email_logs_pkey PRIMARY KEY (id);


--
-- Name: merchant_aliases merchant_aliases_household_id_normalized_alias_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.merchant_aliases
    ADD CONSTRAINT merchant_aliases_household_id_normalized_alias_key UNIQUE (household_id, normalized_alias);


--
-- Name: merchant_aliases merchant_aliases_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.merchant_aliases
    ADD CONSTRAINT merchant_aliases_pkey PRIMARY KEY (id);


--
-- Name: monthly_budget_batches monthly_budget_batches_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_budget_batches
    ADD CONSTRAINT monthly_budget_batches_pkey PRIMARY KEY (id);


--
-- Name: monthly_budget_periods monthly_budget_periods_household_id_month_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_budget_periods
    ADD CONSTRAINT monthly_budget_periods_household_id_month_key UNIQUE (household_id, month);


--
-- Name: monthly_budget_periods monthly_budget_periods_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_budget_periods
    ADD CONSTRAINT monthly_budget_periods_pkey PRIMARY KEY (id);


--
-- Name: monthly_budget_runs monthly_budget_runs_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_budget_runs
    ADD CONSTRAINT monthly_budget_runs_pkey PRIMARY KEY (id);


--
-- Name: monthly_income_inputs monthly_income_inputs_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_income_inputs
    ADD CONSTRAINT monthly_income_inputs_pkey PRIMARY KEY (id);


--
-- Name: planned_item_destinations planned_item_destinations_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_destinations
    ADD CONSTRAINT planned_item_destinations_pkey PRIMARY KEY (id);


--
-- Name: planned_item_destinations planned_item_destinations_planned_item_id_destination_accou_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_destinations
    ADD CONSTRAINT planned_item_destinations_planned_item_id_destination_accou_key UNIQUE (planned_item_id, destination_account_id);


--
-- Name: planned_item_matches planned_item_matches_occurrence_id_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_matches
    ADD CONSTRAINT planned_item_matches_occurrence_id_key UNIQUE (occurrence_id);


--
-- Name: planned_item_matches planned_item_matches_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_matches
    ADD CONSTRAINT planned_item_matches_pkey PRIMARY KEY (id);


--
-- Name: planned_item_matches planned_item_matches_transaction_id_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_matches
    ADD CONSTRAINT planned_item_matches_transaction_id_key UNIQUE (transaction_id);


--
-- Name: planned_item_occurrence_destinations planned_item_occurrence_destinations_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrence_destinations
    ADD CONSTRAINT planned_item_occurrence_destinations_pkey PRIMARY KEY (id);


--
-- Name: planned_item_occurrences planned_item_occurrences_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrences
    ADD CONSTRAINT planned_item_occurrences_pkey PRIMARY KEY (id);


--
-- Name: planned_item_occurrences planned_item_occurrences_planned_item_id_month_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrences
    ADD CONSTRAINT planned_item_occurrences_planned_item_id_month_key UNIQUE (planned_item_id, month);


--
-- Name: planned_items planned_items_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_items
    ADD CONSTRAINT planned_items_pkey PRIMARY KEY (id);


--
-- Name: platform_admins platform_admins_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (user_id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: push_devices push_devices_expo_push_token_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.push_devices
    ADD CONSTRAINT push_devices_expo_push_token_key UNIQUE (expo_push_token);


--
-- Name: push_devices push_devices_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.push_devices
    ADD CONSTRAINT push_devices_pkey PRIMARY KEY (id);


--
-- Name: recurring_expense_matches recurring_expense_matches_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_expense_matches
    ADD CONSTRAINT recurring_expense_matches_pkey PRIMARY KEY (id);


--
-- Name: recurring_expense_matches recurring_expense_matches_recurring_expense_id_occurrence_m_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_expense_matches
    ADD CONSTRAINT recurring_expense_matches_recurring_expense_id_occurrence_m_key UNIQUE (recurring_expense_id, occurrence_month);


--
-- Name: recurring_expense_matches recurring_expense_matches_transaction_id_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_expense_matches
    ADD CONSTRAINT recurring_expense_matches_transaction_id_key UNIQUE (transaction_id);


--
-- Name: recurring_expenses recurring_expenses_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_pkey PRIMARY KEY (id);


--
-- Name: recurring_run_executions recurring_run_executions_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_run_executions
    ADD CONSTRAINT recurring_run_executions_pkey PRIMARY KEY (id);


--
-- Name: recurring_run_executions recurring_run_executions_rule_schedule_unique; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_run_executions
    ADD CONSTRAINT recurring_run_executions_rule_schedule_unique UNIQUE (recurring_transaction_id, scheduled_for);


--
-- Name: recurring_transactions recurring_transactions_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_pkey PRIMARY KEY (id);


--
-- Name: replenishment_run_sources replenishment_run_sources_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_run_sources
    ADD CONSTRAINT replenishment_run_sources_pkey PRIMARY KEY (id);


--
-- Name: replenishment_run_sources replenishment_run_sources_run_id_resolved_account_id_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_run_sources
    ADD CONSTRAINT replenishment_run_sources_run_id_resolved_account_id_key UNIQUE (run_id, resolved_account_id);


--
-- Name: replenishment_run_transactions replenishment_run_transactions_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_run_transactions
    ADD CONSTRAINT replenishment_run_transactions_pkey PRIMARY KEY (id);


--
-- Name: replenishment_run_transactions replenishment_run_transactions_run_tx_account_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_run_transactions
    ADD CONSTRAINT replenishment_run_transactions_run_tx_account_key UNIQUE (run_id, transaction_id, account_id);


--
-- Name: replenishment_runs replenishment_runs_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_runs
    ADD CONSTRAINT replenishment_runs_pkey PRIMARY KEY (id);


--
-- Name: saving_pot_accounts saving_pot_accounts_account_unique; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.saving_pot_accounts
    ADD CONSTRAINT saving_pot_accounts_account_unique UNIQUE (account_id);


--
-- Name: saving_pot_accounts saving_pot_accounts_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.saving_pot_accounts
    ADD CONSTRAINT saving_pot_accounts_pkey PRIMARY KEY (pot_id, account_id);


--
-- Name: saving_pots saving_pots_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.saving_pots
    ADD CONSTRAINT saving_pots_pkey PRIMARY KEY (id);


--
-- Name: transaction_allocations transaction_allocations_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_allocations
    ADD CONSTRAINT transaction_allocations_pkey PRIMARY KEY (id);


--
-- Name: transactions transaction_import_batch_source_row_unique; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transaction_import_batch_source_row_unique UNIQUE (import_batch_id, import_source_row);


--
-- Name: transaction_import_batches transaction_import_batches_id_household_unique; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_import_batches
    ADD CONSTRAINT transaction_import_batches_id_household_unique UNIQUE (id, household_id);


--
-- Name: transaction_import_batches transaction_import_batches_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_import_batches
    ADD CONSTRAINT transaction_import_batches_pkey PRIMARY KEY (id);


--
-- Name: transaction_reimbursements transaction_reimbursements_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_reimbursements
    ADD CONSTRAINT transaction_reimbursements_pkey PRIMARY KEY (id);


--
-- Name: transaction_rules transaction_rules_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_rules
    ADD CONSTRAINT transaction_rules_pkey PRIMARY KEY (id);


--
-- Name: transaction_splits transaction_splits_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_splits
    ADD CONSTRAINT transaction_splits_pkey PRIMARY KEY (id);


--
-- Name: transaction_tag_assignments transaction_tag_assignments_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_tag_assignments
    ADD CONSTRAINT transaction_tag_assignments_pkey PRIMARY KEY (transaction_id, tag_id);


--
-- Name: transaction_tags transaction_tags_household_id_name_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_household_id_name_key UNIQUE (household_id, name);


--
-- Name: transaction_tags transaction_tags_id_household_id_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_id_household_id_key UNIQUE (id, household_id);


--
-- Name: transaction_tags transaction_tags_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_keypairs user_keypairs_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.user_keypairs
    ADD CONSTRAINT user_keypairs_pkey PRIMARY KEY (user_id);


--
-- Name: wage_flow_categories wage_flow_categories_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.wage_flow_categories
    ADD CONSTRAINT wage_flow_categories_pkey PRIMARY KEY (id);


--
-- Name: web_push_subscriptions web_push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.web_push_subscriptions
    ADD CONSTRAINT web_push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: web_push_subscriptions web_push_subscriptions_pkey; Type: CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.web_push_subscriptions
    ADD CONSTRAINT web_push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: accounts_id_household_unique; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX accounts_id_household_unique ON public.accounts USING btree (id, household_id);


--
-- Name: categories_id_household_unique; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX categories_id_household_unique ON public.categories USING btree (id, household_id);


--
-- Name: idx_accounts_archived; Type: INDEX; Schema: public
--

CREATE INDEX idx_accounts_archived ON public.accounts USING btree (is_archived);


--
-- Name: idx_accounts_enc_pending; Type: INDEX; Schema: public
--

CREATE INDEX idx_accounts_enc_pending ON public.accounts USING btree (household_id) WHERE (enc_version = 0);


--
-- Name: idx_accounts_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_accounts_household ON public.accounts USING btree (household_id);


--
-- Name: idx_accounts_owner; Type: INDEX; Schema: public
--

CREATE INDEX idx_accounts_owner ON public.accounts USING btree (owner_profile_id);


--
-- Name: idx_app_feedback_admin_queue; Type: INDEX; Schema: public
--

CREATE INDEX idx_app_feedback_admin_queue ON public.app_feedback USING btree (status, priority, created_at) WHERE (status <> ALL (ARRAY['resolved'::text, 'rejected'::text, 'withdrawn'::text]));


--
-- Name: idx_app_feedback_assignee; Type: INDEX; Schema: public
--

CREATE INDEX idx_app_feedback_assignee ON public.app_feedback USING btree (assigned_to, status) WHERE (assigned_to IS NOT NULL);


--
-- Name: idx_app_feedback_author_created; Type: INDEX; Schema: public
--

CREATE INDEX idx_app_feedback_author_created ON public.app_feedback USING btree (user_id, created_at DESC);


--
-- Name: idx_app_notifications_pending_push; Type: INDEX; Schema: public
--

CREATE INDEX idx_app_notifications_pending_push ON public.app_notifications USING btree (created_at) WHERE (push_dispatch_status = 'pending'::text);


--
-- Name: idx_app_notifications_recipient_created; Type: INDEX; Schema: public
--

CREATE INDEX idx_app_notifications_recipient_created ON public.app_notifications USING btree (recipient_id, created_at DESC);


--
-- Name: idx_app_notifications_recipient_read; Type: INDEX; Schema: public
--

CREATE INDEX idx_app_notifications_recipient_read ON public.app_notifications USING btree (recipient_id, read_at DESC) WHERE (read_at IS NOT NULL);


--
-- Name: idx_app_notifications_recipient_unread; Type: INDEX; Schema: public
--

CREATE INDEX idx_app_notifications_recipient_unread ON public.app_notifications USING btree (recipient_id, created_at DESC) WHERE (read_at IS NULL);


--
-- Name: idx_attachments_transaction; Type: INDEX; Schema: public
--

CREATE INDEX idx_attachments_transaction ON public.attachments USING btree (transaction_id);


--
-- Name: idx_attachments_uploaded_by; Type: INDEX; Schema: public
--

CREATE INDEX idx_attachments_uploaded_by ON public.attachments USING btree (uploaded_by);


--
-- Name: idx_audit_created_at; Type: INDEX; Schema: public
--

CREATE INDEX idx_audit_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_audit_household ON public.audit_logs USING btree (household_id);


--
-- Name: idx_audit_profile; Type: INDEX; Schema: public
--

CREATE INDEX idx_audit_profile ON public.audit_logs USING btree (profile_id);


--
-- Name: idx_audit_record; Type: INDEX; Schema: public
--

CREATE INDEX idx_audit_record ON public.audit_logs USING btree (record_id);


--
-- Name: idx_audit_table; Type: INDEX; Schema: public
--

CREATE INDEX idx_audit_table ON public.audit_logs USING btree (table_name);


--
-- Name: idx_budget_configs_active_household; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_budget_configs_active_household ON public.budget_configs USING btree (household_id) WHERE is_active;


--
-- Name: idx_budget_rule_allocations_category; Type: INDEX; Schema: public
--

CREATE INDEX idx_budget_rule_allocations_category ON public.budget_rule_allocations USING btree (category_id);


--
-- Name: idx_budget_rule_allocations_destination; Type: INDEX; Schema: public
--

CREATE INDEX idx_budget_rule_allocations_destination ON public.budget_rule_allocations USING btree (destination_account_id);


--
-- Name: idx_budget_rule_allocations_enc_pending; Type: INDEX; Schema: public
--

CREATE INDEX idx_budget_rule_allocations_enc_pending ON public.budget_rule_allocations USING btree (id) WHERE (enc_version = 0);


--
-- Name: idx_budget_rule_allocations_rule; Type: INDEX; Schema: public
--

CREATE INDEX idx_budget_rule_allocations_rule ON public.budget_rule_allocations USING btree (rule_id);


--
-- Name: idx_budget_rules_active_config; Type: INDEX; Schema: public
--

CREATE INDEX idx_budget_rules_active_config ON public.budget_rules USING btree (budget_config_id, priority, created_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_budget_rules_config; Type: INDEX; Schema: public
--

CREATE INDEX idx_budget_rules_config ON public.budget_rules USING btree (budget_config_id);


--
-- Name: idx_budget_rules_enc_pending; Type: INDEX; Schema: public
--

CREATE INDEX idx_budget_rules_enc_pending ON public.budget_rules USING btree (id) WHERE (enc_version = 0);


--
-- Name: idx_budget_rules_source; Type: INDEX; Schema: public
--

CREATE INDEX idx_budget_rules_source ON public.budget_rules USING btree (source_account_id);


--
-- Name: idx_categories_household_type_archived; Type: INDEX; Schema: public
--

CREATE INDEX idx_categories_household_type_archived ON public.categories USING btree (household_id, type, is_archived, sort_order);


--
-- Name: idx_category_budgets_household_category_month; Type: INDEX; Schema: public
--

CREATE INDEX idx_category_budgets_household_category_month ON public.category_budgets USING btree (household_id, category_id, effective_month DESC);


--
-- Name: idx_feedback_attachments_feedback; Type: INDEX; Schema: public
--

CREATE INDEX idx_feedback_attachments_feedback ON public.feedback_attachments USING btree (feedback_id, created_at);


--
-- Name: idx_feedback_email_attempts_outbox; Type: INDEX; Schema: public
--

CREATE INDEX idx_feedback_email_attempts_outbox ON public.feedback_email_attempts USING btree (outbox_id, attempted_at DESC);


--
-- Name: idx_feedback_email_outbox_ready; Type: INDEX; Schema: public
--

CREATE INDEX idx_feedback_email_outbox_ready ON public.feedback_email_outbox USING btree (available_at, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'retry'::text]));


--
-- Name: idx_feedback_email_outbox_stale_lock; Type: INDEX; Schema: public
--

CREATE INDEX idx_feedback_email_outbox_stale_lock ON public.feedback_email_outbox USING btree (locked_at) WHERE (status = 'processing'::text);


--
-- Name: idx_feedback_events_feedback_created; Type: INDEX; Schema: public
--

CREATE INDEX idx_feedback_events_feedback_created ON public.feedback_events USING btree (feedback_id, created_at);


--
-- Name: idx_feedback_messages_feedback_created; Type: INDEX; Schema: public
--

CREATE INDEX idx_feedback_messages_feedback_created ON public.feedback_messages USING btree (feedback_id, created_at);


--
-- Name: idx_feedback_rate_limit_lookup; Type: INDEX; Schema: public
--

CREATE INDEX idx_feedback_rate_limit_lookup ON public.feedback_rate_limit_events USING btree (actor_id, action, created_at DESC);


--
-- Name: idx_feedback_rpc_requests_created; Type: INDEX; Schema: public
--

CREATE INDEX idx_feedback_rpc_requests_created ON public.feedback_rpc_requests USING btree (created_at);


--
-- Name: idx_households_deleted_at; Type: INDEX; Schema: public
--

CREATE INDEX idx_households_deleted_at ON public.households USING btree (deleted_at);


--
-- Name: idx_import_batches_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_import_batches_account ON public.transaction_import_batches USING btree (account_id, created_at DESC);


--
-- Name: idx_import_batches_household_created; Type: INDEX; Schema: public
--

CREATE INDEX idx_import_batches_household_created ON public.transaction_import_batches USING btree (household_id, created_at DESC);


--
-- Name: idx_income_sources_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_income_sources_account ON public.income_sources USING btree (destination_account_id);


--
-- Name: idx_income_sources_category; Type: INDEX; Schema: public
--

CREATE INDEX idx_income_sources_category ON public.income_sources USING btree (category_id);


--
-- Name: idx_income_sources_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_income_sources_household ON public.income_sources USING btree (household_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_income_sources_owner; Type: INDEX; Schema: public
--

CREATE INDEX idx_income_sources_owner ON public.income_sources USING btree (owner_member_id);


--
-- Name: idx_invitation_email_logs_household_id; Type: INDEX; Schema: public
--

CREATE INDEX idx_invitation_email_logs_household_id ON public.invitation_email_logs USING btree (household_id);


--
-- Name: idx_invitation_email_logs_requested_by; Type: INDEX; Schema: public
--

CREATE INDEX idx_invitation_email_logs_requested_by ON public.invitation_email_logs USING btree (requested_by);


--
-- Name: idx_invitation_email_logs_status; Type: INDEX; Schema: public
--

CREATE INDEX idx_invitation_email_logs_status ON public.invitation_email_logs USING btree (status);


--
-- Name: idx_merchant_aliases_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_merchant_aliases_household ON public.merchant_aliases USING btree (household_id, normalized_alias);


--
-- Name: idx_monthly_budget_batches_household_month; Type: INDEX; Schema: public
--

CREATE INDEX idx_monthly_budget_batches_household_month ON public.monthly_budget_batches USING btree (household_id, month, created_at DESC);


--
-- Name: idx_monthly_budget_batches_one_active; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_monthly_budget_batches_one_active ON public.monthly_budget_batches USING btree (household_id, month) WHERE (status = 'active'::text);


--
-- Name: idx_monthly_budget_periods_household_month; Type: INDEX; Schema: public
--

CREATE INDEX idx_monthly_budget_periods_household_month ON public.monthly_budget_periods USING btree (household_id, month);


--
-- Name: idx_monthly_budget_runs_config; Type: INDEX; Schema: public
--

CREATE INDEX idx_monthly_budget_runs_config ON public.monthly_budget_runs USING btree (budget_config_id);


--
-- Name: idx_monthly_budget_runs_household_month; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_monthly_budget_runs_household_month ON public.monthly_budget_runs USING btree (household_id, month);


--
-- Name: idx_monthly_income_inputs_available_month; Type: INDEX; Schema: public
--

CREATE INDEX idx_monthly_income_inputs_available_month ON public.monthly_income_inputs USING btree (available_month);


--
-- Name: idx_monthly_income_inputs_enc_pending; Type: INDEX; Schema: public
--

CREATE INDEX idx_monthly_income_inputs_enc_pending ON public.monthly_income_inputs USING btree (id) WHERE (enc_version = 0);


--
-- Name: idx_monthly_income_inputs_member; Type: INDEX; Schema: public
--

CREATE INDEX idx_monthly_income_inputs_member ON public.monthly_income_inputs USING btree (member_id);


--
-- Name: idx_monthly_income_inputs_run; Type: INDEX; Schema: public
--

CREATE INDEX idx_monthly_income_inputs_run ON public.monthly_income_inputs USING btree (monthly_budget_run_id);


--
-- Name: idx_monthly_income_inputs_run_member; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_monthly_income_inputs_run_member ON public.monthly_income_inputs USING btree (monthly_budget_run_id, member_id) WHERE (income_source_id IS NULL);


--
-- Name: idx_monthly_income_inputs_run_source; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_monthly_income_inputs_run_source ON public.monthly_income_inputs USING btree (monthly_budget_run_id, income_source_id) WHERE (income_source_id IS NOT NULL);


--
-- Name: idx_monthly_income_inputs_source; Type: INDEX; Schema: public
--

CREATE INDEX idx_monthly_income_inputs_source ON public.monthly_income_inputs USING btree (income_source_id);


--
-- Name: idx_planned_item_destinations_item; Type: INDEX; Schema: public
--

CREATE INDEX idx_planned_item_destinations_item ON public.planned_item_destinations USING btree (planned_item_id);


--
-- Name: idx_planned_item_occurrence_destinations_occurrence; Type: INDEX; Schema: public
--

CREATE INDEX idx_planned_item_occurrence_destinations_occurrence ON public.planned_item_occurrence_destinations USING btree (occurrence_id);


--
-- Name: idx_planned_item_occurrences_household_month; Type: INDEX; Schema: public
--

CREATE INDEX idx_planned_item_occurrences_household_month ON public.planned_item_occurrences USING btree (household_id, month);


--
-- Name: idx_planned_items_household_active; Type: INDEX; Schema: public
--

CREATE INDEX idx_planned_items_household_active ON public.planned_items USING btree (household_id, is_active);


--
-- Name: idx_profiles_default_household_id; Type: INDEX; Schema: public
--

CREATE INDEX idx_profiles_default_household_id ON public.profiles USING btree (default_household_id);


--
-- Name: idx_push_devices_user; Type: INDEX; Schema: public
--

CREATE INDEX idx_push_devices_user ON public.push_devices USING btree (user_id);


--
-- Name: idx_reconciliations_household_account_date; Type: INDEX; Schema: public
--

CREATE INDEX idx_reconciliations_household_account_date ON public.account_reconciliations USING btree (household_id, account_id, statement_date DESC);


--
-- Name: idx_recurring_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_account ON public.recurring_transactions USING btree (account_id);


--
-- Name: idx_recurring_active; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_active ON public.recurring_transactions USING btree (is_active);


--
-- Name: idx_recurring_category; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_category ON public.recurring_transactions USING btree (category_id);


--
-- Name: idx_recurring_destination_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_destination_account ON public.recurring_transactions USING btree (destination_account_id) WHERE (destination_account_id IS NOT NULL);


--
-- Name: idx_recurring_destination_pot; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_destination_pot ON public.recurring_transactions USING btree (destination_pot_id) WHERE (destination_pot_id IS NOT NULL);


--
-- Name: idx_recurring_expense_matches_expense; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_expense_matches_expense ON public.recurring_expense_matches USING btree (recurring_expense_id);


--
-- Name: idx_recurring_expense_matches_transaction; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_expense_matches_transaction ON public.recurring_expense_matches USING btree (transaction_id);


--
-- Name: idx_recurring_expenses_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_expenses_account ON public.recurring_expenses USING btree (account_id);


--
-- Name: idx_recurring_expenses_category; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_expenses_category ON public.recurring_expenses USING btree (category_id);


--
-- Name: idx_recurring_expenses_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_expenses_household ON public.recurring_expenses USING btree (household_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_recurring_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_household ON public.recurring_transactions USING btree (household_id);


--
-- Name: idx_recurring_next_run; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_next_run ON public.recurring_transactions USING btree (next_run);


--
-- Name: idx_recurring_pot; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_pot ON public.recurring_transactions USING btree (pot_id);


--
-- Name: idx_recurring_run_executions_household_scheduled; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_run_executions_household_scheduled ON public.recurring_run_executions USING btree (household_id, scheduled_for DESC);


--
-- Name: idx_recurring_run_executions_pending; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_run_executions_pending ON public.recurring_run_executions USING btree (status) WHERE (status = ANY (ARRAY['pending'::public.recurring_execution_status, 'failed'::public.recurring_execution_status]));


--
-- Name: idx_recurring_run_executions_rule_scheduled; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_run_executions_rule_scheduled ON public.recurring_run_executions USING btree (recurring_transaction_id, scheduled_for DESC);


--
-- Name: idx_recurring_transactions_enc_pending; Type: INDEX; Schema: public
--

CREATE INDEX idx_recurring_transactions_enc_pending ON public.recurring_transactions USING btree (household_id) WHERE (enc_version = 0);


--
-- Name: idx_replenishment_run_sources_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_replenishment_run_sources_account ON public.replenishment_run_sources USING btree (resolved_account_id);


--
-- Name: idx_replenishment_run_sources_pot; Type: INDEX; Schema: public
--

CREATE INDEX idx_replenishment_run_sources_pot ON public.replenishment_run_sources USING btree (pot_id);


--
-- Name: idx_replenishment_run_sources_run; Type: INDEX; Schema: public
--

CREATE INDEX idx_replenishment_run_sources_run ON public.replenishment_run_sources USING btree (run_id);


--
-- Name: idx_replenishment_run_transactions_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_replenishment_run_transactions_account ON public.replenishment_run_transactions USING btree (account_id);


--
-- Name: idx_replenishment_run_transactions_run; Type: INDEX; Schema: public
--

CREATE INDEX idx_replenishment_run_transactions_run ON public.replenishment_run_transactions USING btree (run_id);


--
-- Name: idx_replenishment_run_transactions_transaction; Type: INDEX; Schema: public
--

CREATE INDEX idx_replenishment_run_transactions_transaction ON public.replenishment_run_transactions USING btree (transaction_id);


--
-- Name: idx_replenishment_runs_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_replenishment_runs_household ON public.replenishment_runs USING btree (household_id);


--
-- Name: idx_replenishment_runs_status; Type: INDEX; Schema: public
--

CREATE INDEX idx_replenishment_runs_status ON public.replenishment_runs USING btree (status);


--
-- Name: idx_saving_pot_accounts_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_saving_pot_accounts_account ON public.saving_pot_accounts USING btree (account_id);


--
-- Name: idx_saving_pot_accounts_pot; Type: INDEX; Schema: public
--

CREATE INDEX idx_saving_pot_accounts_pot ON public.saving_pot_accounts USING btree (pot_id);


--
-- Name: idx_saving_pots_enc_pending; Type: INDEX; Schema: public
--

CREATE INDEX idx_saving_pots_enc_pending ON public.saving_pots USING btree (household_id) WHERE (enc_version = 0);


--
-- Name: idx_saving_pots_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_saving_pots_household ON public.saving_pots USING btree (household_id);


--
-- Name: idx_transaction_allocations_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_allocations_account ON public.transaction_allocations USING btree (account_id);


--
-- Name: idx_transaction_allocations_pot; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_allocations_pot ON public.transaction_allocations USING btree (pot_id);


--
-- Name: idx_transaction_allocations_replenishment_run; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_allocations_replenishment_run ON public.transaction_allocations USING btree (replenishment_run_id) WHERE (replenishment_run_id IS NOT NULL);


--
-- Name: idx_transaction_allocations_transaction; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_allocations_transaction ON public.transaction_allocations USING btree (transaction_id, sort_order);


--
-- Name: idx_transaction_allocations_unique_account; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_transaction_allocations_unique_account ON public.transaction_allocations USING btree (transaction_id, account_id) WHERE (account_id IS NOT NULL);


--
-- Name: idx_transaction_allocations_unique_pot; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_transaction_allocations_unique_pot ON public.transaction_allocations USING btree (transaction_id, pot_id) WHERE (pot_id IS NOT NULL);


--
-- Name: idx_transaction_reimbursements_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_reimbursements_account ON public.transaction_reimbursements USING btree (account_id) WHERE (account_id IS NOT NULL);


--
-- Name: idx_transaction_reimbursements_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_reimbursements_household ON public.transaction_reimbursements USING btree (household_id);


--
-- Name: idx_transaction_reimbursements_pot; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_reimbursements_pot ON public.transaction_reimbursements USING btree (pot_id) WHERE (pot_id IS NOT NULL);


--
-- Name: idx_transaction_reimbursements_transaction; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_reimbursements_transaction ON public.transaction_reimbursements USING btree (transaction_id);


--
-- Name: idx_transaction_rules_household_active; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_rules_household_active ON public.transaction_rules USING btree (household_id, is_active, priority, created_at);


--
-- Name: idx_transaction_splits_transaction; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_splits_transaction ON public.transaction_splits USING btree (transaction_id, sort_order);


--
-- Name: idx_transaction_splits_unique_order; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_transaction_splits_unique_order ON public.transaction_splits USING btree (transaction_id, sort_order);


--
-- Name: idx_transaction_tag_assignments_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_tag_assignments_household ON public.transaction_tag_assignments USING btree (household_id, tag_id);


--
-- Name: idx_transaction_tags_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_transaction_tags_household ON public.transaction_tags USING btree (household_id, name);


--
-- Name: idx_transactions_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_account ON public.transactions USING btree (account_id);


--
-- Name: idx_transactions_account_ledger_order; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_account_ledger_order ON public.transactions USING btree (account_id, transaction_date, created_at, id);


--
-- Name: idx_transactions_category; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_category ON public.transactions USING btree (category_id);


--
-- Name: idx_transactions_created_by; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_created_by ON public.transactions USING btree (created_by);


--
-- Name: idx_transactions_date; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_date ON public.transactions USING btree (transaction_date DESC);


--
-- Name: idx_transactions_enc_pending; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_enc_pending ON public.transactions USING btree (household_id) WHERE (enc_version = 0);


--
-- Name: idx_transactions_generated_rule; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_generated_rule ON public.transactions USING btree (generated_by_rule_id);


--
-- Name: idx_transactions_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_household ON public.transactions USING btree (household_id);


--
-- Name: idx_transactions_import_batch; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_import_batch ON public.transactions USING btree (import_batch_id) WHERE (import_batch_id IS NOT NULL);


--
-- Name: idx_transactions_import_fingerprint; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_import_fingerprint ON public.transactions USING btree (household_id, account_id, import_fingerprint) WHERE (import_fingerprint IS NOT NULL);


--
-- Name: idx_transactions_monthly_budget_batch_id; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_monthly_budget_batch_id ON public.transactions USING btree (monthly_budget_batch_id) WHERE (monthly_budget_batch_id IS NOT NULL);


--
-- Name: idx_transactions_monthly_budget_run; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_monthly_budget_run ON public.transactions USING btree (monthly_budget_run_id);


--
-- Name: idx_transactions_one_plain_expense_per_occurrence; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_transactions_one_plain_expense_per_occurrence ON public.transactions USING btree (planned_item_occurrence_id) WHERE ((planned_item_occurrence_destination_id IS NULL) AND (planned_item_transaction_role = 'plain_expense'::public.planned_item_transaction_role) AND (planned_item_occurrence_id IS NOT NULL));


--
-- Name: idx_transactions_one_role_per_occurrence_destination; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_transactions_one_role_per_occurrence_destination ON public.transactions USING btree (planned_item_occurrence_destination_id, planned_item_transaction_role) WHERE (planned_item_occurrence_destination_id IS NOT NULL);


--
-- Name: idx_transactions_original_account; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_original_account ON public.transactions USING btree (original_account_id) WHERE (original_account_id IS NOT NULL);


--
-- Name: idx_transactions_planned_item_occurrence; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_planned_item_occurrence ON public.transactions USING btree (planned_item_occurrence_id);


--
-- Name: idx_transactions_planned_item_occurrence_destination; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_planned_item_occurrence_destination ON public.transactions USING btree (planned_item_occurrence_destination_id);


--
-- Name: idx_transactions_pot; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_pot ON public.transactions USING btree (pot_id);


--
-- Name: idx_transactions_recurring_execution; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_recurring_execution ON public.transactions USING btree (recurring_execution_id) WHERE (recurring_execution_id IS NOT NULL);


--
-- Name: idx_transactions_reimbursement; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX idx_transactions_reimbursement ON public.transactions USING btree (reimbursement_id) WHERE (reimbursement_id IS NOT NULL);


--
-- Name: idx_transactions_replenishment_run; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_replenishment_run ON public.transactions USING btree (replenishment_run_id);


--
-- Name: idx_transactions_transfer; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_transfer ON public.transactions USING btree (transfer_group_id);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- Name: idx_wage_flow_categories_household; Type: INDEX; Schema: public
--

CREATE INDEX idx_wage_flow_categories_household ON public.wage_flow_categories USING btree (household_id, sort_order);


--
-- Name: idx_web_push_subscriptions_user; Type: INDEX; Schema: public
--

CREATE INDEX idx_web_push_subscriptions_user ON public.web_push_subscriptions USING btree (user_id);


--
-- Name: saving_pots_id_household_unique; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX saving_pots_id_household_unique ON public.saving_pots USING btree (id, household_id);


--
-- Name: transaction_reimbursements_id_household_unique; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX transaction_reimbursements_id_household_unique ON public.transaction_reimbursements USING btree (id, household_id);


--
-- Name: transactions_id_household_unique; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX transactions_id_household_unique ON public.transactions USING btree (id, household_id);


--
-- Name: uq_transaction_tags_household_name_ci; Type: INDEX; Schema: public
--

CREATE UNIQUE INDEX uq_transaction_tags_household_name_ci ON public.transaction_tags USING btree (household_id, lower(btrim(name)));


--
-- Name: account_reconciliations account_reconciliations_account_household_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.account_reconciliations
    ADD CONSTRAINT account_reconciliations_account_household_fkey FOREIGN KEY (account_id, household_id) REFERENCES public.accounts(id, household_id) ON DELETE CASCADE;


--
-- Name: account_reconciliations account_reconciliations_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.account_reconciliations
    ADD CONSTRAINT account_reconciliations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: account_reconciliations account_reconciliations_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.account_reconciliations
    ADD CONSTRAINT account_reconciliations_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: accounts accounts_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: accounts accounts_owner_profile_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_owner_profile_id_fkey FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: app_feedback app_feedback_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_feedback
    ADD CONSTRAINT app_feedback_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.platform_admins(user_id) ON DELETE SET NULL;


--
-- Name: app_feedback app_feedback_resolved_in_release_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_feedback
    ADD CONSTRAINT app_feedback_resolved_in_release_id_fkey FOREIGN KEY (resolved_in_release_id) REFERENCES public.app_releases(id) ON DELETE SET NULL;


--
-- Name: app_feedback app_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_feedback
    ADD CONSTRAINT app_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: app_notifications app_notifications_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_notifications
    ADD CONSTRAINT app_notifications_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: app_notifications app_notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_notifications
    ADD CONSTRAINT app_notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: app_releases app_releases_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.app_releases
    ADD CONSTRAINT app_releases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: attachments attachments_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: attachments attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: audit_logs audit_logs_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_profile_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: budget_configs budget_configs_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.budget_configs
    ADD CONSTRAINT budget_configs_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: budget_rule_allocations budget_rule_allocations_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.budget_rule_allocations
    ADD CONSTRAINT budget_rule_allocations_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: budget_rule_allocations budget_rule_allocations_destination_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.budget_rule_allocations
    ADD CONSTRAINT budget_rule_allocations_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: budget_rule_allocations budget_rule_allocations_rule_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.budget_rule_allocations
    ADD CONSTRAINT budget_rule_allocations_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.budget_rules(id) ON DELETE CASCADE;


--
-- Name: budget_rules budget_rules_budget_config_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.budget_rules
    ADD CONSTRAINT budget_rules_budget_config_id_fkey FOREIGN KEY (budget_config_id) REFERENCES public.budget_configs(id) ON DELETE CASCADE;


--
-- Name: budget_rules budget_rules_owner_member_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.budget_rules
    ADD CONSTRAINT budget_rules_owner_member_id_fkey FOREIGN KEY (owner_member_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: budget_rules budget_rules_source_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.budget_rules
    ADD CONSTRAINT budget_rules_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: categories categories_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: category_budgets category_budgets_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: category_budgets category_budgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: category_budgets category_budgets_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: dashboard_network_configs dashboard_network_configs_profile_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.dashboard_network_configs
    ADD CONSTRAINT dashboard_network_configs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: feedback_attachments feedback_attachments_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_attachments
    ADD CONSTRAINT feedback_attachments_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.app_feedback(id) ON DELETE CASCADE;


--
-- Name: feedback_attachments feedback_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_attachments
    ADD CONSTRAINT feedback_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.feedback_messages(id) ON DELETE CASCADE;


--
-- Name: feedback_attachments feedback_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_attachments
    ADD CONSTRAINT feedback_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: feedback_email_attempts feedback_email_attempts_outbox_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_email_attempts
    ADD CONSTRAINT feedback_email_attempts_outbox_id_fkey FOREIGN KEY (outbox_id) REFERENCES public.feedback_email_outbox(id) ON DELETE CASCADE;


--
-- Name: feedback_email_outbox feedback_email_outbox_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_email_outbox
    ADD CONSTRAINT feedback_email_outbox_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: feedback_events feedback_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_events
    ADD CONSTRAINT feedback_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: feedback_events feedback_events_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_events
    ADD CONSTRAINT feedback_events_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.app_feedback(id) ON DELETE CASCADE;


--
-- Name: feedback_messages feedback_messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_messages
    ADD CONSTRAINT feedback_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: feedback_messages feedback_messages_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_messages
    ADD CONSTRAINT feedback_messages_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.app_feedback(id) ON DELETE CASCADE;


--
-- Name: feedback_rate_limit_events feedback_rate_limit_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_rate_limit_events
    ADD CONSTRAINT feedback_rate_limit_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: feedback_rpc_requests feedback_rpc_requests_actor_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.feedback_rpc_requests
    ADD CONSTRAINT feedback_rpc_requests_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: household_encryption_status household_encryption_status_enabled_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_encryption_status
    ADD CONSTRAINT household_encryption_status_enabled_by_fkey FOREIGN KEY (enabled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: household_encryption_status household_encryption_status_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_encryption_status
    ADD CONSTRAINT household_encryption_status_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: household_invitations household_invitations_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_invitations
    ADD CONSTRAINT household_invitations_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: household_key_wraps household_key_wraps_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_key_wraps
    ADD CONSTRAINT household_key_wraps_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: household_key_wraps household_key_wraps_member_user_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_key_wraps
    ADD CONSTRAINT household_key_wraps_member_user_id_fkey FOREIGN KEY (member_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: household_key_wraps household_key_wraps_wrapped_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_key_wraps
    ADD CONSTRAINT household_key_wraps_wrapped_by_user_id_fkey FOREIGN KEY (wrapped_by_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: household_members household_members_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: household_members household_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: households households_owner_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: income_sources income_sources_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.income_sources
    ADD CONSTRAINT income_sources_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: income_sources income_sources_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.income_sources
    ADD CONSTRAINT income_sources_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: income_sources income_sources_destination_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.income_sources
    ADD CONSTRAINT income_sources_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: income_sources income_sources_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.income_sources
    ADD CONSTRAINT income_sources_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: income_sources income_sources_owner_member_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.income_sources
    ADD CONSTRAINT income_sources_owner_member_id_fkey FOREIGN KEY (owner_member_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: invitation_email_logs invitation_email_logs_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.invitation_email_logs
    ADD CONSTRAINT invitation_email_logs_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: invitation_email_logs invitation_email_logs_requested_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.invitation_email_logs
    ADD CONSTRAINT invitation_email_logs_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: merchant_aliases merchant_aliases_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.merchant_aliases
    ADD CONSTRAINT merchant_aliases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: merchant_aliases merchant_aliases_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.merchant_aliases
    ADD CONSTRAINT merchant_aliases_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: monthly_budget_batches monthly_budget_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_budget_batches
    ADD CONSTRAINT monthly_budget_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: monthly_budget_batches monthly_budget_batches_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_budget_batches
    ADD CONSTRAINT monthly_budget_batches_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: monthly_budget_batches monthly_budget_batches_undone_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_budget_batches
    ADD CONSTRAINT monthly_budget_batches_undone_by_fkey FOREIGN KEY (undone_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: monthly_budget_periods monthly_budget_periods_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_budget_periods
    ADD CONSTRAINT monthly_budget_periods_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: monthly_budget_periods monthly_budget_periods_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_budget_periods
    ADD CONSTRAINT monthly_budget_periods_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: monthly_budget_runs monthly_budget_runs_budget_config_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_budget_runs
    ADD CONSTRAINT monthly_budget_runs_budget_config_id_fkey FOREIGN KEY (budget_config_id) REFERENCES public.budget_configs(id) ON DELETE RESTRICT;


--
-- Name: monthly_budget_runs monthly_budget_runs_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_budget_runs
    ADD CONSTRAINT monthly_budget_runs_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: monthly_income_inputs monthly_income_inputs_cash_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_income_inputs
    ADD CONSTRAINT monthly_income_inputs_cash_account_id_fkey FOREIGN KEY (cash_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: monthly_income_inputs monthly_income_inputs_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_income_inputs
    ADD CONSTRAINT monthly_income_inputs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: monthly_income_inputs monthly_income_inputs_income_source_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_income_inputs
    ADD CONSTRAINT monthly_income_inputs_income_source_id_fkey FOREIGN KEY (income_source_id) REFERENCES public.income_sources(id) ON DELETE SET NULL;


--
-- Name: monthly_income_inputs monthly_income_inputs_member_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_income_inputs
    ADD CONSTRAINT monthly_income_inputs_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: monthly_income_inputs monthly_income_inputs_monthly_budget_run_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.monthly_income_inputs
    ADD CONSTRAINT monthly_income_inputs_monthly_budget_run_id_fkey FOREIGN KEY (monthly_budget_run_id) REFERENCES public.monthly_budget_runs(id) ON DELETE CASCADE;


--
-- Name: planned_item_destinations planned_item_destinations_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_destinations
    ADD CONSTRAINT planned_item_destinations_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: planned_item_destinations planned_item_destinations_destination_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_destinations
    ADD CONSTRAINT planned_item_destinations_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: planned_item_destinations planned_item_destinations_planned_item_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_destinations
    ADD CONSTRAINT planned_item_destinations_planned_item_id_fkey FOREIGN KEY (planned_item_id) REFERENCES public.planned_items(id) ON DELETE CASCADE;


--
-- Name: planned_item_matches planned_item_matches_matched_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_matches
    ADD CONSTRAINT planned_item_matches_matched_by_fkey FOREIGN KEY (matched_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: planned_item_matches planned_item_matches_occurrence_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_matches
    ADD CONSTRAINT planned_item_matches_occurrence_id_fkey FOREIGN KEY (occurrence_id) REFERENCES public.planned_item_occurrences(id) ON DELETE CASCADE;


--
-- Name: planned_item_matches planned_item_matches_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_matches
    ADD CONSTRAINT planned_item_matches_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: planned_item_occurrence_destinations planned_item_occurrence_destin_planned_item_destination_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrence_destinations
    ADD CONSTRAINT planned_item_occurrence_destin_planned_item_destination_id_fkey FOREIGN KEY (planned_item_destination_id) REFERENCES public.planned_item_destinations(id) ON DELETE SET NULL;


--
-- Name: planned_item_occurrence_destinations planned_item_occurrence_destination_destination_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrence_destinations
    ADD CONSTRAINT planned_item_occurrence_destination_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: planned_item_occurrence_destinations planned_item_occurrence_destinations_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrence_destinations
    ADD CONSTRAINT planned_item_occurrence_destinations_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: planned_item_occurrence_destinations planned_item_occurrence_destinations_occurrence_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrence_destinations
    ADD CONSTRAINT planned_item_occurrence_destinations_occurrence_id_fkey FOREIGN KEY (occurrence_id) REFERENCES public.planned_item_occurrences(id) ON DELETE CASCADE;


--
-- Name: planned_item_occurrences planned_item_occurrences_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrences
    ADD CONSTRAINT planned_item_occurrences_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: planned_item_occurrences planned_item_occurrences_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrences
    ADD CONSTRAINT planned_item_occurrences_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: planned_item_occurrences planned_item_occurrences_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrences
    ADD CONSTRAINT planned_item_occurrences_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: planned_item_occurrences planned_item_occurrences_planned_item_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrences
    ADD CONSTRAINT planned_item_occurrences_planned_item_id_fkey FOREIGN KEY (planned_item_id) REFERENCES public.planned_items(id) ON DELETE CASCADE;


--
-- Name: planned_item_occurrences planned_item_occurrences_source_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_item_occurrences
    ADD CONSTRAINT planned_item_occurrences_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: planned_items planned_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_items
    ADD CONSTRAINT planned_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: planned_items planned_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_items
    ADD CONSTRAINT planned_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: planned_items planned_items_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_items
    ADD CONSTRAINT planned_items_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: planned_items planned_items_owner_member_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_items
    ADD CONSTRAINT planned_items_owner_member_id_fkey FOREIGN KEY (owner_member_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: planned_items planned_items_source_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.planned_items
    ADD CONSTRAINT planned_items_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: platform_admins platform_admins_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: platform_admins platform_admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_default_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_default_household_id_fkey FOREIGN KEY (default_household_id) REFERENCES public.households(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_devices push_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.push_devices
    ADD CONSTRAINT push_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: recurring_expense_matches recurring_expense_matches_matched_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_expense_matches
    ADD CONSTRAINT recurring_expense_matches_matched_by_fkey FOREIGN KEY (matched_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: recurring_expense_matches recurring_expense_matches_recurring_expense_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_expense_matches
    ADD CONSTRAINT recurring_expense_matches_recurring_expense_id_fkey FOREIGN KEY (recurring_expense_id) REFERENCES public.recurring_expenses(id) ON DELETE CASCADE;


--
-- Name: recurring_expense_matches recurring_expense_matches_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_expense_matches
    ADD CONSTRAINT recurring_expense_matches_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: recurring_expenses recurring_expenses_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: recurring_expenses recurring_expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: recurring_expenses recurring_expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: recurring_expenses recurring_expenses_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: recurring_run_executions recurring_run_executions_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_run_executions
    ADD CONSTRAINT recurring_run_executions_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: recurring_run_executions recurring_run_executions_recurring_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_run_executions
    ADD CONSTRAINT recurring_run_executions_recurring_transaction_id_fkey FOREIGN KEY (recurring_transaction_id) REFERENCES public.recurring_transactions(id) ON DELETE CASCADE;


--
-- Name: recurring_transactions recurring_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: recurring_transactions recurring_transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: recurring_transactions recurring_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: recurring_transactions recurring_transactions_destination_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: recurring_transactions recurring_transactions_destination_pot_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_destination_pot_id_fkey FOREIGN KEY (destination_pot_id) REFERENCES public.saving_pots(id) ON DELETE RESTRICT;


--
-- Name: recurring_transactions recurring_transactions_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: recurring_transactions recurring_transactions_pot_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_pot_id_fkey FOREIGN KEY (pot_id) REFERENCES public.saving_pots(id) ON DELETE SET NULL;


--
-- Name: replenishment_run_sources replenishment_run_sources_pot_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_run_sources
    ADD CONSTRAINT replenishment_run_sources_pot_id_fkey FOREIGN KEY (pot_id) REFERENCES public.saving_pots(id) ON DELETE RESTRICT;


--
-- Name: replenishment_run_sources replenishment_run_sources_resolved_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_run_sources
    ADD CONSTRAINT replenishment_run_sources_resolved_account_id_fkey FOREIGN KEY (resolved_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: replenishment_run_sources replenishment_run_sources_run_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_run_sources
    ADD CONSTRAINT replenishment_run_sources_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.replenishment_runs(id) ON DELETE CASCADE;


--
-- Name: replenishment_run_transactions replenishment_run_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_run_transactions
    ADD CONSTRAINT replenishment_run_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: replenishment_run_transactions replenishment_run_transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_run_transactions
    ADD CONSTRAINT replenishment_run_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: replenishment_run_transactions replenishment_run_transactions_run_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_run_transactions
    ADD CONSTRAINT replenishment_run_transactions_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.replenishment_runs(id) ON DELETE CASCADE;


--
-- Name: replenishment_run_transactions replenishment_run_transactions_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_run_transactions
    ADD CONSTRAINT replenishment_run_transactions_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE RESTRICT;


--
-- Name: replenishment_runs replenishment_runs_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_runs
    ADD CONSTRAINT replenishment_runs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: replenishment_runs replenishment_runs_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.replenishment_runs
    ADD CONSTRAINT replenishment_runs_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: saving_pot_accounts saving_pot_accounts_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.saving_pot_accounts
    ADD CONSTRAINT saving_pot_accounts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: saving_pot_accounts saving_pot_accounts_pot_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.saving_pot_accounts
    ADD CONSTRAINT saving_pot_accounts_pot_id_fkey FOREIGN KEY (pot_id) REFERENCES public.saving_pots(id) ON DELETE CASCADE;


--
-- Name: saving_pots saving_pots_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.saving_pots
    ADD CONSTRAINT saving_pots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: saving_pots saving_pots_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.saving_pots
    ADD CONSTRAINT saving_pots_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: transaction_allocations transaction_allocations_account_id_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_allocations
    ADD CONSTRAINT transaction_allocations_account_id_household_id_fkey FOREIGN KEY (account_id, household_id) REFERENCES public.accounts(id, household_id) ON DELETE RESTRICT;


--
-- Name: transaction_allocations transaction_allocations_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_allocations
    ADD CONSTRAINT transaction_allocations_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: transaction_allocations transaction_allocations_original_account_household_fk; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_allocations
    ADD CONSTRAINT transaction_allocations_original_account_household_fk FOREIGN KEY (original_account_id, household_id) REFERENCES public.accounts(id, household_id) ON DELETE RESTRICT;


--
-- Name: transaction_allocations transaction_allocations_original_pot_household_fk; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_allocations
    ADD CONSTRAINT transaction_allocations_original_pot_household_fk FOREIGN KEY (original_pot_id, household_id) REFERENCES public.saving_pots(id, household_id) ON DELETE RESTRICT;


--
-- Name: transaction_allocations transaction_allocations_pot_id_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_allocations
    ADD CONSTRAINT transaction_allocations_pot_id_household_id_fkey FOREIGN KEY (pot_id, household_id) REFERENCES public.saving_pots(id, household_id) ON DELETE RESTRICT;


--
-- Name: transaction_allocations transaction_allocations_replenishment_run_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_allocations
    ADD CONSTRAINT transaction_allocations_replenishment_run_id_fkey FOREIGN KEY (replenishment_run_id) REFERENCES public.replenishment_runs(id) ON DELETE SET NULL;


--
-- Name: transaction_allocations transaction_allocations_transaction_id_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_allocations
    ADD CONSTRAINT transaction_allocations_transaction_id_household_id_fkey FOREIGN KEY (transaction_id, household_id) REFERENCES public.transactions(id, household_id) ON DELETE CASCADE;


--
-- Name: transaction_import_batches transaction_import_batches_account_household_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_import_batches
    ADD CONSTRAINT transaction_import_batches_account_household_fkey FOREIGN KEY (account_id, household_id) REFERENCES public.accounts(id, household_id) ON DELETE RESTRICT;


--
-- Name: transaction_import_batches transaction_import_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_import_batches
    ADD CONSTRAINT transaction_import_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: transaction_import_batches transaction_import_batches_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_import_batches
    ADD CONSTRAINT transaction_import_batches_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: transaction_reimbursements transaction_reimbursements_account_household_fk; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_reimbursements
    ADD CONSTRAINT transaction_reimbursements_account_household_fk FOREIGN KEY (account_id, household_id) REFERENCES public.accounts(id, household_id) ON DELETE RESTRICT;


--
-- Name: transaction_reimbursements transaction_reimbursements_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_reimbursements
    ADD CONSTRAINT transaction_reimbursements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: transaction_reimbursements transaction_reimbursements_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_reimbursements
    ADD CONSTRAINT transaction_reimbursements_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: transaction_reimbursements transaction_reimbursements_pot_household_fk; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_reimbursements
    ADD CONSTRAINT transaction_reimbursements_pot_household_fk FOREIGN KEY (pot_id, household_id) REFERENCES public.saving_pots(id, household_id) ON DELETE RESTRICT;


--
-- Name: transaction_reimbursements transaction_reimbursements_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_reimbursements
    ADD CONSTRAINT transaction_reimbursements_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: transaction_rules transaction_rules_account_id_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_rules
    ADD CONSTRAINT transaction_rules_account_id_household_id_fkey FOREIGN KEY (account_id, household_id) REFERENCES public.accounts(id, household_id) ON DELETE CASCADE;


--
-- Name: transaction_rules transaction_rules_category_id_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_rules
    ADD CONSTRAINT transaction_rules_category_id_household_id_fkey FOREIGN KEY (category_id, household_id) REFERENCES public.categories(id, household_id) ON DELETE RESTRICT;


--
-- Name: transaction_rules transaction_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_rules
    ADD CONSTRAINT transaction_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: transaction_rules transaction_rules_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_rules
    ADD CONSTRAINT transaction_rules_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: transaction_splits transaction_splits_category_id_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_splits
    ADD CONSTRAINT transaction_splits_category_id_household_id_fkey FOREIGN KEY (category_id, household_id) REFERENCES public.categories(id, household_id) ON DELETE RESTRICT;


--
-- Name: transaction_splits transaction_splits_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_splits
    ADD CONSTRAINT transaction_splits_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: transaction_splits transaction_splits_transaction_id_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_splits
    ADD CONSTRAINT transaction_splits_transaction_id_household_id_fkey FOREIGN KEY (transaction_id, household_id) REFERENCES public.transactions(id, household_id) ON DELETE CASCADE;


--
-- Name: transaction_tag_assignments transaction_tag_assignments_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_tag_assignments
    ADD CONSTRAINT transaction_tag_assignments_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: transaction_tag_assignments transaction_tag_assignments_tag_id_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_tag_assignments
    ADD CONSTRAINT transaction_tag_assignments_tag_id_household_id_fkey FOREIGN KEY (tag_id, household_id) REFERENCES public.transaction_tags(id, household_id) ON DELETE CASCADE;


--
-- Name: transaction_tag_assignments transaction_tag_assignments_transaction_id_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_tag_assignments
    ADD CONSTRAINT transaction_tag_assignments_transaction_id_household_id_fkey FOREIGN KEY (transaction_id, household_id) REFERENCES public.transactions(id, household_id) ON DELETE CASCADE;


--
-- Name: transaction_tags transaction_tags_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: transaction_tags transaction_tags_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: transactions transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: transactions transactions_generated_by_rule_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_generated_by_rule_id_fkey FOREIGN KEY (generated_by_rule_id) REFERENCES public.budget_rules(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_import_batch_household_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_import_batch_household_fkey FOREIGN KEY (import_batch_id, household_id) REFERENCES public.transaction_import_batches(id, household_id) ON DELETE RESTRICT;


--
-- Name: transactions transactions_monthly_budget_batch_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_monthly_budget_batch_id_fkey FOREIGN KEY (monthly_budget_batch_id) REFERENCES public.monthly_budget_batches(id) ON DELETE RESTRICT;


--
-- Name: transactions transactions_monthly_budget_run_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_monthly_budget_run_id_fkey FOREIGN KEY (monthly_budget_run_id) REFERENCES public.monthly_budget_runs(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_original_account_household_fk; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_original_account_household_fk FOREIGN KEY (original_account_id, household_id) REFERENCES public.accounts(id, household_id) ON DELETE RESTRICT;


--
-- Name: transactions transactions_original_pot_household_fk; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_original_pot_household_fk FOREIGN KEY (original_pot_id, household_id) REFERENCES public.saving_pots(id, household_id) ON DELETE RESTRICT;


--
-- Name: transactions transactions_planned_item_occurrence_destination_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_planned_item_occurrence_destination_id_fkey FOREIGN KEY (planned_item_occurrence_destination_id) REFERENCES public.planned_item_occurrence_destinations(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_planned_item_occurrence_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_planned_item_occurrence_id_fkey FOREIGN KEY (planned_item_occurrence_id) REFERENCES public.planned_item_occurrences(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_pot_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pot_id_fkey FOREIGN KEY (pot_id) REFERENCES public.saving_pots(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_recurring_execution_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_recurring_execution_id_fkey FOREIGN KEY (recurring_execution_id) REFERENCES public.recurring_run_executions(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_reimbursement_household_fk; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_reimbursement_household_fk FOREIGN KEY (reimbursement_id, household_id) REFERENCES public.transaction_reimbursements(id, household_id) ON DELETE CASCADE;


--
-- Name: transactions transactions_replenishment_run_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_replenishment_run_id_fkey FOREIGN KEY (replenishment_run_id) REFERENCES public.replenishment_runs(id) ON DELETE SET NULL;


--
-- Name: user_keypairs user_keypairs_user_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.user_keypairs
    ADD CONSTRAINT user_keypairs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: wage_flow_categories wage_flow_categories_household_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.wage_flow_categories
    ADD CONSTRAINT wage_flow_categories_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: web_push_subscriptions web_push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public
--

ALTER TABLE ONLY public.web_push_subscriptions
    ADD CONSTRAINT web_push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
