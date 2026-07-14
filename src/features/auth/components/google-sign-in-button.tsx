import { supabase } from '@/shared/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { AUTH_CALLBACK_ROUTE } from '../constants';
import { consumePendingRedirectTo, storePendingRedirectTo } from '../redirects';

WebBrowser.maybeCompleteAuthSession();

function extractParamsFromUrl(url: string) {
  const parsedUrl = new URL(url);
  const hash = parsedUrl.hash.substring(1);
  const params = new URLSearchParams(hash);

  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
  };
}

type GoogleSignInButtonProps = {
  redirectTo?: string | string[];
};

export function GoogleSignInButton({ redirectTo }: GoogleSignInButtonProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function onSignInButtonPress() {
    if (isSigningIn) return;

    setIsSigningIn(true);
    storePendingRedirectTo(redirectTo);
    try {
      const callbackUrl = Linking.createURL(AUTH_CALLBACK_ROUTE);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: { prompt: 'consent' },
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned from Supabase.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, callbackUrl, {
        showInRecents: true,
      });

      if (result.type === 'success') {
        const params = extractParamsFromUrl(result.url);
        if (params.access_token && params.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });

          if (sessionError) throw sessionError;
          router.replace(consumePendingRedirectTo() as any);
          return;
        }

        throw new Error('Google callback did not include a Supabase session.');
      }

      // The user can close or cancel the Custom Tab without this being an app error.
      return;
    } catch (error) {
      console.error('[GoogleSignInButton] Google sign-in failed.', error);
      Alert.alert(t('auth.googleSignInErrorTitle'), t('auth.googleSignInErrorMessage'));
    } finally {
      setIsSigningIn(false);
    }
  }

  useEffect(() => {
    WebBrowser.warmUpAsync();

    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('auth.continueWithGoogle')}
      accessibilityState={{ disabled: isSigningIn, busy: isSigningIn }}
      disabled={isSigningIn}
      onPress={() => void onSignInButtonPress()}
      style={({ pressed }) => [styles.button, pressed && !isSigningIn && styles.pressed, isSigningIn && styles.disabled]}
    >
      <View style={styles.iconSlot}>
        {isSigningIn ? <ActivityIndicator color="#4285F4" size="small" /> : <Ionicons name="logo-google" size={20} color="#4285F4" />}
      </View>
      <Text style={styles.label}>{t('auth.continueWithGoogle')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 272,
    minHeight: 46,
    paddingHorizontal: spacing(4),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#DADCE0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    position: 'absolute',
    left: spacing(4),
  },
  label: {
    color: '#3C4043',
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    backgroundColor: '#F8FAFC',
  },
  disabled: {
    opacity: 0.7,
  },
});

export default GoogleSignInButton;
