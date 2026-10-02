-- ============================================================
-- SmartFinance baseline 07/09 -- Row level security
-- ============================================================
-- RLS enablement and every policy on public tables.
--
-- Generated 2026-10-01 by squashing the 107 historical migrations
-- (archived in supabase/migrations_archive/) into the final schema they
-- produce. To change the schema from now on, add a NEW migration after
-- these files -- never edit the baseline.

set check_function_bodies = false;

--
-- Name: invitation_email_logs Admins can insert invitation email logs; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can insert invitation email logs" ON public.invitation_email_logs FOR INSERT WITH CHECK ((public.is_household_admin(household_id, auth.uid()) AND (requested_by = auth.uid())));


--
-- Name: budget_configs Admins can manage budget configs; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage budget configs" ON public.budget_configs USING (public.is_household_admin(household_id, auth.uid())) WITH CHECK (public.is_household_admin(household_id, auth.uid()));


--
-- Name: budget_rule_allocations Admins can manage budget rule allocations; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage budget rule allocations" ON public.budget_rule_allocations USING ((EXISTS ( SELECT 1
   FROM (public.budget_rules br
     JOIN public.budget_configs bc ON ((bc.id = br.budget_config_id)))
  WHERE ((br.id = budget_rule_allocations.rule_id) AND public.is_household_admin(bc.household_id, auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.budget_rules br
     JOIN public.budget_configs bc ON ((bc.id = br.budget_config_id)))
  WHERE ((br.id = budget_rule_allocations.rule_id) AND public.is_household_admin(bc.household_id, auth.uid())))));


--
-- Name: budget_rules Admins can manage budget rules; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage budget rules" ON public.budget_rules USING ((EXISTS ( SELECT 1
   FROM public.budget_configs bc
  WHERE ((bc.id = budget_rules.budget_config_id) AND public.is_household_admin(bc.household_id, auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.budget_configs bc
  WHERE ((bc.id = budget_rules.budget_config_id) AND public.is_household_admin(bc.household_id, auth.uid())))));


--
-- Name: household_members Admins can manage household members; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage household members" ON public.household_members USING (public.is_household_admin(household_id, auth.uid())) WITH CHECK (public.is_household_admin(household_id, auth.uid()));


--
-- Name: household_invitations Admins can manage invitations; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage invitations" ON public.household_invitations USING (public.is_household_admin(household_id, auth.uid())) WITH CHECK (public.is_household_admin(household_id, auth.uid()));


--
-- Name: monthly_budget_periods Admins can manage monthly budget periods; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage monthly budget periods" ON public.monthly_budget_periods USING (public.is_household_admin(household_id, auth.uid())) WITH CHECK (public.is_household_admin(household_id, auth.uid()));


--
-- Name: monthly_budget_runs Admins can manage monthly budget runs; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage monthly budget runs" ON public.monthly_budget_runs USING (public.is_household_admin(household_id, auth.uid())) WITH CHECK (public.is_household_admin(household_id, auth.uid()));


--
-- Name: monthly_income_inputs Admins can manage monthly income inputs; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage monthly income inputs" ON public.monthly_income_inputs USING ((EXISTS ( SELECT 1
   FROM public.monthly_budget_runs mbr
  WHERE ((mbr.id = monthly_income_inputs.monthly_budget_run_id) AND public.is_household_admin(mbr.household_id, auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.monthly_budget_runs mbr
  WHERE ((mbr.id = monthly_income_inputs.monthly_budget_run_id) AND public.is_household_admin(mbr.household_id, auth.uid())))));


--
-- Name: planned_item_destinations Admins can manage planned item destinations; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage planned item destinations" ON public.planned_item_destinations USING ((EXISTS ( SELECT 1
   FROM public.planned_items pi
  WHERE ((pi.id = planned_item_destinations.planned_item_id) AND public.is_household_admin(pi.household_id, auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.planned_items pi
  WHERE ((pi.id = planned_item_destinations.planned_item_id) AND public.is_household_admin(pi.household_id, auth.uid())))));


--
-- Name: planned_item_matches Admins can manage planned item matches; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage planned item matches" ON public.planned_item_matches USING ((EXISTS ( SELECT 1
   FROM public.planned_item_occurrences o
  WHERE ((o.id = planned_item_matches.occurrence_id) AND public.is_household_admin(o.household_id, auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.planned_item_occurrences o
  WHERE ((o.id = planned_item_matches.occurrence_id) AND public.is_household_admin(o.household_id, auth.uid())))));


