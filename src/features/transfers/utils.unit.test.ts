import { emptyDraft, movementAmount, movementIssues, swapMovementAccounts } from './utils';
import type { MovementDraft } from './types';

function transfer(patch: Partial<MovementDraft> = {}): MovementDraft {
  return {
    ...emptyDraft('recurring-transfer', 'me'),
    title: 'Renda',
    amount: '650',
    sourceAccountId: 'a1',
    destination: { kind: 'account', id: 'a2' },
    nextRun: '2026-12-01',
    ...patch,
  };
}

describe('movementAmount', () => {
  it('accepts a decimal comma', () => {
    expect(movementAmount(transfer({ amount: '12,50' }))).toBe(12.5);
  });
});

describe('movementIssues', () => {
  it('returns nothing for a complete transfer', () => {
    expect(movementIssues(transfer())).toEqual([]);
  });

  it('accepts an amount typed with a decimal comma', () => {
    expect(movementIssues(transfer({ amount: '650,25' }))).toEqual([]);
  });

  it('lists every missing or invalid field in form order', () => {
    expect(
      movementIssues(
        transfer({ title: '  ', amount: '0', sourceAccountId: '', destination: null, nextRun: '' }),
      ),
    ).toEqual(['title', 'amount', 'nextRun', 'source', 'destination']);
  });

  it('flags a malformed amount', () => {
    expect(movementIssues(transfer({ amount: '12abc' }))).toEqual(['amount']);
  });

  it('does not require a destination for a recurring transaction', () => {
    expect(
      movementIssues({ ...transfer(), kind: 'recurring-transaction', destination: null }),
    ).toEqual([]);
  });

  it('flags an invalid end condition', () => {
    expect(movementIssues(transfer({ endCondition: 'count', endAfterOccurrences: '0' }))).toEqual([
      'endCondition',
    ]);
  });
});

describe('swapMovementAccounts', () => {
  it('swaps source and destination accounts', () => {
    expect(swapMovementAccounts(transfer())).toMatchObject({
      sourceAccountId: 'a2',
      destination: { kind: 'account', id: 'a1' },
    });
  });

  it('leaves the draft unchanged when either side is empty', () => {
    const noDestination = transfer({ destination: null });
    expect(swapMovementAccounts(noDestination)).toBe(noDestination);
    const noSource = transfer({ sourceAccountId: '' });
    expect(swapMovementAccounts(noSource)).toBe(noSource);
  });
});
