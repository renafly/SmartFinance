-- ============================================================
-- SmartFinance baseline 06/09 -- Triggers
-- ============================================================
-- updated_at, audit, validation and bookkeeping triggers on public tables.
--
-- Generated 2026-10-01 by squashing the 107 historical migrations
-- (archived in supabase/migrations_archive/) into the final schema they
-- produce. To change the schema from now on, add a NEW migration after
-- these files -- never edit the baseline.

set check_function_bodies = false;

--
-- Name: accounts audit_accounts; Type: TRIGGER; Schema: public
--

CREATE TRIGGER audit_accounts AFTER INSERT OR DELETE OR UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: attachments audit_attachments; Type: TRIGGER; Schema: public
--

CREATE TRIGGER audit_attachments AFTER INSERT OR DELETE OR UPDATE ON public.attachments FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: budget_rules audit_budget_rules; Type: TRIGGER; Schema: public
--

CREATE TRIGGER audit_budget_rules AFTER INSERT OR DELETE OR UPDATE ON public.budget_rules FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: categories audit_categories; Type: TRIGGER; Schema: public
--

CREATE TRIGGER audit_categories AFTER INSERT OR DELETE OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: recurring_transactions audit_recurring_transactions; Type: TRIGGER; Schema: public
--

CREATE TRIGGER audit_recurring_transactions AFTER INSERT OR DELETE OR UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: saving_pots audit_saving_pots; Type: TRIGGER; Schema: public
--

CREATE TRIGGER audit_saving_pots AFTER INSERT OR DELETE OR UPDATE ON public.saving_pots FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: transactions audit_transactions; Type: TRIGGER; Schema: public
--

CREATE TRIGGER audit_transactions AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();


--
-- Name: planned_item_destinations bump_planned_item_version_on_destination_change; Type: TRIGGER; Schema: public
--

CREATE TRIGGER bump_planned_item_version_on_destination_change AFTER INSERT OR DELETE OR UPDATE ON public.planned_item_destinations FOR EACH ROW EXECUTE FUNCTION public.bump_planned_item_version_from_destination();


--
-- Name: planned_items bump_planned_items_definition_version; Type: TRIGGER; Schema: public
--

CREATE TRIGGER bump_planned_items_definition_version BEFORE UPDATE ON public.planned_items FOR EACH ROW EXECUTE FUNCTION public.bump_planned_item_definition_version();


--
-- Name: transactions categorize_monthly_budget_wage_on_insert; Type: TRIGGER; Schema: public
--

CREATE TRIGGER categorize_monthly_budget_wage_on_insert BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.categorize_monthly_budget_wage();


--
-- Name: planned_item_destinations check_planned_item_destinations_deferred; Type: TRIGGER; Schema: public
--

CREATE CONSTRAINT TRIGGER check_planned_item_destinations_deferred AFTER INSERT OR DELETE OR UPDATE ON public.planned_item_destinations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_planned_item_destinations_deferred();


--
-- Name: planned_item_occurrence_destinations check_planned_item_occurrence_destinations_deferred; Type: TRIGGER; Schema: public
--

CREATE CONSTRAINT TRIGGER check_planned_item_occurrence_destinations_deferred AFTER INSERT OR DELETE OR UPDATE ON public.planned_item_occurrence_destinations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_planned_item_occurrence_destinations_deferred();


--
-- Name: app_notifications dispatch_app_notification_push; Type: TRIGGER; Schema: public
--

CREATE TRIGGER dispatch_app_notification_push AFTER INSERT ON public.app_notifications FOR EACH ROW EXECUTE FUNCTION public.dispatch_app_notification_push();


--
-- Name: transactions drop_reimbursements_when_not_expense; Type: TRIGGER; Schema: public
--

CREATE TRIGGER drop_reimbursements_when_not_expense AFTER UPDATE OF type, transfer_group_id ON public.transactions FOR EACH ROW WHEN (((old.type = 'expense'::public.transaction_type) AND (old.transfer_group_id IS NULL) AND ((new.type <> 'expense'::public.transaction_type) OR (new.transfer_group_id IS NOT NULL)))) EXECUTE FUNCTION public.drop_reimbursements_when_not_expense();


--
-- Name: saving_pot_accounts enforce_saving_pot_account_integrity; Type: TRIGGER; Schema: public
--

CREATE CONSTRAINT TRIGGER enforce_saving_pot_account_integrity AFTER INSERT OR DELETE OR UPDATE ON public.saving_pot_accounts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.enforce_saving_pot_account_integrity();