--
-- Name: planned_item_occurrence_destinations Admins can manage planned item occurrence destinations; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage planned item occurrence destinations" ON public.planned_item_occurrence_destinations USING ((EXISTS ( SELECT 1
   FROM public.planned_item_occurrences o
  WHERE ((o.id = planned_item_occurrence_destinations.occurrence_id) AND public.is_household_admin(o.household_id, auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.planned_item_occurrences o
  WHERE ((o.id = planned_item_occurrence_destinations.occurrence_id) AND public.is_household_admin(o.household_id, auth.uid())))));


--
-- Name: planned_item_occurrences Admins can manage planned item occurrences; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage planned item occurrences" ON public.planned_item_occurrences USING (public.is_household_admin(household_id, auth.uid())) WITH CHECK (public.is_household_admin(household_id, auth.uid()));


--
-- Name: planned_items Admins can manage planned items; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can manage planned items" ON public.planned_items USING (public.is_household_admin(household_id, auth.uid())) WITH CHECK (public.is_household_admin(household_id, auth.uid()));


--
-- Name: invitation_email_logs Admins can update invitation email logs; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can update invitation email logs" ON public.invitation_email_logs FOR UPDATE USING (public.is_household_admin(household_id, auth.uid())) WITH CHECK (public.is_household_admin(household_id, auth.uid()));


--
-- Name: invitation_email_logs Admins can view invitation email logs; Type: POLICY; Schema: public
--

CREATE POLICY "Admins can view invitation email logs" ON public.invitation_email_logs FOR SELECT USING (public.is_household_admin(household_id, auth.uid()));


--
-- Name: app_releases Authenticated users can view published releases; Type: POLICY; Schema: public
--

CREATE POLICY "Authenticated users can view published releases" ON public.app_releases FOR SELECT TO authenticated USING ((is_active OR public.is_platform_admin()));


--
-- Name: app_feedback Authors and admins can view feedback; Type: POLICY; Schema: public
--

CREATE POLICY "Authors and admins can view feedback" ON public.app_feedback FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_platform_admin()));


--
-- Name: feedback_attachments Authors and admins can view feedback attachments; Type: POLICY; Schema: public
--

CREATE POLICY "Authors and admins can view feedback attachments" ON public.feedback_attachments FOR SELECT TO authenticated USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.app_feedback f
  WHERE ((f.id = feedback_attachments.feedback_id) AND (f.user_id = auth.uid()))))));


--
-- Name: account_reconciliations Members can create account reconciliations; Type: POLICY; Schema: public
--

CREATE POLICY "Members can create account reconciliations" ON public.account_reconciliations FOR INSERT TO authenticated WITH CHECK ((public.is_household_member(household_id, ( SELECT auth.uid() AS uid)) AND (created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = account_reconciliations.account_id) AND (a.household_id = a.household_id))))));


--
-- Name: transaction_import_batches Members can create transaction import batches; Type: POLICY; Schema: public
--

CREATE POLICY "Members can create transaction import batches" ON public.transaction_import_batches FOR INSERT TO authenticated WITH CHECK ((public.is_household_member(household_id, ( SELECT auth.uid() AS uid)) AND (created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = transaction_import_batches.account_id) AND (a.household_id = a.household_id))))));


--
-- Name: account_reconciliations Members can delete account reconciliations; Type: POLICY; Schema: public
--

CREATE POLICY "Members can delete account reconciliations" ON public.account_reconciliations FOR DELETE TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid)));


--
-- Name: accounts Members can manage accounts; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage accounts" ON public.accounts USING (public.is_household_member(household_id, auth.uid())) WITH CHECK (public.is_household_member(household_id, auth.uid()));


--
-- Name: attachments Members can manage attachments; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage attachments" ON public.attachments USING ((EXISTS ( SELECT 1
   FROM public.transactions t
  WHERE ((t.id = attachments.transaction_id) AND public.is_household_member(t.household_id, auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.transactions t
  WHERE ((t.id = attachments.transaction_id) AND public.is_household_member(t.household_id, auth.uid())))));


