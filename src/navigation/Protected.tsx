import type { PropsWithChildren } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';

// Wraps the (protected) route group's layout. Redirects to the public
// welcome/login screen if there's no session, and renders nothing while
// the session is still restoring to avoid a flash of protected content
// before the redirect fires.
export function Protected({ children }: PropsWithChildren) {
  const { session, restoring } = useAuth();

  if (restoring) return null;
  if (!session) return <Redirect href="/(public)" />;

  return <>{children}</>;
}
