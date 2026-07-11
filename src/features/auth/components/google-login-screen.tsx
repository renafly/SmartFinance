import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, Text, View } from "react-native";
import GoogleSignInButton from "./google-sign-in-button";

export function GoogleLoginScreen() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Decorative glow */}
      <LinearGradient
        colors={[colors.primary + "26", colors.primary + "00"]}
        style={styles.glow}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.primary, colors.primary + "99"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>{t("auth.brand").charAt(0)}</Text>
          </LinearGradient>

          <Text style={[styles.kicker, { color: colors.primary }]}>
            {t("auth.brand")}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("auth.loginTitle")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("auth.loginSubtitle")}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.primary,
            },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            {t("auth.continueWith")}
          </Text>
          <GoogleSignInButton redirectTo={redirectTo} />
          <Text style={[styles.caption, { color: colors.textSecondary }]}>
            {t("auth.loginDescription")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: spacing(6),
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -180,
    left: -100,
    width: 480,
    height: 480,
    borderRadius: 240,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    gap: spacing(8),
  },
  hero: {
    gap: spacing(2.5),
    alignItems: "flex-start",
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(1),
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: typography.fontSize[22],
    fontWeight: typography.fontWeight.extraBold,
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
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: typography.fontSize[15],
    lineHeight: typography.lineHeight[22],
    maxWidth: 320,
  },
  card: {
    borderRadius: radius.xl * 1.15,
    padding: spacing(6),
    gap: spacing(4),
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
      },
      android: { elevation: 4 },
    }),
  },
  cardLabel: {
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing[16] ?? 1,
    textAlign: "center",
  },
  caption: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
    textAlign: "center",
    paddingHorizontal: spacing(2),
  },
});
