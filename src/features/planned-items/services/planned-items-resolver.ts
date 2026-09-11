import type {
  MonthlyBudgetSummary,
  PlannedItemAccountLike,
  PlannedItemOccurrence,
  PlannedItemOccurrenceDestination,
  PlannedItemWithDestinations,
  ResolvedDestination,
  ResolvedMonth,
  ResolvedOccurrence,
  ResolvedOccurrenceAction,
  ResolvedTransactionLeg,
} from "../types";

/**
 * The ONE place equal-split/percent-to-amount/rounding/recurrence-month-
 * matching logic exists for Monthly Budget (Phase 3+4 design principle --
 * see the RPCs in the companion migration, which persist this function's
 * output verbatim and never re-derive amounts themselves).
 *
 * Pure and stateless: no I/O, no ids, no randomness. `resolvePlannedMonth`
 * takes a snapshot of `planned_items` (+ their destination templates),
 * the household's existing `planned_item_occurrences` (+ their resolved
 * destinations) and a minimal account list, and returns the full resolved
 * month -- what `materialize_planned_item_occurrences` should persist and
 * what `confirm_planned_item_month` should turn into transactions.
 */

function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

/** Normalizes any "YYYY-MM" or full ISO date string to "YYYY-MM". */
function toYearMonth(value: string): string {
  return value.slice(0, 7);
}

/** First-of-month ISO date for a "YYYY-MM" (or full date) string. */
function toMonthDate(month: string): string {
  return `${toYearMonth(month)}-01`;
}

/**
 * Whether `item` is expected to occur in `month`. Deliberately not reused
 * from `@/features/shared/recurrence` (`isDueInMonth`) -- that predicate's
 * `RecurrenceLike.start_date` is required, but planned_items.start_month/
 * end_month are both optional independent bounds usable with *any*
 * recurrence_type (see planned_items_recurrence_shape in
 * 20260901001700_planned_items_schema_fixes.sql, which does not gate
 * start_month/end_month by recurrence_type at all) -- so every branch
 * here has to stay null-safe on start/end where that predicate assumes
 * a mandatory start. The month-matching logic itself (monthly/
 * specific_months/interval/one_time) is intentionally kept in lockstep
 * with that shared predicate.
 */
function isPlannedItemDueInMonth(
  item: Pick<
    PlannedItemWithDestinations,
    | "isActive"
    | "recurrenceType"
    | "recurrenceMonths"
    | "recurrenceIntervalMonths"
    | "oneTimeMonth"
    | "startMonth"
    | "endMonth"
  >,
  month: string,
): boolean {
  if (!item.isActive) return false;

  const target = toYearMonth(month);

  if (item.recurrenceType === "one_time") {
    // Mirrors isDueInMonth: a one-time item isn't gated by start/end
    // month bounds, it simply happens (or doesn't) in its own month.
    return !!item.oneTimeMonth && toYearMonth(item.oneTimeMonth) === target;
  }

  if (item.startMonth && target < toYearMonth(item.startMonth)) return false;
  if (item.endMonth && target > toYearMonth(item.endMonth)) return false;

  switch (item.recurrenceType) {
    case "monthly":
      return true;

    case "specific_months": {
      const monthNumber = Number(target.slice(5, 7));
      const months = Array.isArray(item.recurrenceMonths) ? item.recurrenceMonths.map(Number) : [];
      return months.includes(monthNumber);
    }

    case "interval": {
      const interval = Number(item.recurrenceIntervalMonths ?? 0);
      if (!Number.isFinite(interval) || interval <= 0) return false;
      // An interval recurrence needs an anchor month to count elapsed
      // months from; with none, it can never be considered due.
      if (!item.startMonth) return false;

      const start = toYearMonth(item.startMonth);
      const startYear = Number(start.slice(0, 4));
      const startMonthNumber = Number(start.slice(5, 7));
      const targetYear = Number(target.slice(0, 4));
      const targetMonthNumber = Number(target.slice(5, 7));
      const monthsElapsed = (targetYear - startYear) * 12 + (targetMonthNumber - startMonthNumber);

      return monthsElapsed >= 0 && monthsElapsed % interval === 0;
    }

    default:
      return false;
  }
}

