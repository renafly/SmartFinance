import { useEffect, useRef, useState } from 'react';
import { sessionService } from './session.service';
import type { Claims, SessionState } from './session.types';

type InternalState = Omit<SessionState, 'loading'> & {
  loading: boolean;
  // The claims subject (user id) this state was loaded for. `undefined` means
  // nothing has been loaded yet.
  subject: string | null | undefined;
};

export function useSession(claims: Claims, refreshKey = 0): SessionState {
  const loadedSubjectRef = useRef<string | null | undefined>(undefined);
  const [state, setState] = useState<InternalState>({
    profile: null,
    householdId: null,
    loading: true,
    error: false,
    subject: undefined,
  });

  const currentSubject = claims?.sub ?? null;

  useEffect(() => {
    let isMounted = true;
    const nextSubject = claims?.sub ?? null;
    const shouldBlockContent =
      loadedSubjectRef.current === undefined ||
      loadedSubjectRef.current !== nextSubject;

    const fetchProfileAndHousehold = async () => {
      setState((current) => ({
        ...current,
        loading: shouldBlockContent,
      }));

      try {
        const nextState = await sessionService.loadProfileAndHousehold(claims);

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

        if (isMounted) {
          loadedSubjectRef.current = nextSubject;
          setState({
            profile: null,
            householdId: null,
            loading: false,
            error: true,
            subject: nextSubject,
          });
        }
      }
    };

    fetchProfileAndHousehold();

    return () => {
      isMounted = false;
    };
  }, [claims, refreshKey]);

  // The effect above only runs *after* a render commits, so on the render
  // where a new user's claims first arrive (e.g. right after login) `state`
  // still holds the previous, signed-out result: householdId null and
  // loading false. Treat that as loading synchronously so consumers never see
  // "logged in, no household" for a user whose data hasn't been fetched yet
  // (that stale frame used to latch the setup wizard on every login).
  const isStale = state.subject !== currentSubject;

  return {
    profile: isStale ? null : state.profile,
    householdId: isStale ? null : state.householdId,
    loading: state.loading || isStale,
    error: isStale ? false : state.error,
  };
}
