import { useEffect, useRef, useState } from 'react';
import { sessionService } from './session.service';
import type { Claims, SessionState } from './session.types';

export function useSession(claims: Claims, refreshKey = 0) {
  const loadedSubjectRef = useRef<string | null | undefined>(undefined);
  const [state, setState] = useState<SessionState>({
    profile: null,
    householdId: null,
    loading: true,
  });

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
          });
        }
      }
    };

    fetchProfileAndHousehold();

    return () => {
      isMounted = false;
    };
  }, [claims, refreshKey]);

  return state;
}