/**
 * Splits `totalAmount` into `count` amounts that sum exactly to it, to the
 * cent -- the remainder (from truncating division) goes entirely to the
 * *last* share (by the caller's own ordering, i.e. destination sort_order),
 * per the Phase 3 design's equal_split rule. Deliberately different from
 * `monthly-budget.service.ts`'s `distributeEqualSplit`, which spreads the
 * remainder one cent at a time across the *first* accounts instead -- that
 * is the legacy budget_rules behavior and is not reused here.
 */
function splitEqualRemainderLast(totalAmount: number, count: number): number[] {
  if (count <= 0) return [];
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.trunc(totalCents / count);
  const remainderCents = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, index) => {
    const cents = index === count - 1 ? baseCents + remainderCents : baseCents;
    return roundMoney(cents / 100);
  });
}

/**
 * Converts each percent in `percents` (parallel to the caller's
 * destination ordering) into a currency amount by truncating to the cent,
 * then hands every leftover cent (from truncation) to the *last* entry --
 * same remainder rule as `splitEqualRemainderLast`, per the Phase 3
 * design's custom_percent rule.
 */
function splitPercentRemainderLast(totalAmount: number, percents: number[]): number[] {
  if (percents.length === 0) return [];
  const totalCents = Math.round(totalAmount * 100);
  const shareCents = percents.map((percent) => Math.trunc((totalCents * percent) / 100));
  const allocatedCents = shareCents.reduce((sum, cents) => sum + cents, 0);
  const remainderCents = totalCents - allocatedCents;

  return shareCents.map((cents, index) =>
    roundMoney((index === shareCents.length - 1 ? cents + remainderCents : cents) / 100),
  );
}

type LegBuildResult = {
  destinations: ResolvedDestination[];
  transactionLegs: ResolvedTransactionLeg[];
  issues: string[];
};

/**
 * Builds the fan-out destinations + transaction-leg plan for a freshly
 * resolved (create/refresh) occurrence, from the item's *current*
 * definition. See the module doc for the exact leg mapping.
 */
