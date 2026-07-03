import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import GoogleSignInButton from '@/features/auth/components/google-sign-in-button';
import { useI18n } from '@/shared/i18n';
import {
  colors,
  spacing,
  radius,
  globalStyles,
  border,
  shadows,
} from '@/shared/theme';

export default function LoginScreen() {
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[globalStyles.screen, globalStyles.centered]}>

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>💰</Text>
          </View>

          <Text style={globalStyles.screenTitle}>
            SmartFinance
          </Text>

          <Text style={[globalStyles.screenSubtitle, styles.subtitle]}>
            {t('auth.loginSubtitle')}
          </Text>
        </View>

        <View style={[globalStyles.card, styles.authCard]}>
          <Text style={globalStyles.sectionTitle}>
            {t('auth.loginTitle')}
          </Text>

          <Text style={[globalStyles.caption, styles.cardDescription]}>
            {t('auth.loginDescription')}
          </Text>

          <GoogleSignInButton />
        </View>

        <Text style={[globalStyles.caption, styles.footer]}>
          {t('auth.loginFooter')}
        </Text>

      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },

  logoContainer: {
    width: 110,
    height: 110,

    borderRadius: radius.lg,

    backgroundColor: colors.primary,

    borderWidth: border.thick,
    borderColor: colors.border,

    alignItems: 'center',
    justifyContent: 'center',

    ...shadows.lg,
  },

  logo: {
    fontSize: 52,
  },

  subtitle: {
    textAlign: 'center',
    maxWidth: 260,
  },

  authCard: {
    width: '100%',
    maxWidth: 420,

    alignItems: 'center',

    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },

  cardDescription: {
    textAlign: 'center',
    maxWidth: 280,
  },

  footer: {
    marginTop: spacing.xl,
    textAlign: 'center',
    opacity: 0.8,
    maxWidth: 320,
  },
});