--
-- Name: categories Members can manage categories; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage categories" ON public.categories USING (public.is_household_member(household_id, auth.uid())) WITH CHECK (public.is_household_member(household_id, auth.uid()));


--
-- Name: category_budgets Members can manage category budgets; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage category budgets" ON public.category_budgets USING (public.is_household_member(household_id, auth.uid())) WITH CHECK (public.is_household_member(household_id, auth.uid()));


--
-- Name: income_sources Members can manage income sources; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage income sources" ON public.income_sources USING (public.is_household_member(household_id, auth.uid())) WITH CHECK (public.is_household_member(household_id, auth.uid()));


--
-- Name: merchant_aliases Members can manage merchant aliases; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage merchant aliases" ON public.merchant_aliases TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid))) WITH CHECK (public.is_household_member(household_id, ( SELECT auth.uid() AS uid)));


--
-- Name: recurring_expense_matches Members can manage recurring expense matches; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage recurring expense matches" ON public.recurring_expense_matches USING ((EXISTS ( SELECT 1
   FROM public.recurring_expenses re
  WHERE ((re.id = recurring_expense_matches.recurring_expense_id) AND public.is_household_member(re.household_id, auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.recurring_expenses re
  WHERE ((re.id = recurring_expense_matches.recurring_expense_id) AND public.is_household_member(re.household_id, auth.uid())))));


--
-- Name: recurring_expenses Members can manage recurring expenses; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage recurring expenses" ON public.recurring_expenses USING (public.is_household_member(household_id, auth.uid())) WITH CHECK (public.is_household_member(household_id, auth.uid()));


--
-- Name: recurring_transactions Members can manage recurring transactions; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage recurring transactions" ON public.recurring_transactions USING (public.is_household_member(household_id, auth.uid())) WITH CHECK (public.is_household_member(household_id, auth.uid()));


--
-- Name: transaction_reimbursements Members can manage reimbursements; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage reimbursements" ON public.transaction_reimbursements USING (public.is_household_member(household_id, auth.uid())) WITH CHECK (public.is_household_member(household_id, auth.uid()));


--
-- Name: replenishment_run_sources Members can manage replenishment run sources; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage replenishment run sources" ON public.replenishment_run_sources USING ((EXISTS ( SELECT 1
   FROM public.replenishment_runs r
  WHERE ((r.id = replenishment_run_sources.run_id) AND public.is_household_member(r.household_id, auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.replenishment_runs r
  WHERE ((r.id = replenishment_run_sources.run_id) AND public.is_household_member(r.household_id, auth.uid())))));


--
-- Name: replenishment_run_transactions Members can manage replenishment run transactions; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage replenishment run transactions" ON public.replenishment_run_transactions USING ((EXISTS ( SELECT 1
   FROM public.replenishment_runs r
  WHERE ((r.id = replenishment_run_transactions.run_id) AND public.is_household_member(r.household_id, auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.replenishment_runs r
  WHERE ((r.id = replenishment_run_transactions.run_id) AND public.is_household_member(r.household_id, auth.uid())))));


--
-- Name: replenishment_runs Members can manage replenishment runs; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage replenishment runs" ON public.replenishment_runs USING (public.is_household_member(household_id, auth.uid())) WITH CHECK (public.is_household_member(household_id, auth.uid()));


--
-- Name: saving_pot_accounts Members can manage saving pot accounts; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage saving pot accounts" ON public.saving_pot_accounts USING ((EXISTS ( SELECT 1
   FROM (public.saving_pots sp
     JOIN public.accounts a ON ((a.id = saving_pot_accounts.account_id)))
  WHERE ((sp.id = saving_pot_accounts.pot_id) AND (sp.household_id = a.household_id) AND public.is_household_member(sp.household_id, auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.saving_pots sp
     JOIN public.accounts a ON ((a.id = saving_pot_accounts.account_id)))
  WHERE ((sp.id = saving_pot_accounts.pot_id) AND (sp.household_id = a.household_id) AND public.is_household_member(sp.household_id, auth.uid())))));


--
-- Name: saving_pots Members can manage saving pots; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage saving pots" ON public.saving_pots USING (public.is_household_member(household_id, auth.uid())) WITH CHECK (public.is_household_member(household_id, auth.uid()));


