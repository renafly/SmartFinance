import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { supabase } from '../shared/lib/supabase/client';
import { useSession, type Claims, type UserProfile } from '../shared/session';

type AuthContextValue = {
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];
  restoring: boolean;
  claims: Claims;
  profile: UserProfile;
  householdId: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  signInWithIdToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [restoring, setRestoring] = useState(true);
  const [claims, setClaims] = useState<Claims>();

  useEffect(() => {
    let isMounted = true;

    const fetchClaims = async () => {
      setRestoring(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error restoring Supabase session:', sessionError);
      }

      if (isMounted) {
        setSession(sessionData.session);
      }

      const { data, error } = await supabase.auth.getClaims();
      if (error) {
        console.error('Error fetching claims:', error);
      }

      if (isMounted) {
        setClaims(data?.claims ?? null);
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
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const { profile, householdId, loading } = useSession(claims);

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
      console.error('Error fetching claims after sign-in:', claimsError);
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
        isLoading: restoring || loading,
        isLoggedIn: claims !== undefined,
        signInWithIdToken,
        logout,
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