function buildFreshLegs(
  item: PlannedItemWithDestinations,
  categoryId: string,
  accountsById: Map<string, PlannedItemAccountLike>,
  existingDestinations: PlannedItemOccurrenceDestination[],
): LegBuildResult {
  const issues: string[] = [];
  const sourceAccountId = item.sourceAccountId;
  const existingDestinationsByTemplateId = new Map<string, PlannedItemOccurrenceDestination>();
  for (const row of existingDestinations) {
    if (row.plannedItemDestinationId) {
      existingDestinationsByTemplateId.set(row.plannedItemDestinationId, row);
    }
  }

  if (item.direction === "outflow" && (!sourceAccountId || !accountsById.has(sourceAccountId))) {
    issues.push(`"${item.name}" has no valid source account.`);
  }

  const sortedTemplates = [...item.destinations].sort((a, b) => a.sortOrder - b.sortOrder);

  if (item.direction === "inflow" && sortedTemplates.length !== 1) {
    issues.push(`"${item.name}" is income and must have exactly one destination account.`);
  }
  if (item.direction === "outflow" && item.allocationMode === "single" && sortedTemplates.length > 1) {
    issues.push(`"${item.name}" uses single allocation mode and must have at most one destination account.`);
  }
  if (item.isEstimate && sortedTemplates.length > 1) {
    issues.push(`"${item.name}" is an estimate and must have at most one destination account.`);
  }

  const seenAccountIds = new Set<string>();
  for (const destination of sortedTemplates) {
    if (!accountsById.has(destination.destinationAccountId)) {
      issues.push(`"${item.name}" has a destination with no valid account.`);
    }
    if (destination.destinationAccountId === sourceAccountId) {
      issues.push(`"${item.name}" cannot use the same account as both source and destination.`);
    }
    if (seenAccountIds.has(destination.destinationAccountId)) {
      issues.push(`"${item.name}" cannot use the same destination account twice.`);
    }
    seenAccountIds.add(destination.destinationAccountId);
  }

  let amounts: number[];
  switch (item.allocationMode) {
    case "single":
      amounts = sortedTemplates.length > 0 ? [roundMoney(item.amount)] : [];
      break;
    case "equal_split":
      amounts = splitEqualRemainderLast(item.amount, sortedTemplates.length);
      break;
    case "custom_amount":
      amounts = sortedTemplates.map((destination) => roundMoney(destination.amount ?? 0));
      break;
    case "custom_percent":
      amounts = splitPercentRemainderLast(
        item.amount,
        sortedTemplates.map((destination) => Number(destination.percent ?? 0)),
      );
      break;
    default:
      amounts = [];
  }

  const allocatedTotal = roundMoney(amounts.reduce((sum, amount) => sum + amount, 0));
  if (sortedTemplates.length > 0 && Math.abs(allocatedTotal - roundMoney(item.amount)) > 0.001) {
    issues.push(
      `"${item.name}" destination amounts (${allocatedTotal}) do not sum to its total (${roundMoney(item.amount)}).`,
    );
  }

  if (sortedTemplates.length === 0 && item.direction === "outflow") {
    // Plain expense -- materializes zero occurrence_destination rows.
    // The transaction leg is generated directly from the item's own
    // source account; see ResolvedDestination and
    // ResolvedTransactionLeg.occurrenceDestinationLookupAccountId doc
    // comments for why no destination row exists or is referenced.
    return {
      destinations: [],
      transactionLegs: sourceAccountId
        ? [
            {
              role: "plain_expense",
              accountId: sourceAccountId,
              amount: roundMoney(item.amount),
              categoryId,
              transferGroupId: null,
              occurrenceDestinationLookupAccountId: null,
            },
          ]
        : [],
      issues,
    };
  }

  const destinations: ResolvedDestination[] = sortedTemplates.map((destination, index) => ({
    id: existingDestinationsByTemplateId.get(destination.id)?.id ?? null,
    plannedItemDestinationId: destination.id,
    destinationAccountId: destination.destinationAccountId,
    amount: amounts[index] ?? 0,
    categoryId: destination.categoryId ?? categoryId,
  }));

  const transactionLegs: ResolvedTransactionLeg[] =
    item.direction === "inflow"
      ? destinations.map((destination) => ({
          role: "income" as const,
          accountId: destination.destinationAccountId,
          amount: destination.amount,
          categoryId: destination.categoryId,
          transferGroupId: null,
          occurrenceDestinationLookupAccountId: destination.destinationAccountId,
        }))
      : destinations.flatMap((destination): ResolvedTransactionLeg[] =>
          sourceAccountId
            ? [
                {
                  role: "transfer_source",
                  accountId: sourceAccountId,
                  amount: destination.amount,
                  categoryId: destination.categoryId,
                  transferGroupId: null,
                  occurrenceDestinationLookupAccountId: destination.destinationAccountId,
                },
                {
                  role: "transfer_destination",
                  accountId: destination.destinationAccountId,
                  amount: destination.amount,
                  categoryId: destination.categoryId,
                  transferGroupId: null,
                  occurrenceDestinationLookupAccountId: destination.destinationAccountId,
                },
              ]
            : [],
        );

  return { destinations, transactionLegs, issues };
}

/**
 * Rebuilds the leg plan for an occurrence this resolve pass leaves
 * untouched (already confirmed/matched/skipped/cancelled, hand-overridden,
 * or simply up to date with its definition) -- from its *actual persisted*
 * destinations, never recomputed from the current planned_items definition.
 */
