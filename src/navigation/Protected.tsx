import { useEffect, useState, type PropsWithChildren } from 'react';
import { Redirect, useGlobalSearchParams, usePathname } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { buildCurrentRedirectTo, storePendingRedirectTo } from '../features/auth/redirects';
import { AuthLoadingTransition } from '../features/auth/components/auth-loading-transition';
import { SetupWizard } from '../features/setup';

// Wraps the (protected) route group's layout. Redirects to the public
// welcome/login screen if there's no session, and shows the loading
// transition while auth data is hydrating to avoid flashing protected content.
export function Protected({ children }: PropsWithChildren) {
  const { session, restoring, isLoading, householdId } = useAuth();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  // A signed-in user with zero households (a cold sign-up with no invite --
  // household creation is never automatic, see 017_household_provisioning.sql)
  // gets the setup wizard instead of the real app. `needsSetup` is the live
  // condition; `setupStarted` latches it so the wizard keeps showing through
  // its later steps even after householdId flips non-null partway through
  // (once the wizard's own household-creation step succeeds) -- the
  // remaining steps (profile, starting accounts) should still run rather
  // than dropping the user straight into the app.
  const needsSetup = !isLoading && householdId === null;
  const [setupStarted, setSetupStarted] = useState(false);

  useEffect(() => {
    if (needsSetup) setSetupStarted(true);
  }, [needsSetup]);

  if (restoring) return <AuthLoadingTransition />;
  if (!session) {
    const redirectTo = storePendingRedirectTo(buildCurrentRedirectTo(pathname, params));

    return <Redirect href={{ pathname: '/login', params: redirectTo ? { redirectTo } : undefined }} />;
  }

  if (isLoading) return <AuthLoadingTransition />;

  if (needsSetup || setupStarted) {
    return <SetupWizard onComplete={() => setSetupStarted(false)} />;
  }

  return <>{children}</>;
}
