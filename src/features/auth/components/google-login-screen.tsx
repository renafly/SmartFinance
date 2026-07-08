import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import GoogleSignInButton from "./google-sign-in-button";
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

export function GoogleLoginScreen() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Text style={[styles.kicker, { color: colors.primary }]}>{t('auth.brand')}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.loginTitle')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.loginSubtitle')}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <GoogleSignInButton redirectTo={redirectTo} />
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{t('auth.loginDescription')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing(6),
    justifyContent: "center",
    gap: spacing(5),
  },
  hero: {
    gap: spacing(2),
  },
  kicker: {
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing[16],
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.bold,
  },
  title: {
    fontSize: typography.fontSize[34],
    lineHeight: typography.lineHeight[38],
    fontWeight: typography.fontWeight.extraBold,
  },
  subtitle: {
    fontSize: typography.fontSize[15],
    lineHeight: typography.lineHeight[22],
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing(5),
    gap: spacing(3.5),
    borderWidth: 1,
  },
  caption: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
});
