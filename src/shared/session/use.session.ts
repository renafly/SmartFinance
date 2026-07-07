import { useEffect, useState } from 'react';
import { sessionService } from './session.service';
import type { Claims, SessionState } from './session.types';

export function useSession(claims: Claims, refreshKey = 0) {
  const [state, setState] = useState<SessionState>({
    profile: null,
    householdId: null,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchProfileAndHousehold = async () => {
      setState((current) => ({ ...current, loading: true }));

      try {
        const nextState = await sessionService.loadProfileAndHousehold(claims);

        if (isMounted) {
          setState({
            ...nextState,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Error fetching profile and household:', error);

        if (isMounted) {
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
