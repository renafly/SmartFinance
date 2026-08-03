import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useCookieConsent } from "@/features/cookie-consent/core";
import { useTheme } from "@/theme/ThemeProvider";

export default function CookiePolicyPage() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { openPreferences } = useCookieConsent();
  const rows = t("cookiePolicy.storage.rows", {
    returnObjects: true,
  }) as {
    name: string;
    type: string;
    purpose: string;
    duration: string;
    category: string;
  }[];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.page}
    >
      <View role="main" style={styles.content}>
        <Link href="/" style={[styles.back, { color: colors.link }]}>
          {t("cookiePolicy.back")}
        </Link>
        <Text
          accessibilityRole="header"
          aria-level={1}
          style={[styles.title, { color: colors.text }]}
        >
          {t("cookiePolicy.title")}
        </Text>
        <Text style={[styles.effective, { color: colors.textSecondary }]}>
          {t("cookiePolicy.effective")}
        </Text>
        <PolicySection title={t("cookiePolicy.scope.title")}>
          {t("cookiePolicy.scope.body")}
        </PolicySection>
        <PolicySection title={t("cookiePolicy.necessary.title")}>
          {t("cookiePolicy.necessary.body")}
        </PolicySection>
        <PolicySection title={t("cookiePolicy.optional.title")}>
          {t("cookiePolicy.optional.body")}
        </PolicySection>
        <Text
          accessibilityRole="header"
          aria-level={2}
          style={[styles.heading, { color: colors.text }]}
        >
          {t("cookiePolicy.storage.title")}
        </Text>
        <View style={styles.cards}>
          {rows.map((row) => (
            <View
              key={row.name}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {row.name}
              </Text>
              <PolicyFact
                label={t("cookiePolicy.storage.type")}
                value={row.type}
              />
              <PolicyFact
                label={t("cookiePolicy.storage.purpose")}
                value={row.purpose}
              />
              <PolicyFact
                label={t("cookiePolicy.storage.duration")}
                value={row.duration}
              />
              <PolicyFact
                label={t("cookiePolicy.storage.category")}
                value={row.category}
              />
            </View>
          ))}
        </View>
        <PolicySection title={t("cookiePolicy.control.title")}>
          {t("cookiePolicy.control.body")}
        </PolicySection>
        <Pressable
          accessibilityRole="button"
          onPress={openPreferences}
          style={[styles.manageButton, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: colors.primaryForeground, fontWeight: "800" }}>
            {t("cookiePolicy.control.action")}
          </Text>
        </Pressable>
        <PolicySection title={t("cookiePolicy.thirdParties.title")}>
          {t("cookiePolicy.thirdParties.body")}
        </PolicySection>
        <PolicySection title={t("cookiePolicy.changes.title")}>
          {t("cookiePolicy.changes.body")}
        </PolicySection>
      </View>
    </ScrollView>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.heading, { color: colors.text }]}
      >
        {title}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {children}
      </Text>
    </View>
  );
}

function PolicyFact({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.fact, { color: colors.textSecondary }]}>
      <Text style={{ color: colors.text, fontWeight: "700" }}>{label}: </Text>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingVertical: 54 },
  content: { width: "100%", maxWidth: 900, alignSelf: "center" },
  back: {
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "none",
    marginBottom: 34,
  },
  title: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  effective: { fontSize: 14, marginTop: 10, marginBottom: 36 },
  section: { marginBottom: 30 },
  heading: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "800",
    marginBottom: 10,
  },
  body: { fontSize: 16, lineHeight: 25 },
  cards: { gap: 12, marginBottom: 34 },
  card: { borderWidth: 1, borderRadius: 14, padding: 18 },
  cardTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
    marginBottom: 8,
  },
  fact: { fontSize: 14, lineHeight: 21, marginTop: 3 },
  manageButton: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 17,
    borderRadius: 11,
    marginTop: -14,
    marginBottom: 34,
  },
});
