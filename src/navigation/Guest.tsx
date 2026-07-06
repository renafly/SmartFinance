import type { PropsWithChildren } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';

// Inverse of Protected: keeps a signed-in user out of the guest login screen,
// redirecting them into the app instead.
export function Guest({ children }: PropsWithChildren) {
  const { session, restoring } = useAuth();

  if (restoring) return null;
  if (session) return <Redirect href="/(protected)" />;

  return <>{children}</>;
}