--
-- Name: transaction_allocations Members can manage transaction allocations; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage transaction allocations" ON public.transaction_allocations TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid))) WITH CHECK ((public.is_household_member(household_id, ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.transactions t
  WHERE ((t.id = transaction_allocations.transaction_id) AND (t.household_id = transaction_allocations.household_id))))));


--
-- Name: transaction_rules Members can manage transaction rules; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage transaction rules" ON public.transaction_rules TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid))) WITH CHECK ((public.is_household_member(household_id, ( SELECT auth.uid() AS uid)) AND ((account_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = transaction_rules.account_id) AND (a.household_id = transaction_rules.household_id))))) AND ((category_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.categories c
  WHERE ((c.id = transaction_rules.category_id) AND (c.household_id = transaction_rules.household_id)))))));


--
-- Name: transaction_splits Members can manage transaction splits; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage transaction splits" ON public.transaction_splits TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid))) WITH CHECK ((public.is_household_member(household_id, ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.transactions t
  WHERE ((t.id = transaction_splits.transaction_id) AND (t.household_id = transaction_splits.household_id)))) AND ((category_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.categories c
  WHERE ((c.id = transaction_splits.category_id) AND (c.household_id = transaction_splits.household_id)))))));


--
-- Name: transaction_tag_assignments Members can manage transaction tag assignments; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage transaction tag assignments" ON public.transaction_tag_assignments TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid))) WITH CHECK ((public.is_household_member(household_id, ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.transactions t
  WHERE ((t.id = transaction_tag_assignments.transaction_id) AND (t.household_id = transaction_tag_assignments.household_id))))));


--
-- Name: transaction_tags Members can manage transaction tags; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage transaction tags" ON public.transaction_tags TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid))) WITH CHECK (public.is_household_member(household_id, ( SELECT auth.uid() AS uid)));


--
-- Name: transactions Members can manage transactions; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage transactions" ON public.transactions USING (public.is_household_member(household_id, auth.uid())) WITH CHECK (public.is_household_member(household_id, auth.uid()));


--
-- Name: wage_flow_categories Members can manage wage flow categories; Type: POLICY; Schema: public
--

CREATE POLICY "Members can manage wage flow categories" ON public.wage_flow_categories USING (public.is_household_member(household_id, auth.uid())) WITH CHECK (public.is_household_member(household_id, auth.uid()));


--
-- Name: transaction_import_batches Members can update transaction import batches; Type: POLICY; Schema: public
--

CREATE POLICY "Members can update transaction import batches" ON public.transaction_import_batches FOR UPDATE TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid))) WITH CHECK ((public.is_household_member(household_id, ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.accounts a
  WHERE ((a.id = transaction_import_batches.account_id) AND (a.household_id = a.household_id))))));


--
-- Name: account_reconciliations Members can view account reconciliations; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view account reconciliations" ON public.account_reconciliations FOR SELECT TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid)));


--
-- Name: accounts Members can view accounts; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view accounts" ON public.accounts FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: budget_rules Members can view active budget rules; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view active budget rules" ON public.budget_rules FOR SELECT USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.budget_configs bc
  WHERE ((bc.id = budget_rules.budget_config_id) AND public.is_household_member(bc.household_id, auth.uid()))))));


--
-- Name: attachments Members can view attachments; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view attachments" ON public.attachments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.transactions t
  WHERE ((t.id = attachments.transaction_id) AND public.is_household_member(t.household_id, auth.uid())))));


--
-- Name: audit_logs Members can view audit logs; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: budget_configs Members can view budget configs; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view budget configs" ON public.budget_configs FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: budget_rule_allocations Members can view budget rule allocations; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view budget rule allocations" ON public.budget_rule_allocations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.budget_rules br
     JOIN public.budget_configs bc ON ((bc.id = br.budget_config_id)))
  WHERE ((br.id = budget_rule_allocations.rule_id) AND (br.deleted_at IS NULL) AND public.is_household_member(bc.household_id, auth.uid())))));


--
-- Name: categories Members can view categories; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view categories" ON public.categories FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: category_budgets Members can view category budgets; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view category budgets" ON public.category_budgets FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: households Members can view household; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view household" ON public.households FOR SELECT USING (public.is_household_member(id, auth.uid()));


