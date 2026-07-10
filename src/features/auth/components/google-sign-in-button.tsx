import { supabase } from '@/shared/lib/supabase/client';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';
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

  async function onSignInButtonPress() {
    storePendingRedirectTo(redirectTo);
    const callbackUrl = Linking.createURL(AUTH_CALLBACK_ROUTE);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: { prompt: 'consent' },
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('[GoogleSignInButton] Google sign-in could not start.');
      throw error;
    }

    const googleOAuthUrl = data.url;

    if (!googleOAuthUrl) {
      throw new Error('No OAuth URL returned from Supabase.');
    }

    const result = await WebBrowser.openAuthSessionAsync(
      googleOAuthUrl,
      callbackUrl,
      {
        showInRecents: true,
      },
    );

    if (result.type === 'success') {
      const params = extractParamsFromUrl(result.url);

      if (params.access_token && params.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });

        if (sessionError) {
          console.error('[GoogleSignInButton] Google session could not be restored.');
          throw sessionError;
        }

        router.replace(consumePendingRedirectTo() as any);
      } else {
        console.error('[GoogleSignInButton] Google sign-in callback was incomplete.');
      }
    } else {
      console.error('[GoogleSignInButton] Google sign-in did not complete.');
    }
  }

  useEffect(() => {
    WebBrowser.warmUpAsync();

    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  return (
    <Pressable onPress={() => void onSignInButtonPress()}>
      <Text>{t('auth.continueWithGoogle')}</Text>
    </Pressable>
  );
}

export default GoogleSignInButton;
