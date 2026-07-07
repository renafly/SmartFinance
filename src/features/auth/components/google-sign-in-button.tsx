import { supabase } from '@/shared/lib/supabase/client';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';
import { AUTH_CALLBACK_ROUTE } from '../constants';

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

export function GoogleSignInButton() {
  const { t } = useTranslation('common');

  async function onSignInButtonPress() {
    const redirectTo = Linking.createURL(AUTH_CALLBACK_ROUTE);
    console.debug('[GoogleSignInButton] redirectTo:', redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'consent' },
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('[GoogleSignInButton] signInWithOAuth error:', error);
      throw error;
    }

    const googleOAuthUrl = data.url;
    console.debug('[GoogleSignInButton] oauth url:', googleOAuthUrl);

    if (!googleOAuthUrl) {
      throw new Error('No OAuth URL returned from Supabase.');
    }

    const result = await WebBrowser.openAuthSessionAsync(
      googleOAuthUrl,
      redirectTo,
      {
        showInRecents: true,
      },
    );
    console.debug('[GoogleSignInButton] auth session result:', result);

    if (result.type === 'success') {
      const params = extractParamsFromUrl(result.url);
      console.debug('[GoogleSignInButton] extracted params:', params);

      if (params.access_token && params.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        console.debug('[GoogleSignInButton] setSession result error:', sessionError);

        if (sessionError) {
          throw sessionError;
        }
      } else {
        console.error('[GoogleSignInButton] missing access_token or refresh_token in callback url');
      }
    } else {
      console.error('[GoogleSignInButton] auth session did not complete successfully');
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
