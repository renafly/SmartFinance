import { MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { PublicFooter } from "./components/public-footer.web";
import { PublicHeader } from "./components/public-header.web";
import { newsPosts } from "./data/news-posts";
import { usePublicBreakpoints } from "./hooks/use-public-breakpoints";

const featureIcons = [
  "account-balance-wallet",
  "insights",
  "savings",
  "groups",
] as const;

function Cta({
  href,
  label,
  secondary = false,
}: {
  href: "/login";
  label: string;
  secondary?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable
        style={({ pressed }) =>
          StyleSheet.flatten([
            styles.cta,
            secondary
              ? { borderColor: colors.border, backgroundColor: colors.surface }
              : { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ])
        }
      >
        <Text
          style={[
            styles.ctaText,
            { color: secondary ? colors.text : colors.primaryForeground },
          ]}
        >
          {label}
        </Text>
        {!secondary ? (
          <MaterialIcons
            color={colors.primaryForeground}
            name="arrow-forward"
            size={18}
          />
        ) : null}
      </Pressable>
    </Link>
  );
}

export default function LandingScreen() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { compact, phone } = usePublicBreakpoints();
  const featuredPosts = newsPosts.slice(0, 3);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <PublicHeader />

      <ScrollView role="main" contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.hero,
            compact && styles.heroCompact,
            phone && styles.heroPhone,
          ]}
        >
          <View style={styles.heroCopy}>
            <View
              style={[styles.eyebrow, { backgroundColor: colors.primarySoft }]}
            >
              <MaterialIcons color={colors.primary} name="verified" size={16} />
              <Text style={[styles.eyebrowText, { color: colors.primary }]}>
                {t("landing.hero.eyebrow")}
              </Text>
            </View>
            <Text
              style={[
                styles.heroTitle,
                phone && styles.heroTitlePhone,
                { color: colors.text },
              ]}
            >
              {t("landing.hero.title")}
            </Text>
            <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
              {t("landing.hero.description")}
            </Text>
            <View style={styles.heroActions}>
              <Cta href="/login" label={t("landing.hero.primary")} />
              <Link
                href="/features"
                style={StyleSheet.flatten([
                  styles.textLink,
                  { color: colors.text },
                ])}
              >
                {t("landing.hero.secondary")} →
              </Link>
            </View>
            <View style={styles.trustRow}>
              <MaterialIcons color={colors.success} name="lock" size={17} />
              <Text style={[styles.trustText, { color: colors.textSecondary }]}>
                {t("landing.hero.trust")}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.preview,
              compact && styles.previewCompact,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.previewTop}>
              <View>
                <Text
                  style={[styles.previewLabel, { color: colors.textSecondary }]}
                >
                  {t("landing.preview.label")}
                </Text>
                <Text style={[styles.previewValue, { color: colors.text }]}>
                  €24,680.42
                </Text>
              </View>
              <View
                style={[
                  styles.growthBadge,
                  { backgroundColor: colors.financialPositiveSoft },
                ]}
              >
                <Text
                  style={[
                    styles.growthText,
                    { color: colors.financialPositive },
                  ]}
                >
                  +8.4%
                </Text>
              </View>
            </View>
            <View style={styles.chart}>
              {[38, 52, 45, 70, 63, 82, 96].map((height, index) => (
                <View
                  key={index}
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor:
                        index === 6 ? colors.primary : colors.primarySoft,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.previewStats}>
              <View>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  {t("landing.preview.income")}
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: colors.financialPositive },
                  ]}
                >
                  + €3,450
                </Text>
              </View>
              <View>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  {t("landing.preview.spending")}
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  €1,284
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionKicker, { color: colors.primary }]}>
            {t("landing.features.kicker")}
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("landing.features.title")}
          </Text>
          <Text style={[styles.sectionLead, { color: colors.textSecondary }]}>
            {t("landing.features.description")}
          </Text>
          <View style={styles.grid}>
            {featureIcons.map((icon, index) => (
              <View
                key={icon}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <MaterialIcons color={colors.primary} name={icon} size={24} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {t(`landing.features.items.${index}.title`)}
                </Text>
                <Text
                  style={[styles.cardBody, { color: colors.textSecondary }]}
                >
                  {t(`landing.features.items.${index}.description`)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.section,
            styles.softSection,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.sectionKicker, { color: colors.primary }]}>
            {t("landing.steps.kicker")}
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("landing.steps.title")}
          </Text>
          <View style={styles.steps}>
            {[0, 1, 2].map((index) => (
              <View key={index} style={styles.step}>
                <View
                  style={[
                    styles.stepNumber,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepCopy}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {t(`landing.steps.items.${index}.title`)}
                  </Text>
                  <Text
                    style={[styles.cardBody, { color: colors.textSecondary }]}
                  >
                    {t(`landing.steps.items.${index}.description`)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionKicker, { color: colors.primary }]}>
            {t("landing.news.kicker")}
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("landing.news.title")}
          </Text>
          <View style={styles.grid}>
            {featuredPosts.map((post) => (
              <Link key={post.slug} href={`/news/${post.slug}`} asChild>
                <Pressable
                  style={({ pressed }) =>
                    StyleSheet.flatten([
                      styles.card,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                      pressed && styles.pressed,
                    ])
                  }
                >
                  <MaterialIcons color={colors.primary} name={post.icon} size={27} />
                  <Text style={[styles.newsMeta, { color: colors.primary }]}>
                    {t(`publicPages.news.posts.${post.key}.meta`)}
                  </Text>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {t(`publicPages.news.posts.${post.key}.title`)}
                  </Text>
                  <Text
                    style={[styles.cardBody, { color: colors.textSecondary }]}
                  >
                    {t(`publicPages.news.posts.${post.key}.description`)}
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>

        <View style={[styles.finalCta, { backgroundColor: colors.primary }]}>
          <Text style={styles.finalTitle}>{t("landing.final.title")}</Text>
          <Text style={styles.finalBody}>{t("landing.final.description")}</Text>
          <Cta href="/login" label={t("landing.final.action")} secondary />
        </View>
        <PublicFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  hero: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 64,
  },
  heroCompact: { flexDirection: "column", alignItems: "stretch", gap: 44 },
  heroPhone: { paddingVertical: 56, paddingHorizontal: 16 },
  heroCopy: { flex: 1, minWidth: 280 },
  eyebrow: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  eyebrowText: { fontSize: 13, fontWeight: "700" },
  heroTitle: {
    fontSize: 54,
    lineHeight: 61,
    fontWeight: "800",
    letterSpacing: -1.6,
    marginTop: 20,
    maxWidth: 650,
  },
  heroTitlePhone: { fontSize: 39, lineHeight: 46 },
  heroBody: { fontSize: 18, lineHeight: 28, marginTop: 20, maxWidth: 610 },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 22,
    marginTop: 30,
  },
  cta: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 14, fontWeight: "700" },
  textLink: { fontSize: 15, fontWeight: "700", textDecorationLine: "none" },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 24,
  },
  trustText: { fontSize: 13 },
  preview: {
    flex: 0.8,
    minWidth: 300,
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: 24,
    padding: 26,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },
  previewCompact: { flex: 0, minWidth: 0, width: "100%", alignSelf: "center" },
  previewTop: { flexDirection: "row", justifyContent: "space-between" },
  previewLabel: { fontSize: 13, fontWeight: "600" },
  previewValue: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    marginTop: 4,
  },
  growthBadge: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  growthText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  chart: {
    height: 120,
    marginTop: 30,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  bar: { flex: 1, borderRadius: 6 },
  previewStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  section: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 78,
  },
  sectionKicker: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  sectionTitle: {
    textAlign: "center",
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "800",
    marginTop: 10,
  },
  sectionLead: {
    textAlign: "center",
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 650,
    alignSelf: "center",
    marginTop: 12,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 18, marginTop: 38 },
  card: {
    flexGrow: 1,
    flexBasis: 245,
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    minHeight: 205,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 18, lineHeight: 24, fontWeight: "700", marginTop: 18 },
  cardBody: { fontSize: 14, lineHeight: 22, marginTop: 8 },
  softSection: { maxWidth: 1132, borderRadius: 28, marginVertical: 26 },
  steps: { flexDirection: "row", flexWrap: "wrap", gap: 28, marginTop: 42 },
  step: { flex: 1, minWidth: 235, flexDirection: "row", gap: 14 },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { color: "#FFFFFF", fontWeight: "800" },
  stepCopy: { flex: 1 },
  newsMeta: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginTop: 18,
  },
  finalCta: {
    width: "auto",
    maxWidth: 1132,
    alignSelf: "center",
    marginHorizontal: 24,
    marginVertical: 50,
    borderRadius: 26,
    padding: 50,
    alignItems: "center",
  },
  finalTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "800",
  },
  finalBody: {
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 620,
    marginTop: 10,
    marginBottom: 24,
  },
  pressed: { opacity: 0.76 },
});
