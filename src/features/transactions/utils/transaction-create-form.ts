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