--
-- Name: transaction_allocations enforce_transaction_allocations_integrity; Type: TRIGGER; Schema: public
--

CREATE CONSTRAINT TRIGGER enforce_transaction_allocations_integrity AFTER INSERT OR DELETE OR UPDATE ON public.transaction_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.enforce_transaction_allocations_integrity();


--
-- Name: transaction_reimbursements enforce_transaction_reimbursements_target; Type: TRIGGER; Schema: public
--

CREATE TRIGGER enforce_transaction_reimbursements_target BEFORE INSERT OR UPDATE ON public.transaction_reimbursements FOR EACH ROW EXECUTE FUNCTION public.enforce_reimbursement_target();


--
-- Name: transactions guard_reimbursement_income_change; Type: TRIGGER; Schema: public
--

CREATE TRIGGER guard_reimbursement_income_change BEFORE DELETE OR UPDATE ON public.transactions FOR EACH ROW WHEN ((old.reimbursement_id IS NOT NULL)) EXECUTE FUNCTION public.guard_reimbursement_income_transaction();


--
-- Name: transactions guard_reimbursement_income_insert; Type: TRIGGER; Schema: public
--

CREATE TRIGGER guard_reimbursement_income_insert BEFORE INSERT ON public.transactions FOR EACH ROW WHEN ((new.reimbursement_id IS NOT NULL)) EXECUTE FUNCTION public.guard_reimbursement_income_transaction();


--
-- Name: planned_item_occurrences maybe_close_monthly_budget_period_on_occurrence_status; Type: TRIGGER; Schema: public
--

CREATE TRIGGER maybe_close_monthly_budget_period_on_occurrence_status AFTER UPDATE ON public.planned_item_occurrences FOR EACH ROW WHEN (((old.status = 'planned'::public.planned_item_occurrence_status) AND (new.status <> 'planned'::public.planned_item_occurrence_status))) EXECUTE FUNCTION public.maybe_close_monthly_budget_period();


--
-- Name: categories reassign_transactions_before_category_delete; Type: TRIGGER; Schema: public
--

CREATE TRIGGER reassign_transactions_before_category_delete BEFORE DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.reassign_transactions_before_category_delete();


--
-- Name: households seed_categories_on_household_insert; Type: TRIGGER; Schema: public
--

CREATE TRIGGER seed_categories_on_household_insert AFTER INSERT ON public.households FOR EACH ROW EXECUTE FUNCTION public.seed_categories_on_household_insert();


