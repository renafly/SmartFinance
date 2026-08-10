import type { DestinationSelection } from '@/components/grouped-destination-select';

export type MovementKind = 'one-off' | 'recurring-transfer' | 'recurring-transaction';
export type RuleKind = Exclude<MovementKind, 'one-off'>;
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type TransactionType = 'income' | 'expense';
export type ExpenseKind = 'subscription' | 'bill' | 'other';
export type ScheduledCategory = 'all' | 'subscription' | 'bill' | 'income' | 'transfer';

export type MovementDraft = {
  id?: string;
  kind: MovementKind;
  title: string;
  amount: string;
  notes: string;
  sourceAccountId: string;
  destination: DestinationSelection | null;
  categoryId: string | null;
  transactionType: TransactionType;
  expenseKind: ExpenseKind;
  frequency: Frequency;
  excludedMonths: number[];
  nextRun: string;
  createdById: string;
};

export const frequencies: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];

export const months = [
  { value: 1, key: 'jan' },
  { value: 2, key: 'feb' },
  { value: 3, key: 'mar' },
  { value: 4, key: 'apr' },
  { value: 5, key: 'may' },
  { value: 6, key: 'jun' },
  { value: 7, key: 'jul' },
  { value: 8, key: 'aug' },
  { value: 9, key: 'sep' },
  { value: 10, key: 'oct' },
  { value: 11, key: 'nov' },
  { value: 12, key: 'dec' },
] as const;
