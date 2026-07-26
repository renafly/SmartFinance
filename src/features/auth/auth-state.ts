import type { AuthChangeEvent } from '@supabase/supabase-js';

type ShouldRefreshClaimsInput = {
  event: AuthChangeEvent;
  previousUserId: string | null;
  nextUserId: string | null;
  hasLoadedClaims: boolean;
};

export function shouldRefreshClaimsForAuthEvent({
  event,
  previousUserId,
  nextUserId,
  hasLoadedClaims,
}: ShouldRefreshClaimsInput) {
  if (event === 'USER_UPDATED') return true;

  return (
    event === 'SIGNED_IN' &&
    (!hasLoadedClaims || previousUserId !== nextUserId)
  );
}
