import { useEffect, useRef, useState } from 'react';
import { sessionService } from './session.service';
import type { SessionState } from './session.types';

type InternalState = Omit<SessionState, 'loading'> & {
  loading: boolean;
  // The user id this state was loaded for. `undefined` means nothing has
  // been loaded yet.
  subject: string | null | undefined;
};

/**
 * Loads the signed-in user's profile and household membership from the
 * database (profiles + accepted household_members rows).
 *
 * Keyed by the Supabase *session's* user id -- not by JWT claims. Claims are
 * fetched asynchronously after the session is set (and `getClaims()` can fail
 * on its own, e.g. a JWKS fetch on a fresh device), so keying by claims left a
 * window where a signed-in user looked "loaded with no household". That
 * transient state is what used to trap new-device logins in the setup flow.
 */
export function useSession(userId: string | null | undefined, refreshKey = 0): SessionState {
  const loadedSubjectRef = useRef<string | null | undefined>(undefined);
  const [state, setState] = useState<InternalState>({
    profile: null,
    householdId: null,
    loading: true,
    error: false,
    subject: undefined,
  });

  const currentSubject = userId ?? null;

  useEffect(() => {
    let isMounted = true;
    const nextSubject = currentSubject;
    const isSameUserRefresh =
      loadedSubjectRef.current !== undefined &&
      loadedSubjectRef.current === nextSubject;

    const fetchProfileAndHousehold = async () => {
      setState((current) => ({
        ...current,
        loading: !isSameUserRefresh,
      }));

      try {
        const nextState = await sessionService.loadProfileAndHousehold(nextSubject);

        if (isMounted) {
          loadedSubjectRef.current = nextSubject;
          setState({
            ...nextState,
            loading: false,
            error: false,
            subject: nextSubject,
          });
        }
      } catch (error) {
        console.error('Error fetching profile and household:', error);

        if (!isMounted) return;
        loadedSubjectRef.current = nextSubject;

        setState((current) => {
          // A background refresh for the same user that fails (flaky network,
          // token refresh hiccup) must not erase a membership we already
          // loaded successfully -- that would make an existing member look
          // household-less. Keep the last good data.
          if (isSameUserRefresh && current.subject === nextSubject && !current.error) {
            return { ...current, loading: false };
          }

          return {
            profile: null,
            householdId: null,
            loading: false,
            error: true,
            subject: nextSubject,
          };
        });
      }
    };

    fetchProfileAndHousehold();

    return () => {
      isMounted = false;
    };
  }, [currentSubject, refreshKey]);

  // The effect above only runs *after* a render commits, so on the render
  // where a new user id first arrives (e.g. right after login) `state` still
  // holds the previous, signed-out result: householdId null and loading
  // false. Treat that as loading synchronously so consumers never see
  // "logged in, no household" for a user whose data hasn't been fetched yet.
  const isStale = state.subject !== currentSubject;

  return {
    profile: isStale ? null : state.profile,
    householdId: isStale ? null : state.householdId,
    loading: state.loading || isStale,
    error: isStale ? false : state.error,
  };
}
