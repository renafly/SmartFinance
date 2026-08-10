import { compareTransactions, type TransactionListSortKey } from './transaction-list';

function sortedIds(sortBy: TransactionListSortKey) {
  return [
    {
      id: 'created-first',
      title: 'Groceries',
      amount: 20,
      transaction_date: '2026-07-20',
      created_at: '2026-07-20T08:00:00.000Z',
    },
    {
      id: 'created-last',
      title: 'zzz Late Night Snack',
      amount: 20,
      transaction_date: '2026-07-20',
      created_at: '2026-07-20T18:00:00.000Z',
    },
    {
      id: 'different-date',
      title: 'awning repair',
      amount: 5,
      transaction_date: '2026-07-19',
      created_at: '2026-07-21T12:00:00.000Z',
    },
  ]
    .sort((a, b) => compareTransactions(a, b, sortBy))
    .map((transaction) => transaction.id);
}

describe('compareTransactions', () => {
  it('sorts newest transaction dates first and creation dates descending within the same day', () => {
    expect(sortedIds('newest')).toEqual(['created-last', 'created-first', 'different-date']);
  });

  it('keeps creation date descending as the tie-breaker for oldest-first ordering', () => {
    expect(sortedIds('oldest')).toEqual(['different-date', 'created-last', 'created-first']);
  });

  it('uses transaction date and creation date after amount ordering', () => {
    expect(sortedIds('amount_desc')).toEqual(['created-last', 'created-first', 'different-date']);
  });

  it('sorts titles A-Z case-insensitively for title_asc', () => {
    // "awning repair" < "Groceries" < "zzz Late Night Snack" once
    // case-folded, regardless of the original casing.
    expect(sortedIds('title_asc')).toEqual(['different-date', 'created-first', 'created-last']);
  });

  it('sorts titles Z-A case-insensitively for title_desc', () => {
    expect(sortedIds('title_desc')).toEqual(['created-last', 'created-first', 'different-date']);
  });
});
