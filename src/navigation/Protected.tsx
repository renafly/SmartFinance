import type { PropsWithChildren } from 'react';
import { Redirect, useGlobalSearchParams, usePathname } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { buildCurrentRedirectTo, storePendingRedirectTo } from '../features/auth/redirects';
import { AuthLoadingTransition } from '../features/auth/components/auth-loading-transition';

// Wraps the (protected) route group's layout. Redirects to the public
// welcome/login screen if there's no session, and shows the loading
// transition while auth data is hydrating to avoid flashing protected content.
export function Protected({ children }: PropsWithChildren) {
  const { session, restoring, isLoading } = useAuth();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  if (restoring) return <AuthLoadingTransition />;
  if (!session) {
    const redirectTo = storePendingRedirectTo(buildCurrentRedirectTo(pathname, params));

    return <Redirect href={{ pathname: '/(auth)/login', params: redirectTo ? { redirectTo } : undefined }} />;
  }

  if (isLoading) return <AuthLoadingTransition />;

  return <>{children}</>;
}
