export type TransactionCreateContext = {
  accountId: string;
  createdById: string;
  date: string;
  type: 'income' | 'expense';
};

export type TransactionCreateReset = TransactionCreateContext & {
  amount: string;
  attachment: null;
  categoryId: null;
  notes: string;
  title: string;
};

/** Formats a Date as the user's local calendar day, without converting through UTC. */
export function getLocalCalendarDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Parses a "YYYY-MM-DD" string as a local calendar date (not UTC midnight). Returns null for anything that doesn't match or isn't a real date. */
export function parseLocalCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getFreshTransactionCreateReset(
  now = new Date(),
): TransactionCreateReset {
  return {
    accountId: '',
    amount: '',
    attachment: null,
    categoryId: null,
    createdById: '',
    date: getLocalCalendarDate(now),
    notes: '',
    title: '',
    type: 'expense',
  };
}

export function getAddAnotherTransactionReset(
  context: TransactionCreateContext,
): TransactionCreateReset {
  return {
    ...context,
    amount: '',
    attachment: null,
    categoryId: null,
    notes: '',
    title: '',
  };
}
