import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Redirect, useGlobalSearchParams, usePathname } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { buildCurrentRedirectTo, storePendingRedirectTo } from '../features/auth/redirects';
import { AuthLoadingTransition } from '../features/auth/components/auth-loading-transition';
import { Button } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

// Wraps the (protected) route group's layout. Redirects to the public
// welcome/login screen if there's no session, and shows the loading
// transition while auth data is hydrating to avoid flashing protected content.
//
// A signed-in user with no household is NOT redirected anywhere: the app
// renders normally and the Dashboard offers to create/join a household
// (see HouseholdSetupCard). Household membership comes only from the
// database (useAuth().householdId), never from a device-local flag.
export function Protected({ children }: PropsWithChildren) {
  const { session, restoring, isLoading, householdId, sessionError, refreshSession } = useAuth();
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  if (restoring) return <AuthLoadingTransition />;
  if (!session) {
    const redirectTo = storePendingRedirectTo(buildCurrentRedirectTo(pathname, params));

    return <Redirect href={{ pathname: '/login', params: redirectTo ? { redirectTo } : undefined }} />;
  }

  if (isLoading) return <AuthLoadingTransition />;

  // The membership check itself failed (network/database error). householdId
  // is unknown here, not "none" -- offer a retry instead of letting any screen
  // treat this user as household-less.
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
