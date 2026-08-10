export type TransactionListSortKey =
  | 'newest'
  | 'oldest'
  | 'amount_desc'
  | 'amount_asc'
  | 'title_asc'
  | 'title_desc';

type SortableTransaction = {
  id?: string | null;
  title?: string | null;
  amount?: number | string | null;
  transaction_date?: string | null;
  created_at?: string | null;
};

function timestamp(value: string | null | undefined) {
  const parsed = new Date(value ?? 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function titleKey(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function compareTransactions(
  a: SortableTransaction,
  b: SortableTransaction,
  sortBy: TransactionListSortKey,
) {
  const transactionDateA = timestamp(a.transaction_date);
  const transactionDateB = timestamp(b.transaction_date);
  const createdAtA = timestamp(a.created_at);
  const createdAtB = timestamp(b.created_at);
  const amountA = Number(a.amount ?? 0);
  const amountB = Number(b.amount ?? 0);
  const idA = String(a.id ?? '');
  const idB = String(b.id ?? '');
  const titleA = titleKey(a.title);
  const titleB = titleKey(b.title);

  switch (sortBy) {
    case 'oldest':
      return transactionDateA - transactionDateB || createdAtB - createdAtA || idB.localeCompare(idA);
    case 'amount_desc':
      return amountB - amountA || transactionDateB - transactionDateA || createdAtB - createdAtA || idB.localeCompare(idA);
    case 'amount_asc':
      return amountA - amountB || transactionDateB - transactionDateA || createdAtB - createdAtA || idB.localeCompare(idA);
    case 'title_asc':
      return (
        titleA.localeCompare(titleB) ||
        transactionDateB - transactionDateA ||
        createdAtB - createdAtA ||
        idB.localeCompare(idA)
      );
    case 'title_desc':
      return (
        titleB.localeCompare(titleA) ||
        transactionDateB - transactionDateA ||
        createdAtB - createdAtA ||
        idB.localeCompare(idA)
      );
    case 'newest':
    default:
      return transactionDateB - transactionDateA || createdAtB - createdAtA || idB.localeCompare(idA);
  }
}
