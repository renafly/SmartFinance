-- ============================================================
-- SmartFinance baseline 08/09 -- Grants
-- ============================================================
-- Explicit function/table privileges (revoke from public, grant to authenticated/service_role).
--
-- Generated 2026-10-01 by squashing the 107 historical migrations
-- (archived in supabase/migrations_archive/) into the final schema they
-- produce. To change the schema from now on, add a NEW migration after
-- these files -- never edit the baseline.

set check_function_bodies = false;

--
-- Name: TYPE account_type; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.account_type TO authenticated;


--
-- Name: TYPE budget_rule_allocation_mode; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.budget_rule_allocation_mode TO authenticated;


--
-- Name: TYPE category_type; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.category_type TO authenticated;


--
-- Name: TYPE currency_code; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.currency_code TO authenticated;


--
-- Name: TYPE excess_cash_distribution_method; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.excess_cash_distribution_method TO authenticated;


--
-- Name: TYPE household_income_mode; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.household_income_mode TO authenticated;


--
-- Name: TYPE household_member_status; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.household_member_status TO authenticated;


--
-- Name: TYPE household_role; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.household_role TO anon;
GRANT ALL ON TYPE public.household_role TO authenticated;


--
-- Name: TYPE monthly_budget_run_status; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.monthly_budget_run_status TO authenticated;


--
-- Name: TYPE monthly_budget_section; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.monthly_budget_section TO authenticated;


--
-- Name: TYPE recurring_execution_status; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.recurring_execution_status TO authenticated;


--
-- Name: TYPE recurring_expense_kind; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.recurring_expense_kind TO authenticated;


--
-- Name: TYPE recurring_frequency; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.recurring_frequency TO authenticated;


--
-- Name: TYPE recurring_rule_kind; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.recurring_rule_kind TO authenticated;


--
-- Name: TYPE remaining_cash_strategy; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.remaining_cash_strategy TO authenticated;


--
-- Name: TYPE transaction_type; Type: ACL; Schema: public
--

GRANT ALL ON TYPE public.transaction_type TO authenticated;


