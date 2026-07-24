import { MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { LanguageMenu } from "./components/language-menu.web";
import type { PublicPageKey } from "./public-overview-screen";

const navItems = [
  { key: "features", href: "/features" },
  { key: "howItWorks", href: "/how-it-works" },
  { key: "news", href: "/news" },
  { key: "about", href: "/about" },
] as const;

const pageIcons = {
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
  news: ["auto-graph", "shield", "tips-and-updates"],
  about: ["visibility", "security", "groups", "devices"],
} as const;

function Brand() {
  const { colors } = useTheme();
  return (
    <Link href="/" asChild>
      <Pressable style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={[styles.brandText, { color: colors.text }]}>
          SmartFinance
        </Text>
      </Pressable>
    </Link>
  );
}

function Header() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const width = useWindowDimensions().width;
  const [layoutReady, setLayoutReady] = useState(false);
  const compact = layoutReady && width < 900;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View & { focus?: () => void }>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setLayoutReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (compact || !open) return;
    const frame = requestAnimationFrame(() => setOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [compact, open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus?.());
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      <View role="banner">
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerInner}>
            <Brand />
            {!compact ? (
              <View style={styles.nav}>
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    style={StyleSheet.flatten([
                      styles.navLink,
                      { color: colors.textSecondary },
                    ])}
                  >
                    {t(`landing.nav.${item.key}`)}
                  </Link>
                ))}
              </View>
            ) : null}
            <View style={styles.actions}>
              {!compact ? <LanguageMenu /> : null}
              {!compact ? (
                <Link
                  href="/login"
                  style={StyleSheet.flatten([
                    styles.signIn,
                    { color: colors.text },
                  ])}
                >
                  {t("landing.nav.signIn")}
                </Link>
              ) : null}
              {!compact ? (
                <Link href="/login" asChild>
                  <Pressable
                    style={StyleSheet.flatten([
                      styles.primaryButton,
                      { backgroundColor: colors.primary },
                    ])}
                  >
                    <Text
                      style={{
                        color: colors.primaryForeground,
                        fontWeight: "700",
                      }}
                    >
                      {t("landing.nav.getStarted")}
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
              {compact ? (
                <Pressable
                  ref={triggerRef}
                  accessibilityLabel={
                    open
                      ? t("landing.nav.closeMenu")
                      : t("landing.nav.openMenu")
                  }
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  aria-expanded={open}
                  onPress={() => setOpen((value) => !value)}
                  style={[styles.menuButton, { borderColor: colors.border }]}
                >
                  <MaterialIcons
                    color={colors.text}
                    name={open ? "close" : "menu"}
                    size={24}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </View>
      {compact && open ? (
        <>
          <Pressable
            accessibilityLabel={t("landing.nav.closeMenu")}
            onPress={() => setOpen(false)}
            style={styles.backdrop}
          />
          <View
            style={[
              styles.mobileMenu,
              {
                backgroundColor: colors.background,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onPress={() => setOpen(false)}
                style={StyleSheet.flatten([
                  styles.mobileLink,
                  { color: colors.text },
                ])}
              >
                {t(`landing.nav.${item.key}`)}
              </Link>
            ))}
            <View style={styles.mobileBottom}>
              <LanguageMenu />
              <Link
                href="/login"
                style={StyleSheet.flatten([
                  styles.signIn,
                  { color: colors.text },
                ])}
              >
                {t("landing.nav.signIn")}
              </Link>
              <Link href="/login" asChild>
                <Pressable
                  style={StyleSheet.flatten([
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                  ])}
                >
                  <Text
                    style={{
                      color: colors.primaryForeground,
                      fontWeight: "700",
                    }}
                  >
                    {t("landing.nav.getStarted")}
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </>
      ) : null}
    </>
  );
}

export default function PublicOverviewScreen({
  page,
}: {
  page: PublicPageKey;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const width = useWindowDimensions().width;
  const [layoutReady, setLayoutReady] = useState(false);
  const phone = layoutReady && width < 600;
  const items = t(`publicPages.${page}.items`, { returnObjects: true }) as {
    title: string;
    description: string;
    meta?: string;
  }[];

  useEffect(() => {
    const frame = requestAnimationFrame(() => setLayoutReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Header />
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
                    name={pageIcons[page][index % pageIcons[page].length]}
                    color={colors.primary}
                    size={25}
                  />
                </View>
                {item.meta ? (
                  <Text style={[styles.meta, { color: colors.primary }]}>
                    {item.meta}
                  </Text>
                ) : null}
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
          <View style={[styles.cta, { backgroundColor: colors.primary }]}>
            <Text style={styles.ctaTitle}>{t("publicPages.cta.title")}</Text>
            <Text style={styles.ctaBody}>
              {t("publicPages.cta.description")}
            </Text>
            <Link href="/login" asChild>
              <Pressable style={styles.ctaButton}>
                <Text style={{ color: colors.primary, fontWeight: "800" }}>
                  {t("publicPages.cta.action")}
                </Text>
              </Pressable>
            </Link>
          </View>
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Brand />
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              {t("landing.footer")}
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  main: { flex: 1 },
  header: {
    height: 76,
    borderBottomWidth: 1,
    justifyContent: "center",
    zIndex: 20,
  },
  headerInner: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontWeight: "800", fontSize: 20 },
  brandText: { fontWeight: "800", fontSize: 18 },
  nav: { flexDirection: "row", gap: 26 },
  navLink: { fontSize: 14, fontWeight: "600", textDecorationLine: "none" },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  signIn: { fontWeight: "700", textDecorationLine: "none" },
  primaryButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
  },
  menuButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    position: "absolute",
    zIndex: 10,
    top: 76,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,.25)",
  },
  mobileMenu: {
    position: "absolute",
    top: 76,
    left: 0,
    right: 0,
    zIndex: 15,
    padding: 22,
    borderBottomWidth: 1,
  },
  mobileLink: {
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: "700",
    textDecorationLine: "none",
  },
  mobileBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 12,
    paddingTop: 16,
  },
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
  meta: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginTop: 18,
  },
  cardTitle: { fontSize: 19, lineHeight: 25, fontWeight: "800", marginTop: 18 },
  cardBody: { fontSize: 14, lineHeight: 22, marginTop: 9 },
  cta: {
    width: "auto",
    maxWidth: 1132,
    alignSelf: "center",
    marginHorizontal: 24,
    borderRadius: 26,
    padding: 46,
    alignItems: "center",
  },
  ctaTitle: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    textAlign: "center",
  },
  ctaBody: {
    color: "rgba(255,255,255,.82)",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 9,
  },
  ctaButton: {
    backgroundColor: "#fff",
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
    marginTop: 24,
  },
  footer: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    marginTop: 64,
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 18,
  },
});
