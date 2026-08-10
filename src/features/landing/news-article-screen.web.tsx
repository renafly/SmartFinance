import { Link, Redirect } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { PublicCtaBand } from "./components/public-cta-band.web";
import { PublicFooter } from "./components/public-footer.web";
import { PublicHeader } from "./components/public-header.web";
import { getNewsPostBySlug } from "./data/news-posts";
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

export default function NewsArticleScreen({ slug }: { slug?: string }) {
  const { t, i18n } = useTranslation("common");
  const { colors } = useTheme();
  const { phone } = usePublicBreakpoints();
  const locale = i18n.resolvedLanguage?.startsWith("pt") ? "pt-PT" : "en-GB";
  const post = getNewsPostBySlug(slug);

  // Unknown slug: send visitors back to the news list rather than
  // rendering an empty article shell.
  if (!post) return <Redirect href="/news" />;

  const body = t(`publicPages.news.posts.${post.key}.body`, {
    returnObjects: true,
  }) as string[];

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <PublicHeader />
      <View role="main">
        <ScrollView style={styles.main} contentContainerStyle={styles.content}>
          <View style={[styles.article, phone && styles.articlePhone]}>
            <Link
              href="/news"
              style={StyleSheet.flatten([styles.back, { color: colors.primary }])}
            >
              {t("publicPages.news.backToNews")}
            </Link>
            <Text style={[styles.meta, { color: colors.primary }]}>
              {t(`publicPages.news.posts.${post.key}.meta`)}
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
              {t(`publicPages.news.posts.${post.key}.title`)}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {t("publicPages.news.publishedOn", {
                date: formatPostDate(post.date, locale),
              })}
            </Text>
            <View style={styles.body}>
              {body.map((paragraph, index) => (
                <Text
                  key={index}
                  style={[styles.paragraph, { color: colors.textSecondary }]}
                >
                  {paragraph}
                </Text>
              ))}
            </View>
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
  article: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 74,
    paddingBottom: 64,
  },
  articlePhone: { paddingTop: 50, paddingHorizontal: 16 },
  back: {
    alignSelf: "flex-start",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "none",
    marginBottom: 42,
  },
  meta: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 12,
  },
  titlePhone: { fontSize: 30, lineHeight: 37 },
  date: { fontSize: 14, fontWeight: "600", marginTop: 14 },
  body: { marginTop: 30, gap: 18 },
  paragraph: { fontSize: 17, lineHeight: 28 },
});