function buildLegsFromExistingDestinations(
  occurrence: PlannedItemOccurrence,
  existingDestinations: PlannedItemOccurrenceDestination[],
): LegBuildResult {
  const issues: string[] = [];
  const sourceAccountId = occurrence.sourceAccountId;
  // planned_item_occurrences has no direction column of its own -- outflow
  // occurrences always carry a source account and inflow occurrences never
  // do (mirrors the planned_items_source_account_by_direction check), so
  // that null-ness is a reliable stand-in here.
  const isOutflow = sourceAccountId !== null;

  // Plain-expense occurrences carry zero destination rows by design (see
  // buildFreshLegs) -- the transaction leg is generated directly from
  // the occurrence's own source account.
  if (existingDestinations.length === 0 && isOutflow) {
    return {
      destinations: [],
      transactionLegs: sourceAccountId
        ? [
            {
              role: "plain_expense",
              accountId: sourceAccountId,
              amount: roundMoney(occurrence.expectedAmount),
              categoryId: occurrence.categoryId,
              transferGroupId: null,
              occurrenceDestinationLookupAccountId: null,
            },
          ]
        : [],
      issues,
    };
  }

  const destinations: ResolvedDestination[] = existingDestinations.map((row) => ({
    id: row.id,
    plannedItemDestinationId: row.plannedItemDestinationId,
    destinationAccountId: row.destinationAccountId,
    amount: roundMoney(row.amount),
    categoryId: row.categoryId ?? occurrence.categoryId,
  }));

  const transactionLegs: ResolvedTransactionLeg[] =
    !isOutflow
      ? destinations.map((destination) => ({
          role: "income" as const,
          accountId: destination.destinationAccountId,
          amount: destination.amount,
          categoryId: destination.categoryId,
          transferGroupId: null,
          occurrenceDestinationLookupAccountId: destination.destinationAccountId,
        }))
      : destinations.flatMap((destination): ResolvedTransactionLeg[] =>
          sourceAccountId
            ? [
                {
                  role: "transfer_source",
                  accountId: sourceAccountId,
                  amount: destination.amount,
                  categoryId: destination.categoryId,
                  transferGroupId: null,
                  occurrenceDestinationLookupAccountId: destination.destinationAccountId,
                },
                {
                  role: "transfer_destination",
                  accountId: destination.destinationAccountId,
                  amount: destination.amount,
                  categoryId: destination.categoryId,
                  transferGroupId: null,
                  occurrenceDestinationLookupAccountId: destination.destinationAccountId,
                },
              ]
            : [],
        );

  return { destinations, transactionLegs, issues };
}

export function resolvePlannedMonth(input: {
  householdId: string;
  month: string;
  plannedItems: PlannedItemWithDestinations[];
  existingOccurrences: PlannedItemOccurrence[];
  existingOccurrenceDestinations: PlannedItemOccurrenceDestination[];
  accounts: PlannedItemAccountLike[];
}): ResolvedMonth {
  const month = toMonthDate(input.month);
  const accountsById = new Map(input.accounts.map((account) => [account.id, account]));

  const existingOccurrenceByItemId = new Map<string, PlannedItemOccurrence>();
  for (const occurrence of input.existingOccurrences) {
    if (toYearMonth(occurrence.month) === toYearMonth(month)) {
      existingOccurrenceByItemId.set(occurrence.plannedItemId, occurrence);
    }
  }

  const existingDestinationsByOccurrenceId = new Map<string, PlannedItemOccurrenceDestination[]>();
  for (const destination of input.existingOccurrenceDestinations) {
    const bucket = existingDestinationsByOccurrenceId.get(destination.occurrenceId) ?? [];
    bucket.push(destination);
    existingDestinationsByOccurrenceId.set(destination.occurrenceId, bucket);
  }

  const resolved: ResolvedOccurrence[] = [];

  for (const item of input.plannedItems) {
    if (item.deletedAt) continue;
    if (!isPlannedItemDueInMonth(item, month)) continue;

    const existing = existingOccurrenceByItemId.get(item.id) ?? null;
    const isStale =
      !!existing &&
      existing.status === "planned" &&
      !existing.isOverridden &&
      existing.sourceDefinitionVersion < item.definitionVersion;
    const action: ResolvedOccurrenceAction = !existing ? "create" : isStale ? "refresh" : "unchanged";

    if (action === "unchanged" && existing) {
      const existingDestinations = existingDestinationsByOccurrenceId.get(existing.id) ?? [];
      const { destinations, transactionLegs, issues } = buildLegsFromExistingDestinations(
        existing,
        existingDestinations,
      );
      resolved.push({
        occurrence: existing,
        destinations,
        transactionLegs,
        isValid: issues.length === 0,
        validationIssues: issues,
        action,
      });
      continue;
    }

    const existingDestinationsForItem = existing ? existingDestinationsByOccurrenceId.get(existing.id) ?? [] : [];

    const categoryId = item.categoryId;
    const { destinations, transactionLegs, issues } = buildFreshLegs(
      item,
      categoryId,
      accountsById,
      existingDestinationsForItem,
    );

    const occurrence: PlannedItemOccurrence = existing
      ? {
          ...existing,
          expectedAmount: roundMoney(item.amount),
          sourceAccountId: item.sourceAccountId,
          categoryId,
          isEstimate: item.isEstimate,
          sourceDefinitionVersion: item.definitionVersion,
        }
      : {
          // Not yet persisted -- materialize_planned_item_occurrences
          // upserts on the (planned_item_id, month) conflict target, so
          // no real id is needed for a create; "" is a client-side
          // sentinel, never written to the DB.
          id: "",
          plannedItemId: item.id,
          householdId: input.householdId,
          month,
          status: "planned",
          expectedAmount: roundMoney(item.amount),
          sourceAccountId: item.sourceAccountId,
          categoryId,
          isEstimate: item.isEstimate,
          sourceDefinitionVersion: item.definitionVersion,
          isOverridden: false,
          confirmedAt: null,
          confirmedBy: null,
          createdAt: "",
          updatedAt: "",
        };

    resolved.push({
      occurrence,
      destinations,
      transactionLegs,
      isValid: issues.length === 0,
      validationIssues: issues,
      action,
    });
  }

  return {
    month: toYearMonth(month),
    occurrences: resolved,
    summary: summarize(resolved, accountsById),
  };
}