--
-- Name: household_members Members can view household members; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view household members" ON public.household_members FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: profiles Members can view household profiles; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view household profiles" ON public.profiles FOR SELECT USING (((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM (public.household_members hm_viewer
     JOIN public.household_members hm_target ON (((hm_target.household_id = hm_viewer.household_id) AND (hm_target.status = 'accepted'::public.household_member_status))))
  WHERE ((hm_viewer.user_id = auth.uid()) AND (hm_viewer.status = 'accepted'::public.household_member_status) AND (hm_target.user_id = profiles.id))))));


--
-- Name: income_sources Members can view income sources; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view income sources" ON public.income_sources FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: household_invitations Members can view invitations; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view invitations" ON public.household_invitations FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: monthly_budget_batches Members can view monthly budget batches; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view monthly budget batches" ON public.monthly_budget_batches FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: monthly_budget_periods Members can view monthly budget periods; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view monthly budget periods" ON public.monthly_budget_periods FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: monthly_budget_runs Members can view monthly budget runs; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view monthly budget runs" ON public.monthly_budget_runs FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: monthly_income_inputs Members can view monthly income inputs; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view monthly income inputs" ON public.monthly_income_inputs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.monthly_budget_runs mbr
  WHERE ((mbr.id = monthly_income_inputs.monthly_budget_run_id) AND public.is_household_member(mbr.household_id, auth.uid())))));


--
-- Name: planned_item_destinations Members can view planned item destinations; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view planned item destinations" ON public.planned_item_destinations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.planned_items pi
  WHERE ((pi.id = planned_item_destinations.planned_item_id) AND public.is_household_member(pi.household_id, auth.uid())))));


--
-- Name: planned_item_matches Members can view planned item matches; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view planned item matches" ON public.planned_item_matches FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.planned_item_occurrences o
  WHERE ((o.id = planned_item_matches.occurrence_id) AND public.is_household_member(o.household_id, auth.uid())))));


--
-- Name: planned_item_occurrence_destinations Members can view planned item occurrence destinations; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view planned item occurrence destinations" ON public.planned_item_occurrence_destinations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.planned_item_occurrences o
  WHERE ((o.id = planned_item_occurrence_destinations.occurrence_id) AND public.is_household_member(o.household_id, auth.uid())))));


--
-- Name: planned_item_occurrences Members can view planned item occurrences; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view planned item occurrences" ON public.planned_item_occurrences FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: planned_items Members can view planned items; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view planned items" ON public.planned_items FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: recurring_expense_matches Members can view recurring expense matches; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view recurring expense matches" ON public.recurring_expense_matches FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.recurring_expenses re
  WHERE ((re.id = recurring_expense_matches.recurring_expense_id) AND public.is_household_member(re.household_id, auth.uid())))));


--
-- Name: recurring_expenses Members can view recurring expenses; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view recurring expenses" ON public.recurring_expenses FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: recurring_run_executions Members can view recurring run executions; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view recurring run executions" ON public.recurring_run_executions FOR SELECT TO authenticated USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: recurring_transactions Members can view recurring transactions; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view recurring transactions" ON public.recurring_transactions FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: transaction_reimbursements Members can view reimbursements; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view reimbursements" ON public.transaction_reimbursements FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: replenishment_run_sources Members can view replenishment run sources; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view replenishment run sources" ON public.replenishment_run_sources FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.replenishment_runs r
  WHERE ((r.id = replenishment_run_sources.run_id) AND public.is_household_member(r.household_id, auth.uid())))));


--
-- Name: replenishment_run_transactions Members can view replenishment run transactions; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view replenishment run transactions" ON public.replenishment_run_transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.replenishment_runs r
  WHERE ((r.id = replenishment_run_transactions.run_id) AND public.is_household_member(r.household_id, auth.uid())))));


--
-- Name: replenishment_runs Members can view replenishment runs; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view replenishment runs" ON public.replenishment_runs FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: saving_pot_accounts Members can view saving pot accounts; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view saving pot accounts" ON public.saving_pot_accounts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.saving_pots sp
     JOIN public.accounts a ON ((a.id = saving_pot_accounts.account_id)))
  WHERE ((sp.id = saving_pot_accounts.pot_id) AND (sp.household_id = a.household_id) AND public.is_household_member(sp.household_id, auth.uid())))));


