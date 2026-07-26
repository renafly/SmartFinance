import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { Redirect, useLocalSearchParams, useSegments } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { consumePendingRedirectTo, storePendingRedirectTo } from '../features/auth/redirects';

// Inverse of Protected: keeps a signed-in user out of the guest login screen,
// redirecting them into the app instead.
export function Guest({ children }: PropsWithChildren) {
  const { session, restoring } = useAuth();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const segments = useSegments();
  const isAuthRouteActive = segments[0] === '(auth)';

  useEffect(() => {
    storePendingRedirectTo(redirectTo);
  }, [redirectTo]);

  if (restoring) return null;
  if (session && isAuthRouteActive) {
    return <Redirect href={consumePendingRedirectTo(redirectTo) as any} />;
  }

  return <>{children}</>;
}
