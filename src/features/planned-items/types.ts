import type { Database } from "@/types/database.types";

export type PlannedItemDirection = Database["public"]["Enums"]["planned_item_direction"];
export type PlannedItemAllocationMode = Database["public"]["Enums"]["planned_item_allocation_mode"];
export type PlannedItemRecurrenceType = Database["public"]["Enums"]["planned_item_recurrence_type"];
export type PlannedItemOccurrenceStatus = Database["public"]["Enums"]["planned_item_occurrence_status"];
export type MonthlyBudgetPeriodStatus = Database["public"]["Enums"]["monthly_budget_period_status"];
export type PlannedItemTransactionRole = Database["public"]["Enums"]["planned_item_transaction_role"];

// ------------------------------------------------------------
// Read-side entities -- camelCase mirrors of the DB rows. Mapped from
// Database["public"]["Tables"][...]["Row"] by rowToPlannedItem() and
// friends in services/planned-items.service.ts (same rowToX() convention
// as src/features/dashboard/services/dashboard-network-config.service.ts),
// not aliased directly -- unlike most of this codebase (which keeps read
// types snake_case, e.g. monthly-budget.service.ts's BudgetRule), this
// feature's read types are camelCase per the Phase 3 spec.
// ------------------------------------------------------------

export type PlannedItem = {
  id: string;
  householdId: string;
  name: string;
  direction: PlannedItemDirection;
  amount: number;
  /** Null iff direction = 'inflow'. */
  sourceAccountId: string | null;
  categoryId: string;
  ownerMemberId: string | null;
  isEstimate: boolean;
  allocationMode: PlannedItemAllocationMode;
  recurrenceType: PlannedItemRecurrenceType;
  recurrenceMonths: number[] | null;
  recurrenceIntervalMonths: number | null;
  oneTimeMonth: string | null;
  startMonth: string | null;
  endMonth: string | null;
  isActive: boolean;
  definitionVersion: number;
  notes: string | null;
  deletedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlannedItemDestination = {
  id: string;
  plannedItemId: string;
  destinationAccountId: string;
  /** Populated only when the parent's allocationMode = 'custom_amount'. */
  amount: number | null;
  /** Populated only when the parent's allocationMode = 'custom_percent'. */
  percent: number | null;
  categoryId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PlannedItemWithDestinations = PlannedItem & {
  destinations: PlannedItemDestination[];
};

export type PlannedItemOccurrence = {
  id: string;
  plannedItemId: string;
  householdId: string;
  /** "YYYY-MM-01" */
  month: string;
  status: PlannedItemOccurrenceStatus;
  expectedAmount: number;
  sourceAccountId: string | null;
  categoryId: string;
  isEstimate: boolean;
  sourceDefinitionVersion: number;
  isOverridden: boolean;
  confirmedAt: string | null;
  confirmedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlannedItemOccurrenceDestination = {
  id: string;
  occurrenceId: string;
  plannedItemDestinationId: string | null;
  destinationAccountId: string;
  amount: number;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlannedItemMatch = {
  id: string;
  occurrenceId: string;
  transactionId: string;
  matchedBy: string | null;
  matchedAt: string;
};

export type MonthlyBudgetPeriod = {
  id: string;
  householdId: string;
  month: string;
  status: MonthlyBudgetPeriodStatus;
  confirmedAt: string | null;
  confirmedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

// ------------------------------------------------------------
// Draft/input types for create/update -- string-valued amount/percent
// fields (still-being-typed form state), mirroring
// MonthlyBudgetRuleDraft/MonthlyBudgetRuleAllocationDraft in
// monthly-budget.service.ts.
// ------------------------------------------------------------

export type PlannedItemDestinationDraft = {
  /** Persisted allocation id once saved, otherwise a generated temp id -- same convention as MonthlyBudgetRuleAllocationDraft.id. */
  id: string;
  destinationAccountId: string;
  /** Only read for allocationMode = 'custom_amount'; ignored otherwise. */
  amount: string;
  /** Only read for allocationMode = 'custom_percent'; ignored otherwise. */
  percent: string;
  categoryId: string | null;
};

export type PlannedItemDraft = {
  /** Persisted planned_items.id once saved, otherwise a generated temp id. */
  id: string;
  name: string;
  direction: PlannedItemDirection;
  amount: string;
  /** Required (non-empty) iff direction = 'outflow'; ignored for 'inflow'. */
  sourceAccountId: string;
  categoryId: string;
  ownerMemberId: string | null;
  isEstimate: boolean;
  allocationMode: PlannedItemAllocationMode;
  /** For 'single'/'equal_split' modes, only destinationAccountId (and optional categoryId) on each entry are read -- amount/percent are ignored client-side and never sent to the server for those modes (the server-side trigger rejects them outright, see check_planned_item_destinations_deferred). */
  destinations: PlannedItemDestinationDraft[];
  recurrenceType: PlannedItemRecurrenceType;
  recurrenceMonths: number[];
  recurrenceIntervalMonths: string;
  oneTimeMonth: string;
  startMonth: string;
  endMonth: string;
  isActive: boolean;
  notes: string;
};

// ------------------------------------------------------------
// Resolver output types (src/features/planned-items/services/planned-items-resolver.ts)
// ------------------------------------------------------------

/**
 * One resolved fan-out leg -- maps 1:1 onto a planned_item_occurrence_destinations
 * row (materialize_planned_item_occurrences persists exactly this list, no
 * more, no less). A plain-expense occurrence (0 template destinations)
 * resolves to zero of these -- its single transaction leg is generated
 * directly from the occurrence's own source account instead (see
 * ResolvedTransactionLeg.occurrenceDestinationLookupAccountId). The
 * deferred "destination amounts must sum to expected_amount" trigger
 * (check_planned_item_occurrence_destinations_deferred) skips the check
 * entirely when an occurrence has zero destination rows, so there is no
 * need for a placeholder row here.
 */
export type ResolvedDestination = {
  /** Existing planned_item_occurrence_destinations.id, when this leg is being reused unchanged from a prior resolve (action 'unchanged'/'refresh' reusing the same row). Null when materialize still needs to insert it. */
  id: string | null;
  /** The planned_item_destinations template row this was resolved from. Null only for a hand-edited/ad-hoc destination with no template counterpart (not produced by this resolver today, reserved for manual-override editing). */
  plannedItemDestinationId: string | null;
  destinationAccountId: string;
  amount: number;
  categoryId: string | null;
};

/**
 * One transaction row confirm_planned_item_month will insert verbatim --
 * the exact leg-by-leg plan described in the Phase 3 design (0
 * destinations -> one plain_expense leg; 1 destination -> a
 * transfer_source/transfer_destination pair; N destinations -> N such
 * pairs; inflow -> one income leg).
 */
export type ResolvedTransactionLeg = {
  role: PlannedItemTransactionRole;
  /** Account this transaction posts to. */
  accountId: string;
  amount: number;
  categoryId: string | null;
  /**
   * Always null coming out of the resolver -- confirm_planned_item_month
   * generates its own transfer_group_id per pair via gen_random_uuid(),
   * exactly like confirm_monthly_budget_run does (transfer_group_id has
   * no business meaning, so there's nothing for the "one implementation
   * of the resolution math" rule to protect by precomputing it). Kept on
   * this type for symmetry with `transactions.transfer_group_id` and so a
   * future caller can inspect what a submitted plan produced.
   */
  transferGroupId: string | null;
  /**
   * The destination account identifying which entry in this occurrence's
   * `destinations` (and, once materialized, which planned_item_occurrence_destinations
   * row) this leg is tied to -- equal to `accountId` for a
   * transfer_destination/income leg, equal to the *paired* leg's
   * accountId for a transfer_source leg (whose own accountId is the
   * source, not the row's destination). Always null for plain_expense --
   * that occurrence has zero occurrence_destination rows (see
   * ResolvedDestination doc), so there is nothing to link to, matching
   * transactions.idx_transactions_one_plain_expense_per_occurrence, which
   * requires planned_item_occurrence_destination_id IS NULL for that role.
   */
  occurrenceDestinationLookupAccountId: string | null;
};

export type ResolvedOccurrenceAction = "create" | "refresh" | "unchanged";

export type ResolvedOccurrence = {
  occurrence: PlannedItemOccurrence;
  destinations: ResolvedDestination[];
  transactionLegs: ResolvedTransactionLeg[];
  isValid: boolean;
  validationIssues: string[];
  action: ResolvedOccurrenceAction;
};

export type MonthlyBudgetSummary = {
  /** Sum of expectedAmount for every valid, non-cancelled/skipped inflow occurrence. */
  income: number;
  /** Sum of expectedAmount for every valid, non-cancelled/skipped, non-estimate outflow occurrence. */
  plannedExpenses: number;
  /** Sum of expectedAmount for every valid, non-cancelled/skipped, is_estimate outflow occurrence -- budgeted for but not yet reconciled against a real transaction. */
  estimatedExpenses: number;
  /** Portion of plannedExpenses + estimatedExpenses landing in an account of type 'savings' (by destination account, from the `accounts` resolver input -- planned_items has no monthly_budget_section column, unlike the legacy budget_rules this replaces, so the bucket is inferred from the destination account's own type instead). */
  savings: number;
  /** Same as `savings`, for destination accounts of type 'investment'. */
  investments: number;
  /** income - plannedExpenses - estimatedExpenses. */
  available: number;
};

export type ResolvedMonth = {
  /** Normalized "YYYY-MM". */
  month: string;
  occurrences: ResolvedOccurrence[];
  summary: MonthlyBudgetSummary;
};

/** Minimal account shape the resolver needs -- just enough to validate a referenced account exists and to bucket savings/investments in the summary by account type. */
export type PlannedItemAccountLike = {
  id: string;
  type: Database["public"]["Enums"]["account_type"];
};
