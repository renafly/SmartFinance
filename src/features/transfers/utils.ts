import type { MovementDraft, MovementKind, RuleKind, ScheduledCategory } from './types';
import { getLocalCalendarDate, parseLocalCalendarDate } from '@/features/transactions/utils/transaction-create-form';

// Uses local calendar-day parts (not toISOString, which converts through
// UTC first) so this matches "today" in the user's own timezone -- an
// evening call in a negative-UTC-offset timezone no longer seeds
// tomorrow's date as the default "next run" for a new recurring transfer.
export function today() {
  return getLocalCalendarDate();
}

export function normalizeMonths(values: unknown) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map(Number)
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12),
    ),
  ].sort((left, right) => left - right);
}

export function emptyDraft(kind: MovementKind, currentUserId?: string): MovementDraft {
  return {
    kind,
    title: '',
    amount: '',
    notes: '',
    sourceAccountId: '',
    destination: null,
    categoryId: null,
    transactionType: 'expense',
    expenseKind: kind === 'recurring-transaction' ? 'subscription' : 'other',
    frequency: 'monthly',
    excludedMonths: [],
    nextRun: today(),
    createdById: currentUserId ?? '',
    endCondition: 'never',
    endAfterOccurrences: '',
    endDate: '',
    occurrencesCount: 0,
  };
}

/**
 * Validates the draft's end-condition fields, mirroring the DB check
 * constraint (`recurring_transactions_end_condition_shape`) and the
 * `resolveEndConditionColumns` guard in recurring-transactions.service.ts:
 * 'count' needs a positive integer, 'date' needs a real date.
 * See docs/recurring-end-conditions-reimbursements-bug-fab-plan.md §1.
 */
export function isEndConditionValid(value: MovementDraft): boolean {
  if (value.endCondition === 'count') {
    const n = Number(value.endAfterOccurrences);
    return Number.isInteger(n) && n > 0;
  }
  if (value.endCondition === 'date') {
    return parseLocalCalendarDate(value.endDate) !== null;
  }
  return true;
}

/**
 * Builds the tagged-union end-condition payload the service layer expects
 * (recurringTransactionsService.{create,update}RecurringTransaction) from
 * the draft's flat string fields.
 */
export function endConditionPayload(value: MovementDraft) {
  if (value.endCondition === 'count') {
    return { endCondition: 'count' as const, endAfterOccurrences: Number(value.endAfterOccurrences) };
  }
  if (value.endCondition === 'date') {
    return { endCondition: 'date' as const, endDate: value.endDate };
  }
  return { endCondition: 'never' as const };
}

export function ruleKindOf(item: any): RuleKind {
  return item.rule_kind === 'transfer' ? 'recurring-transfer' : 'recurring-transaction';
}

/**
 * Human-readable end-condition status for a persisted recurring rule, e.g.
 * "Ends after 6 occurrences (3/6)" or "Ends on 2027-01-01". Returns null
 * for endCondition === 'never' (nothing worth showing).
 */
export function endStatusLabel(
  item: { end_condition?: string | null; end_after_occurrences?: number | null; end_date?: string | null; occurrences_count?: number | null; is_active?: boolean },
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  if (item.end_condition === 'count' && item.end_after_occurrences != null) {
    if (!item.is_active && (item.occurrences_count ?? 0) >= item.end_after_occurrences) {
      return t('recurring.endStatusEnded');
    }
    return t('recurring.endStatusCount', {
      limit: item.end_after_occurrences,
      count: item.occurrences_count ?? 0,
    });
  }
  if (item.end_condition === 'date' && item.end_date) {
    return t('recurring.endStatusDate', { date: item.end_date.slice(0, 10) });
  }
  return null;
}

export function scheduledCategoryOf(item: any): Exclude<ScheduledCategory, 'all'> {
  if (item.rule_kind === 'transfer') return 'transfer';
  if (item.type === 'income') return 'income';
  return item.expense_kind === 'subscription' ? 'subscription' : 'bill';
}
