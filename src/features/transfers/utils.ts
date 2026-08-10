import type { MovementDraft, MovementKind, RuleKind, ScheduledCategory } from './types';

export function today() {
  return new Date().toISOString().slice(0, 10);
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

export function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
  };
}

export function ruleKindOf(item: any): RuleKind {
  return item.rule_kind === 'transfer' ? 'recurring-transfer' : 'recurring-transaction';
}

export function scheduledCategoryOf(item: any): Exclude<ScheduledCategory, 'all'> {
  if (item.rule_kind === 'transfer') return 'transfer';
  if (item.type === 'income') return 'income';
  return item.expense_kind === 'subscription' ? 'subscription' : 'bill';
}