--
-- Name: saving_pots Members can view saving pots; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view saving pots" ON public.saving_pots FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: transaction_import_batches Members can view transaction import batches; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view transaction import batches" ON public.transaction_import_batches FOR SELECT TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid)));


--
-- Name: transactions Members can view transactions; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view transactions" ON public.transactions FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: wage_flow_categories Members can view wage flow categories; Type: POLICY; Schema: public
--

CREATE POLICY "Members can view wage flow categories" ON public.wage_flow_categories FOR SELECT USING (public.is_household_member(household_id, auth.uid()));


--
-- Name: households Owners can update household; Type: POLICY; Schema: public
--

CREATE POLICY "Owners can update household" ON public.households FOR UPDATE USING (public.is_household_owner(id, auth.uid()));


--
-- Name: feedback_events Participants can view feedback events; Type: POLICY; Schema: public
--

CREATE POLICY "Participants can view feedback events" ON public.feedback_events FOR SELECT TO authenticated USING ((public.is_platform_admin() OR (visible_to_author AND (EXISTS ( SELECT 1
   FROM public.app_feedback f
  WHERE ((f.id = feedback_events.feedback_id) AND (f.user_id = auth.uid())))))));


--
-- Name: feedback_messages Participants can view feedback messages; Type: POLICY; Schema: public
--

CREATE POLICY "Participants can view feedback messages" ON public.feedback_messages FOR SELECT TO authenticated USING ((public.is_platform_admin() OR ((message_type = 'reply'::text) AND (EXISTS ( SELECT 1
   FROM public.app_feedback f
  WHERE ((f.id = feedback_messages.feedback_id) AND (f.user_id = auth.uid())))))));


--
-- Name: platform_admins Platform admins can view admin directory; Type: POLICY; Schema: public
--

CREATE POLICY "Platform admins can view admin directory" ON public.platform_admins FOR SELECT TO authenticated USING (public.is_platform_admin());


--
-- Name: profiles Profiles can insert their own profile; Type: POLICY; Schema: public
--

CREATE POLICY "Profiles can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: dashboard_network_configs Profiles can manage their own dashboard network config; Type: POLICY; Schema: public
--

CREATE POLICY "Profiles can manage their own dashboard network config" ON public.dashboard_network_configs USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- Name: profiles Profiles can update their own profile; Type: POLICY; Schema: public
--

CREATE POLICY "Profiles can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: dashboard_network_configs Profiles can view their own dashboard network config; Type: POLICY; Schema: public
--

CREATE POLICY "Profiles can view their own dashboard network config" ON public.dashboard_network_configs FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: profiles Profiles can view their own profile; Type: POLICY; Schema: public
--

CREATE POLICY "Profiles can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: app_notifications Users can create their own notifications; Type: POLICY; Schema: public
--

CREATE POLICY "Users can create their own notifications" ON public.app_notifications FOR INSERT TO authenticated WITH CHECK ((recipient_id = auth.uid()));


--
-- Name: app_notifications Users can delete their own notifications; Type: POLICY; Schema: public
--

CREATE POLICY "Users can delete their own notifications" ON public.app_notifications FOR DELETE TO authenticated USING ((recipient_id = auth.uid()));


--
-- Name: app_notifications Users can mark their notifications read; Type: POLICY; Schema: public
--

CREATE POLICY "Users can mark their notifications read" ON public.app_notifications FOR UPDATE TO authenticated USING ((recipient_id = auth.uid())) WITH CHECK ((recipient_id = auth.uid()));


--
-- Name: app_notifications Users can view their notifications; Type: POLICY; Schema: public
--

CREATE POLICY "Users can view their notifications" ON public.app_notifications FOR SELECT TO authenticated USING ((recipient_id = auth.uid()));


--
-- Name: push_devices Users manage their own push devices; Type: POLICY; Schema: public
--

CREATE POLICY "Users manage their own push devices" ON public.push_devices TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: web_push_subscriptions Users manage their own web push subscriptions; Type: POLICY; Schema: public
--

CREATE POLICY "Users manage their own web push subscriptions" ON public.web_push_subscriptions TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: account_reconciliations; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.account_reconciliations ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: app_feedback; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: app_notifications; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: app_releases; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

