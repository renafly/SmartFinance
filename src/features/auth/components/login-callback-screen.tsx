import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { consumePendingRedirectTo } from '@/features/auth/redirects';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/shared/lib/supabase/client';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function getCallbackCredentials(url: string) {
  const parsedUrl = new URL(url);
  const hashParams = new URLSearchParams(parsedUrl.hash.slice(1));

  return {
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
    code: parsedUrl.searchParams.get('code'),
  };
}

export function LoginCallbackScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const router = useRouter();
  const url = Linking.useURL();
  const [isProcessing, setIsProcessing] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (session) router.replace(consumePendingRedirectTo() as any);
  }, [router, session]);

  useEffect(() => {
    let isActive = true;

    async function completeLogin() {
      if (!url) return;

      try {
        const { accessToken, refreshToken, code } = getCallbackCredentials(url);
        const result = accessToken && refreshToken
          ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : code
            ? await supabase.auth.exchangeCodeForSession(code)
            : { error: new Error('The authentication callback did not contain a session.') };

        if (result.error) throw result.error;
        if (isActive) router.replace(consumePendingRedirectTo() as any);
      } catch (error) {
        console.error('[LoginCallbackScreen] Google callback could not be completed.', error);
        if (isActive) {
          Alert.alert(t('auth.googleSignInErrorTitle'), t('auth.googleCallbackErrorMessage'));
          router.replace('/(auth)/login');
        }
      } finally {
        if (isActive) setIsProcessing(false);
      }
    }

    void completeLogin();
    return () => {
      isActive = false;
    };
  }, [router, t, url]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {isProcessing ? t('auth.completingGoogleSignIn') : t('auth.googleSignInErrorMessage')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(3),
    padding: spacing(6),
  },
  label: {
    fontSize: typography.fontSize[15],
    lineHeight: typography.lineHeight[22],
    textAlign: 'center',
  },
});
