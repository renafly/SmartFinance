import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { supabase } from '../shared/lib/supabase/client';
import { useSession, type Claims, type UserProfile } from '../shared/session';
import { usePreferencesStore, type AppCurrency } from '@/stores/preferencesStore';

function logAuthError(message: string) {
  console.error(message);
}

type AuthContextValue = {
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];
  restoring: boolean;
  claims: Claims;
  profile: UserProfile;
  householdId: string | null;
  currency: AppCurrency;
  isLoading: boolean;
  isLoggedIn: boolean;
  signInWithIdToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [restoring, setRestoring] = useState(true);
  const [claims, setClaims] = useState<Claims>();
  const [refreshKey, setRefreshKey] = useState(0);

  async function syncAuthState(isActive = true) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      logAuthError('Error restoring Supabase session.');
    }

    if (isActive) {
      setSession(sessionData.session);
    }

    const { data, error } = await supabase.auth.getClaims();
    if (error) {
      logAuthError('Error fetching claims.');
    }

    if (isActive) {
      setClaims(data?.claims ?? null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    const fetchClaims = async () => {
      setRestoring(true);
      await syncAuthState(isMounted);

      if (isMounted) {
        setRestoring(false);
      }
    };

    fetchClaims();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
      }

      const { data } = await supabase.auth.getClaims();
      if (isMounted) {
        setClaims(data?.claims ?? null);
        setRefreshKey((current) => current + 1);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const { profile, householdId, loading } = useSession(claims, refreshKey);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const currency = usePreferencesStore((state) => state.currency);

  useEffect(() => {
    const preferredCurrency = profile?.preferred_currency as AppCurrency | undefined;

    if (preferredCurrency === 'EUR' || preferredCurrency === 'USD' || preferredCurrency === 'GBP') {
      setCurrency(preferredCurrency);
    }
  }, [profile?.preferred_currency, setCurrency]);

  async function refreshSession() {
    await syncAuthState();
    setRefreshKey((current) => current + 1);
  }

  async function signInWithIdToken(idToken: string) {
    setRestoring(true);

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      setRestoring(false);
      throw error;
    }

    setSession(data.session);

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError) {
      logAuthError('Error fetching claims after sign-in.');
    }

    setClaims(claimsData?.claims ?? null);
    setRestoring(false);
  }

  async function logout() {
    setRestoring(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setRestoring(false);
      throw error;
    }

    setSession(null);
    setClaims(null);
    setRestoring(false);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        restoring,
        claims,
        profile,
        householdId,
        currency,
        isLoading: restoring || loading,
        isLoggedIn: claims !== undefined,
        signInWithIdToken,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider.');
  return ctx;
}