/**
 * Splits one resolved outflow occurrence's expectedAmount into the
 * portion landing in a savings/investment-type destination account vs.
 * the "pure expense" remainder -- the same savings/investment-exclusion
 * rule `summarize()` above uses for its own `savings`/`investments`
 * totals, factored out so callers outside this module (the redesigned
 * Monthly Preview, and the category-budget calculation) can identify
 * "this planned item is really a transfer into savings/investments, not
 * real spending" without re-deriving the loop over `destinations`. See
 * monthly-preview-view-model.ts's own doc comment for why this
 * distinction matters: an outflow occurrence whose destination is a
 * savings/investment account is still `direction = 'outflow'`, so a
 * naive "every outflow is an expense" reading double-counts it against
 * both a spending total and a savings/investments total.
 *
 * Only meaningful for a non-inflow occurrence -- callers are expected to
 * have already filtered to `occurrence.sourceAccountId !== null` (an
 * inflow occurrence has no `destinations` fan-out in the first place).
 */
function splitOutflowOccurrenceExpenseFromPots(
  resolvedOccurrence: ResolvedOccurrence,
  accountsById: Map<string, PlannedItemAccountLike>,
): { savings: number; investments: number; pureExpenseAmount: number } {
  let savings = 0;
  let investments = 0;

  for (const destination of resolvedOccurrence.destinations) {
    const account = accountsById.get(destination.destinationAccountId);
    if (account?.type === "savings") {
      savings = roundMoney(savings + destination.amount);
    } else if (account?.type === "investment") {
      investments = roundMoney(investments + destination.amount);
    }
  }

  const pureExpenseAmount = roundMoney(resolvedOccurrence.occurrence.expectedAmount - savings - investments);
  return { savings, investments, pureExpenseAmount };
}

function summarize(
  occurrences: ResolvedOccurrence[],
  accountsById: Map<string, PlannedItemAccountLike>,
): MonthlyBudgetSummary {
  let income = 0;
  let plannedExpenses = 0;
  let estimatedExpenses = 0;
  let savings = 0;
  let investments = 0;

  for (const resolvedOccurrence of occurrences) {
    if (!resolvedOccurrence.isValid) continue;
    const { occurrence } = resolvedOccurrence;
    if (occurrence.status === "skipped" || occurrence.status === "cancelled") continue;

    // No direction column on the occurrence itself -- outflow occurrences
    // always carry a source account and inflow occurrences never do
    // (planned_items_source_account_by_direction).
    const isInflow = occurrence.sourceAccountId === null;

    if (isInflow) {
      income = roundMoney(income + occurrence.expectedAmount);
      continue;
    }

    if (occurrence.isEstimate) {
      estimatedExpenses = roundMoney(estimatedExpenses + occurrence.expectedAmount);
    } else {
      plannedExpenses = roundMoney(plannedExpenses + occurrence.expectedAmount);
    }

    const potSplit = splitOutflowOccurrenceExpenseFromPots(resolvedOccurrence, accountsById);
    savings = roundMoney(savings + potSplit.savings);
    investments = roundMoney(investments + potSplit.investments);
  }

  return {
    income,
    plannedExpenses,
    estimatedExpenses,
    savings,
    investments,
    available: roundMoney(income - plannedExpenses - estimatedExpenses),
  };
}

export {
  isPlannedItemDueInMonth,
  roundMoney,
  splitEqualRemainderLast,
  splitOutflowOccurrenceExpenseFromPots,
  splitPercentRemainderLast,
};
