import { useEffect, useState, type PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Redirect, useGlobalSearchParams, usePathname } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { buildCurrentRedirectTo, storePendingRedirectTo } from '../features/auth/redirects';
import { AuthLoadingTransition } from '../features/auth/components/auth-loading-transition';
import { SetupWizard } from '../features/setup';
import { Button } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

// Wraps the (protected) route group's layout. Redirects to the public
// welcome/login screen if there's no session, and shows the loading
// transition while auth data is hydrating to avoid flashing protected content.
export function Protected({ children }: PropsWithChildren) {
  const { session, restoring, isLoading, householdId, sessionError, refreshSession } = useAuth();
  const { t } = useTranslation('common');
  const { colors } = useTheme();
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
  //
  // Only a *successful* load that found zero memberships counts: a failed load
  // (sessionError) also yields householdId null, and sending that user to the
  // wizard would have them create a duplicate household. The latch is keyed
  // by user id so it can never carry over to a different account.
  const userId = session?.user.id ?? null;
  const needsSetup = !!userId && !isLoading && !sessionError && householdId === null;
  const [setupUserId, setSetupUserId] = useState<string | null>(null);
  const setupStarted = setupUserId !== null && setupUserId === userId;

  useEffect(() => {
    if (needsSetup) setSetupUserId(userId);
  }, [needsSetup, userId]);

  if (restoring) return <AuthLoadingTransition />;
  if (!session) {
    const redirectTo = storePendingRedirectTo(buildCurrentRedirectTo(pathname, params));

    return <Redirect href={{ pathname: '/login', params: redirectTo ? { redirectTo } : undefined }} />;
  }

  if (isLoading) return <AuthLoadingTransition />;

  if (needsSetup || setupStarted) {
    return <SetupWizard onComplete={() => setSetupUserId(null)} />;
  }

  if (sessionError && householdId === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing(2), padding: spacing(3), backgroundColor: colors.background }}>
        <Text style={{ color: colors.text, fontSize: 16, textAlign: 'center' }}>
          {t('auth.sessionLoadError', { defaultValue: "We couldn't load your household. Check your connection and try again." })}
        </Text>
        <Button label={t('auth.retry', { defaultValue: 'Try again' })} onPress={() => void refreshSession()} />
      </View>
    );
  }

  return <>{children}</>;
}
