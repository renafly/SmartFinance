import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../shared/lib/supabase/client';
import { useSession, type Claims, type UserProfile } from '../shared/session';
import { usePreferencesStore, type AppCurrency } from '@/stores/preferencesStore';
import { useThemeStore, normalizeTheme } from '@/stores/themeStore';
import { normalizeLanguage } from '@/shared/i18n/languages';
import { AUTH_CALLBACK_ROUTE } from '@/features/auth/constants';
import { shouldRefreshClaimsForAuthEvent } from '@/features/auth/auth-state';

function logAuthError(message: string) {
  console.error(message);
}

function isNativeAuthCallback(url: string) {
  const parsedUrl = new URL(url);
  const callbackPath = `${parsedUrl.hostname ? `/${parsedUrl.hostname}` : ''}${parsedUrl.pathname}`;

  return parsedUrl.protocol === 'smartfinance:' && (
    callbackPath === AUTH_CALLBACK_ROUTE || callbackPath === '/google-auth'
  );
}

async function completeNativeAuthCallback(url: string) {
  if (!isNativeAuthCallback(url)) return false;

  const parsedUrl = new URL(url);
  const hashParams = new URLSearchParams(parsedUrl.hash.slice(1));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  const code = parsedUrl.searchParams.get('code');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    return true;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }

  throw new Error('The authentication callback did not contain a session.');
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
  const activeUserIdRef = useRef<string | null>(null);
  const claimsRef = useRef<Claims>(undefined);

  async function syncAuthState(isActive = true) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      logAuthError('Error restoring Supabase session.');
    }

    if (isActive) {
      activeUserIdRef.current = sessionData.session?.user.id ?? null;
      setSession(sessionData.session);
    }

    const { data, error } = await supabase.auth.getClaims();
    if (error) {
      logAuthError('Error fetching claims.');
    }

    if (isActive) {
      const nextClaims = data?.claims ?? null;
      claimsRef.current = nextClaims;
      setClaims(nextClaims);
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

    const handleNativeCallback = async (url: string) => {
      try {
        const completed = await completeNativeAuthCallback(url);
        if (completed) await syncAuthState(isMounted);
      } catch (error) {
        console.error('Error completing native Supabase callback.', error);
      }
    };

    void Linking.getInitialURL().then((url) => {
      if (url) void handleNativeCallback(url);
    });

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleNativeCallback(url);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const previousUserId = activeUserIdRef.current;
      const nextUserId = nextSession?.user.id ?? null;
      activeUserIdRef.current = nextUserId;

      if (isMounted) {
        setSession(nextSession);
      }

      if (event === 'SIGNED_OUT') {
        claimsRef.current = null;
        if (isMounted) {
          setClaims(null);
          setRefreshKey((current) => current + 1);
        }
        return;
      }

      if (
        !shouldRefreshClaimsForAuthEvent({
          event,
          previousUserId,
          nextUserId,
          hasLoadedClaims: claimsRef.current !== undefined,
        })
      ) {
        return;
      }

      void supabase.auth.getClaims().then(({ data }) => {
        if (!isMounted) return;

        const nextClaims = data?.claims ?? null;
        claimsRef.current = nextClaims;
        setClaims(nextClaims);
        setRefreshKey((current) => current + 1);
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const { profile, householdId, loading } = useSession(claims, refreshKey);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const currency = usePreferencesStore((state) => state.currency);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const setThemeMode = useThemeStore((state) => state.setMode);

  // The database profile is the source of truth for an authenticated user's
  // language, theme, and currency. Apply every valid value as soon as the
  // profile loads so the app reflects the account's saved settings rather
  // than whatever a local cache (or another account's prior session on this
  // device) left behind. These setters also refresh that local cache, which
  // is only ever a fallback for the brief window before the profile loads.
  useEffect(() => {
    if (!profile) return;

    const preferredCurrency = profile.preferred_currency as AppCurrency | undefined;
    if (preferredCurrency === 'EUR' || preferredCurrency === 'USD' || preferredCurrency === 'GBP') {
      setCurrency(preferredCurrency);
    }

    const preferredLanguage = normalizeLanguage(profile.locale);
    if (preferredLanguage) {
      setLanguage(preferredLanguage);
    }

    const preferredTheme = normalizeTheme(profile.theme);
    if (preferredTheme) {
      setThemeMode(preferredTheme);
    }
  }, [profile, setCurrency, setLanguage, setThemeMode]);

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

    activeUserIdRef.current = data.session?.user.id ?? null;
    setSession(data.session);

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError) {
      logAuthError('Error fetching claims after sign-in.');
    }

    const nextClaims = claimsData?.claims ?? null;
    claimsRef.current = nextClaims;
    setClaims(nextClaims);
    setRestoring(false);
  }

  async function logout() {
    setRestoring(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setRestoring(false);
      throw error;
    }

    activeUserIdRef.current = null;
    claimsRef.current = null;
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
