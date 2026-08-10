import { MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { PublicCtaBand } from "./components/public-cta-band.web";
import { PublicFooter } from "./components/public-footer.web";
import { PublicHeader } from "./components/public-header.web";
import { PublicHeroHighlight } from "./components/public-hero-highlight.web";
import { newsPosts } from "./data/news-posts";
import { usePublicBreakpoints } from "./hooks/use-public-breakpoints";

function formatPostDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * News, as an actual updates list: dated entries, each linking to its
 * own full article at /news/[slug]. Previously News reused the same
 * generic feature-grid template as Features/How It Works/About with no
 * dates or way to open a single story.
 */
export default function NewsListScreen() {
  const { t, i18n } = useTranslation("common");
  const { colors } = useTheme();
  const { phone } = usePublicBreakpoints();
  const locale = i18n.resolvedLanguage?.startsWith("pt") ? "pt-PT" : "en-GB";

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <PublicHeader />
      <View role="main">
        <ScrollView style={styles.main} contentContainerStyle={styles.content}>
          <View style={[styles.hero, phone && styles.heroPhone]}>
            <Link
              href="/"
              style={StyleSheet.flatten([styles.back, { color: colors.primary }])}
            >
              ← {t("publicPages.backHome")}
            </Link>
            <Text style={[styles.kicker, { color: colors.primary }]}>
              {t("publicPages.news.kicker")}
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
              {t("publicPages.news.title")}
            </Text>
            <Text style={[styles.lead, { color: colors.textSecondary }]}>
              {t("publicPages.news.description")}
            </Text>
            <PublicHeroHighlight
              icon="event"
              text={t("publicPages.news.highlight", { count: newsPosts.length })}
            />
          </View>

          <View style={styles.list}>
            {newsPosts.map((post) => (
              <Link key={post.slug} href={`/news/${post.slug}`} asChild>
                <Pressable
                  style={({ pressed }) =>
                    StyleSheet.flatten([
                      styles.card,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && styles.cardPressed,
                    ])
                  }
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[styles.icon, { backgroundColor: colors.primarySoft }]}
                    >
                      <MaterialIcons
                        name={post.icon}
                        color={colors.primary}
                        size={22}
                      />
                    </View>
                    <Text style={[styles.date, { color: colors.textSecondary }]}>
                      {formatPostDate(post.date, locale)}
                    </Text>
                  </View>
                  <Text style={[styles.meta, { color: colors.primary }]}>
                    {t(`publicPages.news.posts.${post.key}.meta`)}
                  </Text>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {t(`publicPages.news.posts.${post.key}.title`)}
                  </Text>
                  <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                    {t(`publicPages.news.posts.${post.key}.description`)}
                  </Text>
                  <Text style={[styles.readMore, { color: colors.primary }]}>
                    {t("publicPages.news.readMore")} →
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>

          <PublicCtaBand
            title={t("publicPages.news.cta.title")}
            description={t("publicPages.news.cta.description")}
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
  list: {
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingBottom: 80,
    gap: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 25,
  },
  cardPressed: { opacity: 0.85 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  date: { fontSize: 13, fontWeight: "600" },
  meta: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginTop: 18,
  },
  cardTitle: { fontSize: 19, lineHeight: 25, fontWeight: "800", marginTop: 10 },
  cardBody: { fontSize: 14, lineHeight: 22, marginTop: 9 },
  readMore: { fontSize: 14, fontWeight: "800", marginTop: 16 },
});
