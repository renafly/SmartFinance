import {
  getAddAnotherTransactionReset,
  getFreshTransactionCreateReset,
  getLocalCalendarDate,
} from './transaction-create-form';

describe('transaction create-form resets', () => {
  it('formats the local calendar components without converting through UTC', () => {
    const localDate = new Date(2026, 6, 31, 23, 59, 59);

    expect(getLocalCalendarDate(localDate)).toBe('2026-07-31');
  });

  it('creates a fresh expense draft for today', () => {
    expect(getFreshTransactionCreateReset(new Date(2027, 0, 2, 0, 5))).toEqual({
      accountId: '',
      amount: '',
      attachment: null,
      categoryId: null,
      createdById: '',
      date: '2027-01-02',
      notes: '',
      title: '',
      type: 'expense',
    });
  });

  it('preserves the selected date, account, creator, and type when adding another', () => {
    expect(
      getAddAnotherTransactionReset({
        accountId: 'account-2',
        createdById: 'profile-3',
        date: '2026-07-20',
        type: 'income',
      }),
    ).toEqual({
      accountId: 'account-2',
      amount: '',
      attachment: null,
      categoryId: null,
      createdById: 'profile-3',
      date: '2026-07-20',
      notes: '',
      title: '',
      type: 'income',
    });
  });
});
