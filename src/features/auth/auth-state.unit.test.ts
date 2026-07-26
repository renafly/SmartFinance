import { shouldRefreshClaimsForAuthEvent } from './auth-state';

describe('shouldRefreshClaimsForAuthEvent', () => {
  it.each(['TOKEN_REFRESHED', 'INITIAL_SESSION'] as const)(
    'does not reload profile data for %s',
    (event) => {
      expect(
        shouldRefreshClaimsForAuthEvent({
          event,
          previousUserId: 'user-1',
          nextUserId: 'user-1',
          hasLoadedClaims: true,
        }),
      ).toBe(false);
    },
  );

  it('does not reload profile data for a repeated SIGNED_IN event from the same user', () => {
    expect(
      shouldRefreshClaimsForAuthEvent({
        event: 'SIGNED_IN',
        previousUserId: 'user-1',
        nextUserId: 'user-1',
        hasLoadedClaims: true,
      }),
    ).toBe(false);
  });

  it.each([
    {
      event: 'SIGNED_IN' as const,
      previousUserId: null,
      nextUserId: 'user-1',
      hasLoadedClaims: false,
    },
    {
      event: 'SIGNED_IN' as const,
      previousUserId: 'user-1',
      nextUserId: 'user-2',
      hasLoadedClaims: true,
    },
    {
      event: 'USER_UPDATED' as const,
      previousUserId: 'user-1',
      nextUserId: 'user-1',
      hasLoadedClaims: true,
    },
  ])('reloads profile data for a meaningful $event event', (input) => {
    expect(shouldRefreshClaimsForAuthEvent(input)).toBe(true);
  });
});