--
-- Name: accounts set_accounts_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: app_feedback set_app_feedback_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_app_feedback_updated_at BEFORE UPDATE ON public.app_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: app_releases set_app_releases_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_app_releases_updated_at BEFORE UPDATE ON public.app_releases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: budget_configs set_budget_configs_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_budget_configs_updated_at BEFORE UPDATE ON public.budget_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: budget_rule_allocations set_budget_rule_allocations_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_budget_rule_allocations_updated_at BEFORE UPDATE ON public.budget_rule_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: budget_rules set_budget_rules_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_budget_rules_updated_at BEFORE UPDATE ON public.budget_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: categories set_categories_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: dashboard_network_configs set_dashboard_network_configs_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_dashboard_network_configs_updated_at BEFORE UPDATE ON public.dashboard_network_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: feedback_email_outbox set_feedback_email_outbox_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_feedback_email_outbox_updated_at BEFORE UPDATE ON public.feedback_email_outbox FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: feedback_messages set_feedback_messages_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_feedback_messages_updated_at BEFORE UPDATE ON public.feedback_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: households set_households_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_households_updated_at BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: income_sources set_income_sources_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_income_sources_updated_at BEFORE UPDATE ON public.income_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: merchant_aliases set_merchant_aliases_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_merchant_aliases_updated_at BEFORE UPDATE ON public.merchant_aliases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: monthly_budget_periods set_monthly_budget_periods_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_monthly_budget_periods_updated_at BEFORE UPDATE ON public.monthly_budget_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: monthly_budget_runs set_monthly_budget_runs_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_monthly_budget_runs_updated_at BEFORE UPDATE ON public.monthly_budget_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: monthly_income_inputs set_monthly_income_inputs_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_monthly_income_inputs_updated_at BEFORE UPDATE ON public.monthly_income_inputs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: planned_item_destinations set_planned_item_destinations_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_planned_item_destinations_updated_at BEFORE UPDATE ON public.planned_item_destinations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: planned_item_occurrence_destinations set_planned_item_occurrence_destinations_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_planned_item_occurrence_destinations_updated_at BEFORE UPDATE ON public.planned_item_occurrence_destinations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: planned_item_occurrences set_planned_item_occurrences_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_planned_item_occurrences_updated_at BEFORE UPDATE ON public.planned_item_occurrences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: planned_items set_planned_items_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_planned_items_updated_at BEFORE UPDATE ON public.planned_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: platform_admins set_platform_admins_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_platform_admins_updated_at BEFORE UPDATE ON public.platform_admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles set_profiles_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: push_devices set_push_devices_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_push_devices_updated_at BEFORE UPDATE ON public.push_devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: recurring_expenses set_recurring_expenses_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_recurring_expenses_updated_at BEFORE UPDATE ON public.recurring_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: recurring_run_executions set_recurring_run_executions_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_recurring_run_executions_updated_at BEFORE UPDATE ON public.recurring_run_executions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: recurring_transactions set_recurring_transactions_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_recurring_transactions_updated_at BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: replenishment_run_sources set_replenishment_run_sources_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_replenishment_run_sources_updated_at BEFORE UPDATE ON public.replenishment_run_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: replenishment_runs set_replenishment_runs_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_replenishment_runs_updated_at BEFORE UPDATE ON public.replenishment_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: saving_pots set_saving_pots_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_saving_pots_updated_at BEFORE UPDATE ON public.saving_pots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: transaction_allocations set_transaction_allocations_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_transaction_allocations_updated_at BEFORE UPDATE ON public.transaction_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: transaction_reimbursements set_transaction_reimbursements_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_transaction_reimbursements_updated_at BEFORE UPDATE ON public.transaction_reimbursements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: transaction_rules set_transaction_rules_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_transaction_rules_updated_at BEFORE UPDATE ON public.transaction_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: transaction_splits set_transaction_splits_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_transaction_splits_updated_at BEFORE UPDATE ON public.transaction_splits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: transaction_tags set_transaction_tags_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_transaction_tags_updated_at BEFORE UPDATE ON public.transaction_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: transactions set_transactions_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: household_encryption_status set_updated_at_household_encryption_status; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_updated_at_household_encryption_status BEFORE UPDATE ON public.household_encryption_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: user_keypairs set_updated_at_user_keypairs; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_updated_at_user_keypairs BEFORE UPDATE ON public.user_keypairs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: wage_flow_categories set_wage_flow_categories_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_wage_flow_categories_updated_at BEFORE UPDATE ON public.wage_flow_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: web_push_subscriptions set_web_push_subscriptions_updated_at; Type: TRIGGER; Schema: public
--

CREATE TRIGGER set_web_push_subscriptions_updated_at BEFORE UPDATE ON public.web_push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: transaction_reimbursements sync_reimbursement_income_transaction; Type: TRIGGER; Schema: public
--

CREATE TRIGGER sync_reimbursement_income_transaction AFTER INSERT OR UPDATE ON public.transaction_reimbursements FOR EACH ROW EXECUTE FUNCTION public.sync_reimbursement_income_transaction();


--
-- Name: planned_item_destinations validate_planned_item_destination; Type: TRIGGER; Schema: public
--

CREATE TRIGGER validate_planned_item_destination BEFORE INSERT OR UPDATE ON public.planned_item_destinations FOR EACH ROW EXECUTE FUNCTION public.validate_planned_item_destination();


--
-- Name: recurring_run_executions validate_recurring_run_execution_household; Type: TRIGGER; Schema: public
--

CREATE TRIGGER validate_recurring_run_execution_household BEFORE INSERT OR UPDATE OF household_id, recurring_transaction_id ON public.recurring_run_executions FOR EACH ROW EXECUTE FUNCTION public.validate_recurring_run_execution_household();


--
-- Name: recurring_transactions validate_recurring_transaction_destinations; Type: TRIGGER; Schema: public
--

CREATE TRIGGER validate_recurring_transaction_destinations BEFORE INSERT OR UPDATE OF household_id, account_id, category_id, pot_id, destination_account_id, destination_pot_id ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION public.validate_recurring_transaction_destinations();


--
-- Name: transactions validate_transaction_recurring_execution_household; Type: TRIGGER; Schema: public
--

CREATE TRIGGER validate_transaction_recurring_execution_household BEFORE INSERT OR UPDATE OF household_id, recurring_execution_id ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_recurring_execution_household();
