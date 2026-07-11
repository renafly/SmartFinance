import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { AUTH_CALLBACK_ROUTE } from '../features/auth/constants';
import { consumePendingRedirectTo } from '../features/auth/redirects';

export default function GoogleAuthScreen() {
  const { session, restoring } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== AUTH_CALLBACK_ROUTE) {
      window.history.replaceState({}, '', AUTH_CALLBACK_ROUTE);
    }
  }, []);

  if (restoring) return null;
  if (session) return <Redirect href={consumePendingRedirectTo() as any} />;

  return <Redirect href="/(auth)/login" />;
}