--
-- Name: FUNCTION accept_household_invitation(p_token text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.accept_household_invitation(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.accept_household_invitation(p_token text) TO authenticated;


--
-- Name: FUNCTION account_running_balance(p_account_id uuid, p_transaction_date timestamp with time zone, p_created_at timestamp with time zone, p_transaction_id uuid, p_allocation_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.account_running_balance(p_account_id uuid, p_transaction_date timestamp with time zone, p_created_at timestamp with time zone, p_transaction_id uuid, p_allocation_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.account_running_balance(p_account_id uuid, p_transaction_date timestamp with time zone, p_created_at timestamp with time zone, p_transaction_id uuid, p_allocation_id uuid) TO authenticated;


--
-- Name: TABLE feedback_messages; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.feedback_messages TO authenticated;


--
-- Name: FUNCTION add_feedback_message(p_feedback_id uuid, p_body text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.add_feedback_message(p_feedback_id uuid, p_body text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.add_feedback_message(p_feedback_id uuid, p_body text) TO authenticated;


--
-- Name: FUNCTION add_feedback_reply(p_feedback_id uuid, p_idempotency_key text, p_body text, p_internal boolean); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.add_feedback_reply(p_feedback_id uuid, p_idempotency_key text, p_body text, p_internal boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.add_feedback_reply(p_feedback_id uuid, p_idempotency_key text, p_body text, p_internal boolean) TO authenticated;


--
-- Name: TABLE app_feedback; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.app_feedback TO authenticated;


--
-- Name: FUNCTION admin_assign_feedback(p_feedback_id uuid, p_admin_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.admin_assign_feedback(p_feedback_id uuid, p_admin_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_assign_feedback(p_feedback_id uuid, p_admin_id uuid) TO authenticated;


--
-- Name: FUNCTION admin_create_app_release(p_idempotency_key text, p_version text, p_platform text, p_status text, p_title text, p_release_notes text, p_released_at timestamp with time zone); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.admin_create_app_release(p_idempotency_key text, p_version text, p_platform text, p_status text, p_title text, p_release_notes text, p_released_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_create_app_release(p_idempotency_key text, p_version text, p_platform text, p_status text, p_title text, p_release_notes text, p_released_at timestamp with time zone) TO authenticated;


--
-- Name: FUNCTION admin_set_feedback_priority(p_feedback_id uuid, p_priority text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.admin_set_feedback_priority(p_feedback_id uuid, p_priority text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_set_feedback_priority(p_feedback_id uuid, p_priority text) TO authenticated;


--
-- Name: FUNCTION admin_update_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_status text, p_priority text, p_assigned_admin_id uuid, p_clear_assignment boolean, p_resolved_in_release_id uuid, p_clear_release boolean); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.admin_update_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_status text, p_priority text, p_assigned_admin_id uuid, p_clear_assignment boolean, p_resolved_in_release_id uuid, p_clear_release boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_update_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_status text, p_priority text, p_assigned_admin_id uuid, p_clear_assignment boolean, p_resolved_in_release_id uuid, p_clear_release boolean) TO authenticated;


--
-- Name: FUNCTION admin_update_app_release(p_release_id uuid, p_idempotency_key text, p_status text, p_title text, p_release_notes text, p_released_at timestamp with time zone); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.admin_update_app_release(p_release_id uuid, p_idempotency_key text, p_status text, p_title text, p_release_notes text, p_released_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_update_app_release(p_release_id uuid, p_idempotency_key text, p_status text, p_title text, p_release_notes text, p_released_at timestamp with time zone) TO authenticated;


--
-- Name: FUNCTION admin_update_feedback_status(p_feedback_id uuid, p_status text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.admin_update_feedback_status(p_feedback_id uuid, p_status text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_update_feedback_status(p_feedback_id uuid, p_status text) TO authenticated;


--
-- Name: FUNCTION assert_feedback_idempotency_key(p_key text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.assert_feedback_idempotency_key(p_key text) FROM PUBLIC;


--
-- Name: TABLE transactions; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transactions TO authenticated;


--
-- Name: FUNCTION balance_after_transaction(public.transactions); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.balance_after_transaction(public.transactions) FROM PUBLIC;
GRANT ALL ON FUNCTION public.balance_after_transaction(public.transactions) TO authenticated;


--
-- Name: FUNCTION bulk_update_transaction_category(p_household_id uuid, p_transaction_ids uuid[], p_category_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.bulk_update_transaction_category(p_household_id uuid, p_transaction_ids uuid[], p_category_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.bulk_update_transaction_category(p_household_id uuid, p_transaction_ids uuid[], p_category_id uuid) TO authenticated;


--
-- Name: FUNCTION bulk_update_transfer_category(p_household_id uuid, p_transfer_group_ids uuid[], p_category_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.bulk_update_transfer_category(p_household_id uuid, p_transfer_group_ids uuid[], p_category_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.bulk_update_transfer_category(p_household_id uuid, p_transfer_group_ids uuid[], p_category_id uuid) TO authenticated;


--
-- Name: FUNCTION cancel_planned_item_occurrence(p_occurrence_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.cancel_planned_item_occurrence(p_occurrence_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.cancel_planned_item_occurrence(p_occurrence_id uuid) TO authenticated;


--
-- Name: FUNCTION claim_feedback_email_outbox(p_limit integer, p_worker_id text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.claim_feedback_email_outbox(p_limit integer, p_worker_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_feedback_email_outbox(p_limit integer, p_worker_id text) TO service_role;


--
-- Name: FUNCTION complete_onboarding_guide(p_guide_key text, p_version integer); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.complete_onboarding_guide(p_guide_key text, p_version integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.complete_onboarding_guide(p_guide_key text, p_version integer) TO authenticated;


--
-- Name: TABLE monthly_budget_runs; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.monthly_budget_runs TO authenticated;


--
-- Name: FUNCTION confirm_monthly_budget_run(p_run_id uuid, p_transfers jsonb, p_preview jsonb); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.confirm_monthly_budget_run(p_run_id uuid, p_transfers jsonb, p_preview jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.confirm_monthly_budget_run(p_run_id uuid, p_transfers jsonb, p_preview jsonb) TO authenticated;


--
-- Name: FUNCTION confirm_planned_item_month(p_household_id uuid, p_month date, p_transfers jsonb, p_confirmed_by uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.confirm_planned_item_month(p_household_id uuid, p_month date, p_transfers jsonb, p_confirmed_by uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.confirm_planned_item_month(p_household_id uuid, p_month date, p_transfers jsonb, p_confirmed_by uuid) TO authenticated;


--
-- Name: FUNCTION confirm_planned_item_occurrence(p_occurrence_id uuid, p_confirmed_by uuid, p_actual_amount numeric); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.confirm_planned_item_occurrence(p_occurrence_id uuid, p_confirmed_by uuid, p_actual_amount numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.confirm_planned_item_occurrence(p_occurrence_id uuid, p_confirmed_by uuid, p_actual_amount numeric) TO authenticated;


--
-- Name: FUNCTION confirm_replenishment_run(p_run_id uuid, p_unit_sources jsonb, p_preview jsonb); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.confirm_replenishment_run(p_run_id uuid, p_unit_sources jsonb, p_preview jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.confirm_replenishment_run(p_run_id uuid, p_unit_sources jsonb, p_preview jsonb) TO authenticated;


--
-- Name: FUNCTION consume_feedback_rate_limit(p_actor_id uuid, p_action text, p_limit integer, p_window interval); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.consume_feedback_rate_limit(p_actor_id uuid, p_action text, p_limit integer, p_window interval) FROM PUBLIC;


--
-- Name: TABLE households; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.households TO authenticated;


--
-- Name: FUNCTION create_household(p_name text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.create_household(p_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_household(p_name text) TO authenticated;


--
-- Name: FUNCTION create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid) TO authenticated;


--
-- Name: FUNCTION create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid, p_category_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid, p_category_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid, p_category_id uuid) TO authenticated;


--
-- Name: FUNCTION create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid, p_category_id uuid, p_monthly_budget_run_id uuid, p_generated_by_rule_id uuid, p_budget_section public.monthly_budget_section); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid, p_category_id uuid, p_monthly_budget_run_id uuid, p_generated_by_rule_id uuid, p_budget_section public.monthly_budget_section) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_transfer(p_household_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_created_by uuid, p_category_id uuid, p_monthly_budget_run_id uuid, p_generated_by_rule_id uuid, p_budget_section public.monthly_budget_section) TO authenticated;


--
-- Name: FUNCTION decline_household_invitation(p_token text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.decline_household_invitation(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.decline_household_invitation(p_token text) TO authenticated;


--
-- Name: FUNCTION delete_completed_transfer(p_transfer_group_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.delete_completed_transfer(p_transfer_group_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_completed_transfer(p_transfer_group_id uuid) TO authenticated;


--
-- Name: FUNCTION delete_feedback_attachment(p_attachment_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.delete_feedback_attachment(p_attachment_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_feedback_attachment(p_attachment_id uuid) TO authenticated;


--
-- Name: FUNCTION delete_feedback_attachment(p_attachment_id uuid, p_idempotency_key text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.delete_feedback_attachment(p_attachment_id uuid, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_feedback_attachment(p_attachment_id uuid, p_idempotency_key text) TO authenticated;


--
-- Name: FUNCTION delete_household(p_household_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.delete_household(p_household_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_household(p_household_id uuid) TO authenticated;


--
-- Name: FUNCTION delete_monthly_budget_run_transactions(p_run_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.delete_monthly_budget_run_transactions(p_run_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_monthly_budget_run_transactions(p_run_id uuid) TO authenticated;


--
-- Name: FUNCTION dispatch_app_notification_push(); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.dispatch_app_notification_push() FROM PUBLIC;


--
-- Name: FUNCTION dispatch_feedback_retention_cleanup(); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.dispatch_feedback_retention_cleanup() FROM PUBLIC;


--
-- Name: FUNCTION enqueue_pending_notification_pushes(p_limit integer); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.enqueue_pending_notification_pushes(p_limit integer) FROM PUBLIC;


--
-- Name: FUNCTION execute_due_recurring_movements(p_as_of_date date); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.execute_due_recurring_movements(p_as_of_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.execute_due_recurring_movements(p_as_of_date date) TO service_role;


--
-- Name: FUNCTION feedback_storage_author_id(p_name text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.feedback_storage_author_id(p_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.feedback_storage_author_id(p_name text) TO authenticated;


--
-- Name: FUNCTION feedback_storage_feedback_id(p_name text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.feedback_storage_feedback_id(p_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.feedback_storage_feedback_id(p_name text) TO authenticated;


--
-- Name: FUNCTION get_household_invitation_details(p_token text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.get_household_invitation_details(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_household_invitation_details(p_token text) TO anon;
GRANT ALL ON FUNCTION public.get_household_invitation_details(p_token text) TO authenticated;


--
-- Name: FUNCTION is_household_admin(p_household_id uuid, p_user_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.is_household_admin(p_household_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_household_admin(p_household_id uuid, p_user_id uuid) TO authenticated;


--
-- Name: FUNCTION is_household_member(p_household_id uuid, p_user_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.is_household_member(p_household_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_household_member(p_household_id uuid, p_user_id uuid) TO authenticated;


--
-- Name: FUNCTION is_household_owner(p_household_id uuid, p_user_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.is_household_owner(p_household_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_household_owner(p_household_id uuid, p_user_id uuid) TO authenticated;


--
-- Name: FUNCTION is_platform_admin(); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_platform_admin() TO authenticated;


--
-- Name: FUNCTION leave_household(p_household_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.leave_household(p_household_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.leave_household(p_household_id uuid) TO authenticated;


--
-- Name: FUNCTION list_account_ledger(p_household_id uuid, p_account_id uuid, p_limit integer, p_offset integer); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.list_account_ledger(p_household_id uuid, p_account_id uuid, p_limit integer, p_offset integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.list_account_ledger(p_household_id uuid, p_account_id uuid, p_limit integer, p_offset integer) TO authenticated;


--
-- Name: FUNCTION list_feedback_retention_objects(p_withdrawn_days integer, p_closed_days integer, p_limit integer); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.list_feedback_retention_objects(p_withdrawn_days integer, p_closed_days integer, p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.list_feedback_retention_objects(p_withdrawn_days integer, p_closed_days integer, p_limit integer) TO service_role;


--
-- Name: FUNCTION list_my_household_invitations(); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.list_my_household_invitations() FROM PUBLIC;
GRANT ALL ON FUNCTION public.list_my_household_invitations() TO authenticated;


--
-- Name: FUNCTION list_transaction_movements(p_household_id uuid, p_kind text, p_account_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_category_id uuid, p_uncategorized boolean, p_created_by uuid, p_from date, p_to date, p_sort text, p_limit integer, p_offset integer, p_exclude_transfers boolean, p_search text, p_min_amount numeric, p_max_amount numeric, p_account_ids uuid[]); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.list_transaction_movements(p_household_id uuid, p_kind text, p_account_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_category_id uuid, p_uncategorized boolean, p_created_by uuid, p_from date, p_to date, p_sort text, p_limit integer, p_offset integer, p_exclude_transfers boolean, p_search text, p_min_amount numeric, p_max_amount numeric, p_account_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.list_transaction_movements(p_household_id uuid, p_kind text, p_account_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_category_id uuid, p_uncategorized boolean, p_created_by uuid, p_from date, p_to date, p_sort text, p_limit integer, p_offset integer, p_exclude_transfers boolean, p_search text, p_min_amount numeric, p_max_amount numeric, p_account_ids uuid[]) TO authenticated;


--
-- Name: FUNCTION list_transaction_tag_transactions(p_household_id uuid, p_tag_id uuid, p_from date, p_to date); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.list_transaction_tag_transactions(p_household_id uuid, p_tag_id uuid, p_from date, p_to date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.list_transaction_tag_transactions(p_household_id uuid, p_tag_id uuid, p_from date, p_to date) TO authenticated;


--
-- Name: FUNCTION match_planned_item_occurrence(p_occurrence_id uuid, p_transaction_id uuid, p_matched_by uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.match_planned_item_occurrence(p_occurrence_id uuid, p_transaction_id uuid, p_matched_by uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.match_planned_item_occurrence(p_occurrence_id uuid, p_transaction_id uuid, p_matched_by uuid) TO authenticated;


--
-- Name: FUNCTION materialize_planned_item_occurrences(p_household_id uuid, p_month date, p_resolved jsonb); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.materialize_planned_item_occurrences(p_household_id uuid, p_month date, p_resolved jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.materialize_planned_item_occurrences(p_household_id uuid, p_month date, p_resolved jsonb) TO authenticated;


--
-- Name: FUNCTION next_recurring_occurrence(p_date date, p_frequency public.recurring_frequency, p_excluded_months smallint[]); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.next_recurring_occurrence(p_date date, p_frequency public.recurring_frequency, p_excluded_months smallint[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.next_recurring_occurrence(p_date date, p_frequency public.recurring_frequency, p_excluded_months smallint[]) TO authenticated;


--
-- Name: FUNCTION notify_feedback_recipient(p_recipient_id uuid, p_type text, p_title text, p_body text, p_data jsonb, p_source_key text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.notify_feedback_recipient(p_recipient_id uuid, p_type text, p_title text, p_body text, p_data jsonb, p_source_key text) FROM PUBLIC;


--
-- Name: FUNCTION purge_feedback_retention(p_withdrawn_days integer, p_closed_days integer, p_delivery_days integer); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.purge_feedback_retention(p_withdrawn_days integer, p_closed_days integer, p_delivery_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.purge_feedback_retention(p_withdrawn_days integer, p_closed_days integer, p_delivery_days integer) TO service_role;


--
-- Name: FUNCTION purge_read_notifications_older_than(p_days integer); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.purge_read_notifications_older_than(p_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.purge_read_notifications_older_than(p_days integer) TO service_role;


--
-- Name: FUNCTION purge_soft_deleted_budget_rules(); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.purge_soft_deleted_budget_rules() FROM PUBLIC;


--
-- Name: FUNCTION queue_feedback_email(p_recipient_id uuid, p_template text, p_payload jsonb, p_source_key text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.queue_feedback_email(p_recipient_id uuid, p_template text, p_payload jsonb, p_source_key text) FROM PUBLIC;


--
-- Name: FUNCTION record_feedback_email_attempt(p_outbox_id uuid, p_attempt_number integer, p_worker_id text, p_succeeded boolean, p_provider_message_id text, p_error_code text, p_error_message text, p_provider_response jsonb, p_retry_after interval); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.record_feedback_email_attempt(p_outbox_id uuid, p_attempt_number integer, p_worker_id text, p_succeeded boolean, p_provider_message_id text, p_error_code text, p_error_message text, p_provider_response jsonb, p_retry_after interval) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_feedback_email_attempt(p_outbox_id uuid, p_attempt_number integer, p_worker_id text, p_succeeded boolean, p_provider_message_id text, p_error_code text, p_error_message text, p_provider_response jsonb, p_retry_after interval) TO service_role;


--
-- Name: TABLE feedback_attachments; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.feedback_attachments TO authenticated;


--
-- Name: FUNCTION register_feedback_attachment(p_feedback_id uuid, p_storage_path text, p_file_name text, p_mime_type text, p_file_size bigint, p_message_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.register_feedback_attachment(p_feedback_id uuid, p_storage_path text, p_file_name text, p_mime_type text, p_file_size bigint, p_message_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.register_feedback_attachment(p_feedback_id uuid, p_storage_path text, p_file_name text, p_mime_type text, p_file_size bigint, p_message_id uuid) TO authenticated;


--
-- Name: FUNCTION register_feedback_attachment(p_feedback_id uuid, p_idempotency_key text, p_storage_path text, p_original_filename text, p_mime_type text, p_size_bytes bigint, p_width integer, p_height integer, p_message_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.register_feedback_attachment(p_feedback_id uuid, p_idempotency_key text, p_storage_path text, p_original_filename text, p_mime_type text, p_size_bytes bigint, p_width integer, p_height integer, p_message_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.register_feedback_attachment(p_feedback_id uuid, p_idempotency_key text, p_storage_path text, p_original_filename text, p_mime_type text, p_size_bytes bigint, p_width integer, p_height integer, p_message_id uuid) TO authenticated;


--
-- Name: FUNCTION remove_household_member(p_household_id uuid, p_user_id_to_remove uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.remove_household_member(p_household_id uuid, p_user_id_to_remove uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.remove_household_member(p_household_id uuid, p_user_id_to_remove uuid) TO authenticated;


--
-- Name: FUNCTION reset_planned_item_occurrence_to_template(p_occurrence_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.reset_planned_item_occurrence_to_template(p_occurrence_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reset_planned_item_occurrence_to_template(p_occurrence_id uuid) TO authenticated;


--
-- Name: FUNCTION restore_budget_rule(p_rule_id uuid); Type: ACL; Schema: public
--

GRANT ALL ON FUNCTION public.restore_budget_rule(p_rule_id uuid) TO authenticated;


--
-- Name: FUNCTION revert_monthly_budget_month(p_household_id uuid, p_month date); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.revert_monthly_budget_month(p_household_id uuid, p_month date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.revert_monthly_budget_month(p_household_id uuid, p_month date) TO authenticated;


--
-- Name: FUNCTION revert_planned_item_occurrence(p_occurrence_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.revert_planned_item_occurrence(p_occurrence_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.revert_planned_item_occurrence(p_occurrence_id uuid) TO authenticated;


--
-- Name: FUNCTION save_monthly_budget_configuration(p_household_id uuid, p_config_id uuid, p_name text, p_income_mode public.household_income_mode, p_remaining_cash_strategy public.remaining_cash_strategy, p_fixed_remaining_cash_amount numeric, p_excess_cash_distribution_method public.excess_cash_distribution_method, p_rules jsonb); Type: ACL; Schema: public
--

GRANT ALL ON FUNCTION public.save_monthly_budget_configuration(p_household_id uuid, p_config_id uuid, p_name text, p_income_mode public.household_income_mode, p_remaining_cash_strategy public.remaining_cash_strategy, p_fixed_remaining_cash_amount numeric, p_excess_cash_distribution_method public.excess_cash_distribution_method, p_rules jsonb) TO authenticated;


--
-- Name: FUNCTION save_transaction_allocations(p_transaction_id uuid, p_allocations jsonb); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.save_transaction_allocations(p_transaction_id uuid, p_allocations jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_transaction_allocations(p_transaction_id uuid, p_allocations jsonb) TO authenticated;


--
-- Name: FUNCTION set_default_household(p_household_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.set_default_household(p_household_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_default_household(p_household_id uuid) TO authenticated;


--
-- Name: FUNCTION set_saving_pot_accounts(p_pot_id uuid, p_account_ids uuid[]); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.set_saving_pot_accounts(p_pot_id uuid, p_account_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_saving_pot_accounts(p_pot_id uuid, p_account_ids uuid[]) TO authenticated;


--
-- Name: FUNCTION set_transaction_tags(p_transaction_id uuid, p_tag_ids uuid[]); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.set_transaction_tags(p_transaction_id uuid, p_tag_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_transaction_tags(p_transaction_id uuid, p_tag_ids uuid[]) TO authenticated;


--
-- Name: FUNCTION skip_planned_item_occurrence(p_occurrence_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.skip_planned_item_occurrence(p_occurrence_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.skip_planned_item_occurrence(p_occurrence_id uuid) TO authenticated;


--
-- Name: FUNCTION submit_app_feedback(p_category text, p_title text, p_description text, p_app_context jsonb, p_idempotency_key text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.submit_app_feedback(p_category text, p_title text, p_description text, p_app_context jsonb, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.submit_app_feedback(p_category text, p_title text, p_description text, p_app_context jsonb, p_idempotency_key text) TO authenticated;


--
-- Name: FUNCTION submit_app_feedback(p_idempotency_key text, p_category text, p_title text, p_description text, p_app_version text, p_platform text, p_context jsonb); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.submit_app_feedback(p_idempotency_key text, p_category text, p_title text, p_description text, p_app_version text, p_platform text, p_context jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.submit_app_feedback(p_idempotency_key text, p_category text, p_title text, p_description text, p_app_version text, p_platform text, p_context jsonb) TO authenticated;


--
-- Name: FUNCTION summarize_transaction_movements(p_household_id uuid, p_kind text, p_account_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_category_id uuid, p_uncategorized boolean, p_created_by uuid, p_from date, p_to date, p_exclude_transfers boolean, p_search text, p_min_amount numeric, p_max_amount numeric, p_account_ids uuid[]); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.summarize_transaction_movements(p_household_id uuid, p_kind text, p_account_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_category_id uuid, p_uncategorized boolean, p_created_by uuid, p_from date, p_to date, p_exclude_transfers boolean, p_search text, p_min_amount numeric, p_max_amount numeric, p_account_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.summarize_transaction_movements(p_household_id uuid, p_kind text, p_account_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_category_id uuid, p_uncategorized boolean, p_created_by uuid, p_from date, p_to date, p_exclude_transfers boolean, p_search text, p_min_amount numeric, p_max_amount numeric, p_account_ids uuid[]) TO authenticated;


--
-- Name: FUNCTION summarize_transaction_tags(p_household_id uuid, p_from date, p_to date); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.summarize_transaction_tags(p_household_id uuid, p_from date, p_to date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.summarize_transaction_tags(p_household_id uuid, p_from date, p_to date) TO authenticated;


--
-- Name: FUNCTION sync_reimbursement_income_transaction(); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.sync_reimbursement_income_transaction() FROM PUBLIC;


--
-- Name: FUNCTION transfer_household_ownership(p_household_id uuid, p_new_owner_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.transfer_household_ownership(p_household_id uuid, p_new_owner_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.transfer_household_ownership(p_household_id uuid, p_new_owner_id uuid) TO authenticated;


--
-- Name: FUNCTION undo_monthly_budget_batch(p_batch_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.undo_monthly_budget_batch(p_batch_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.undo_monthly_budget_batch(p_batch_id uuid) TO authenticated;


--
-- Name: FUNCTION unlink_planned_item_occurrence_transaction(p_occurrence_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.unlink_planned_item_occurrence_transaction(p_occurrence_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.unlink_planned_item_occurrence_transaction(p_occurrence_id uuid) TO authenticated;


--
-- Name: FUNCTION unmatch_planned_item_occurrence(p_occurrence_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.unmatch_planned_item_occurrence(p_occurrence_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.unmatch_planned_item_occurrence(p_occurrence_id uuid) TO authenticated;


--
-- Name: FUNCTION update_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_title text, p_description text, p_category text, p_app_version text, p_platform text, p_context jsonb); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.update_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_title text, p_description text, p_category text, p_app_version text, p_platform text, p_context jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_title text, p_description text, p_category text, p_app_version text, p_platform text, p_context jsonb) TO authenticated;


--
-- Name: FUNCTION update_completed_transfer(p_transfer_group_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_category_id uuid); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.update_completed_transfer(p_transfer_group_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_category_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_completed_transfer(p_transfer_group_id uuid, p_source_account_id uuid, p_destination_account_id uuid, p_amount numeric, p_title text, p_notes text, p_transaction_date timestamp with time zone, p_category_id uuid) TO authenticated;


--
-- Name: FUNCTION withdraw_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_reason text); Type: ACL; Schema: public
--

REVOKE ALL ON FUNCTION public.withdraw_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.withdraw_app_feedback(p_feedback_id uuid, p_idempotency_key text, p_reason text) TO authenticated;


--
-- Name: TABLE accounts; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.accounts TO authenticated;


--
-- Name: TABLE transaction_allocations; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transaction_allocations TO authenticated;


--
-- Name: TABLE account_balances; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.account_balances TO authenticated;


--
-- Name: TABLE account_reconciliations; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE ON TABLE public.account_reconciliations TO authenticated;


--
-- Name: TABLE app_notifications; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE ON TABLE public.app_notifications TO authenticated;


--
-- Name: COLUMN app_notifications.read_at; Type: ACL; Schema: public
--

GRANT UPDATE(read_at) ON TABLE public.app_notifications TO authenticated;


--
-- Name: COLUMN app_notifications.deleted_at; Type: ACL; Schema: public
--

GRANT UPDATE(deleted_at) ON TABLE public.app_notifications TO authenticated;


--
-- Name: TABLE app_releases; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.app_releases TO authenticated;


--
-- Name: TABLE attachments; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.attachments TO authenticated;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.audit_logs TO authenticated;


--
-- Name: TABLE budget_configs; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.budget_configs TO authenticated;


--
-- Name: TABLE budget_rule_allocations; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.budget_rule_allocations TO authenticated;


--
-- Name: TABLE budget_rules; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.budget_rules TO authenticated;


--
-- Name: TABLE categories; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.categories TO authenticated;


--
-- Name: TABLE feedback_events; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.feedback_events TO authenticated;


--
-- Name: TABLE household_invitations; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.household_invitations TO authenticated;


--
-- Name: TABLE household_members; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.household_members TO authenticated;


--
-- Name: TABLE invitation_email_logs; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.invitation_email_logs TO authenticated;


--
-- Name: TABLE merchant_aliases; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.merchant_aliases TO authenticated;


--
-- Name: TABLE transaction_reimbursements; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transaction_reimbursements TO authenticated;


--
-- Name: TABLE transaction_effective_amounts; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.transaction_effective_amounts TO authenticated;


--
-- Name: TABLE monthly_category_spending; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.monthly_category_spending TO authenticated;


--
-- Name: TABLE monthly_income_inputs; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.monthly_income_inputs TO authenticated;


--
-- Name: TABLE monthly_summary; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.monthly_summary TO authenticated;


--
-- Name: TABLE platform_admins; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.platform_admins TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.platform_admins TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.profiles TO authenticated;


--
-- Name: TABLE push_devices; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.push_devices TO authenticated;


--
-- Name: TABLE recurring_run_executions; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.recurring_run_executions TO authenticated;


--
-- Name: TABLE recurring_transactions; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.recurring_transactions TO authenticated;


--
-- Name: TABLE saving_pot_accounts; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.saving_pot_accounts TO authenticated;


--
-- Name: TABLE saving_pots; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.saving_pots TO authenticated;


--
-- Name: TABLE saving_pot_balances; Type: ACL; Schema: public
--

GRANT SELECT ON TABLE public.saving_pot_balances TO authenticated;


--
-- Name: TABLE transaction_import_batches; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.transaction_import_batches TO authenticated;


--
-- Name: TABLE transaction_rules; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transaction_rules TO authenticated;


--
-- Name: TABLE transaction_splits; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transaction_splits TO authenticated;


--
-- Name: TABLE transaction_tag_assignments; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transaction_tag_assignments TO authenticated;


--
-- Name: TABLE transaction_tags; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transaction_tags TO authenticated;


--
-- Name: TABLE web_push_subscriptions; Type: ACL; Schema: public
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.web_push_subscriptions TO authenticated;

--
-- Schema usage (Supabase grants this by default; kept explicit)
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
