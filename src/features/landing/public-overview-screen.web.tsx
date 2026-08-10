import { MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { PublicCtaBand } from "./components/public-cta-band.web";
import { PublicFooter } from "./components/public-footer.web";
import { PublicHeader } from "./components/public-header.web";
import { PublicHeroHighlight } from "./components/public-hero-highlight.web";
import { usePublicBreakpoints } from "./hooks/use-public-breakpoints";
import type { PublicPageKey } from "./public-overview-screen";

// One explicit icon per card, in content order. Previously these pages
// cycled through a short icon list with `index % icons.length`, which
// meant pages with more cards than icons (News, About) ended up with
// icons landing on unrelated content. Each page's array here is sized
// to match its item count exactly, so every card gets an icon chosen
// for what it actually says.
type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

const pageIcons: Record<PublicPageKey, MaterialIconName[]> = {
  features: [
    "account-balance-wallet",
    "receipt-long",
    "swap-horiz",
    "event-repeat",
    "savings",
    "pie-chart",
    "groups",
    "backup",
  ],
  howItWorks: [
    "person-add",
    "account-balance",
    "category",
    "calendar-month",
    "insights",
    "group",
  ],
  about: ["visibility", "security", "groups", "devices", "insights", "tips-and-updates"],
};

const pageHighlightIcons: Record<PublicPageKey, MaterialIconName> = {
  features: "verified",
  howItWorks: "schedule",
  about: "lock",
};

export default function PublicOverviewScreen({
  page,
}: {
  page: PublicPageKey;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { phone } = usePublicBreakpoints();
  const items = t(`publicPages.${page}.items`, { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <PublicHeader />
      <View role="main">
        <ScrollView style={styles.main} contentContainerStyle={styles.content}>
          <View style={[styles.hero, phone && styles.heroPhone]}>
            <Link
              href="/"
              style={StyleSheet.flatten([
                styles.back,
                { color: colors.primary },
              ])}
            >
              ← {t("publicPages.backHome")}
            </Link>
            <Text style={[styles.kicker, { color: colors.primary }]}>
              {t(`publicPages.${page}.kicker`)}
            </Text>
            <Text
              accessibilityRole="header"
              aria-level={1}
              style={StyleSheet.flatten([
                styles.title,
                phone && styles.titlePhone,
                { color: colors.text },
              ])}
            >
              {t(`publicPages.${page}.title`)}
            </Text>
            <Text style={[styles.lead, { color: colors.textSecondary }]}>
              {t(`publicPages.${page}.description`)}
            </Text>
            <PublicHeroHighlight
              icon={pageHighlightIcons[page]}
              text={t(`publicPages.${page}.highlight`)}
            />
          </View>
          <View style={styles.grid}>
            {items.map((item, index) => (
              <View
                key={item.title}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[styles.icon, { backgroundColor: colors.primarySoft }]}
                >
                  <MaterialIcons
                    name={pageIcons[page][index] ?? "circle"}
                    color={colors.primary}
                    size={25}
                  />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text
                  style={[styles.cardBody, { color: colors.textSecondary }]}
                >
                  {item.description}
                </Text>
              </View>
            ))}
          </View>
          <PublicCtaBand
            title={t(`publicPages.${page}.cta.title`)}
            description={t(`publicPages.${page}.cta.description`)}
            action={t("publicPages.cta.action")}
          />
          <PublicFooter />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  main: { flex: 1 },
  content: { paddingBottom: 24 },
  hero: {
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 74,
    paddingBottom: 48,
    alignItems: "center",
  },
  heroPhone: { paddingTop: 50, paddingHorizontal: 16 },
  back: {
    alignSelf: "flex-start",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "none",
    marginBottom: 42,
  },
  kicker: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 50,
    lineHeight: 58,
    fontWeight: "800",
    letterSpacing: -1.2,
    textAlign: "center",
    marginTop: 12,
  },
  titlePhone: { fontSize: 38, lineHeight: 45 },
  lead: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center",
    maxWidth: 720,
    marginTop: 18,
  },
  grid: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingBottom: 80,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  card: {
    flexGrow: 1,
    flexBasis: 330,
    minHeight: 225,
    borderWidth: 1,
    borderRadius: 18,
    padding: 25,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 19, lineHeight: 25, fontWeight: "800", marginTop: 18 },
  cardBody: { fontSize: 14, lineHeight: 22, marginTop: 9 },
});