--
-- Name: attachments; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_configs; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.budget_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_rule_allocations; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.budget_rule_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_rules; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.budget_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: category_budgets; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: dashboard_network_configs; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.dashboard_network_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_attachments; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.feedback_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_email_attempts; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.feedback_email_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_email_outbox; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.feedback_email_outbox ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_events; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_messages; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_rate_limit_events; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.feedback_rate_limit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_rpc_requests; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.feedback_rpc_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: household_encryption_status; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.household_encryption_status ENABLE ROW LEVEL SECURITY;

--
-- Name: household_encryption_status household_encryption_status_select_member; Type: POLICY; Schema: public
--

CREATE POLICY household_encryption_status_select_member ON public.household_encryption_status FOR SELECT TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid)));


--
-- Name: household_encryption_status household_encryption_status_write_admin; Type: POLICY; Schema: public
--

CREATE POLICY household_encryption_status_write_admin ON public.household_encryption_status TO authenticated USING (public.is_household_admin(household_id, ( SELECT auth.uid() AS uid))) WITH CHECK (public.is_household_admin(household_id, ( SELECT auth.uid() AS uid)));


--
-- Name: household_invitations; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.household_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: household_key_wraps; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.household_key_wraps ENABLE ROW LEVEL SECURITY;

--
-- Name: household_key_wraps household_key_wraps_delete_admin; Type: POLICY; Schema: public
--

CREATE POLICY household_key_wraps_delete_admin ON public.household_key_wraps FOR DELETE TO authenticated USING (public.is_household_admin(household_id, ( SELECT auth.uid() AS uid)));


--
-- Name: household_key_wraps household_key_wraps_insert_member; Type: POLICY; Schema: public
--

CREATE POLICY household_key_wraps_insert_member ON public.household_key_wraps FOR INSERT TO authenticated WITH CHECK ((public.is_household_member(household_id, ( SELECT auth.uid() AS uid)) AND public.is_household_member(household_id, member_user_id)));


--
-- Name: household_key_wraps household_key_wraps_select_member; Type: POLICY; Schema: public
--

CREATE POLICY household_key_wraps_select_member ON public.household_key_wraps FOR SELECT TO authenticated USING (public.is_household_member(household_id, ( SELECT auth.uid() AS uid)));


--
-- Name: household_members; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

--
-- Name: households; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

--
-- Name: income_sources; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: invitation_email_logs; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.invitation_email_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_aliases; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.merchant_aliases ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_budget_batches; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.monthly_budget_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_budget_periods; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.monthly_budget_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_budget_runs; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.monthly_budget_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_income_inputs; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.monthly_income_inputs ENABLE ROW LEVEL SECURITY;

--
-- Name: planned_item_destinations; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.planned_item_destinations ENABLE ROW LEVEL SECURITY;

--
-- Name: planned_item_matches; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.planned_item_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: planned_item_occurrence_destinations; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.planned_item_occurrence_destinations ENABLE ROW LEVEL SECURITY;

--
-- Name: planned_item_occurrences; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.planned_item_occurrences ENABLE ROW LEVEL SECURITY;

--
-- Name: planned_items; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.planned_items ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_admins; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_devices; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_expense_matches; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.recurring_expense_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_expenses; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_run_executions; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.recurring_run_executions ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_transactions; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: replenishment_run_sources; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.replenishment_run_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: replenishment_run_transactions; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.replenishment_run_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: replenishment_runs; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.replenishment_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: saving_pot_accounts; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.saving_pot_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: saving_pots; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.saving_pots ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_allocations; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.transaction_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_import_batches; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.transaction_import_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_reimbursements; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.transaction_reimbursements ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_rules; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.transaction_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_splits; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_tag_assignments; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.transaction_tag_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_tags; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_keypairs; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.user_keypairs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_keypairs user_keypairs_insert_own; Type: POLICY; Schema: public
--

CREATE POLICY user_keypairs_insert_own ON public.user_keypairs FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_keypairs user_keypairs_select_own; Type: POLICY; Schema: public
--

CREATE POLICY user_keypairs_select_own ON public.user_keypairs FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_keypairs user_keypairs_update_own; Type: POLICY; Schema: public
--

CREATE POLICY user_keypairs_update_own ON public.user_keypairs FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: wage_flow_categories; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.wage_flow_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: web_push_subscriptions; Type: ROW SECURITY; Schema: public
--

ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
