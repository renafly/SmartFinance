import type { PropsWithChildren } from 'react';
import { Redirect, useGlobalSearchParams, usePathname } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { buildCurrentRedirectTo, storePendingRedirectTo } from '../features/auth/redirects';

// Wraps the (protected) route group's layout. Redirects to the public
// welcome/login screen if there's no session, and renders nothing while
// the session is still restoring to avoid a flash of protected content
// before the redirect fires.
export function Protected({ children }: PropsWithChildren) {
  const { session, restoring } = useAuth();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  if (restoring) return null;
  if (!session) {
    const redirectTo = storePendingRedirectTo(buildCurrentRedirectTo(pathname, params));

    return <Redirect href={{ pathname: '/(auth)/login', params: redirectTo ? { redirectTo } : undefined }} />;
  }

  return <>{children}</>;
}
