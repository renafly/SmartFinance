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

const featureIcons = [
  "account-balance-wallet",
  "insights",
  "savings",
  "groups",
] as const;
const updateIcons = ["auto-graph", "shield", "tips-and-updates"] as const;

function Brand() {
  const { colors } = useTheme();
  return (
    <View style={styles.brand}>
      <View style={[styles.logo, { backgroundColor: colors.primary }]}>
        <Text style={styles.logoText}>S</Text>
      </View>
      <Text style={[styles.brandText, { color: colors.text }]}>
        SmartFinance
      </Text>
    </View>
  );
}

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
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const phone = width < 600;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<View & { focus?: () => void }>(null);

  useEffect(() => {
    if (compact || !menuOpen) return;
    const frame = requestAnimationFrame(() => setMenuOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [compact, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus?.());
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  const navItems = [
    { key: "features", href: "/features" },
    { key: "howItWorks", href: "/how-it-works" },
    { key: "news", href: "/news" },
    { key: "about", href: "/about" },
  ] as const;
  const closeMenu = () => setMenuOpen(false);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View
        role="banner"
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={[styles.headerInner, phone && styles.headerInnerPhone]}>
          <Brand />
          {!compact ? (
            <View style={styles.desktopNav}>
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
          <View style={styles.headerActions}>
            {!compact ? <LanguageMenu /> : null}
            {!compact ? (
              <Cta href="/login" label={t("landing.nav.signIn")} secondary />
            ) : null}
            {!compact ? (
              <Cta href="/login" label={t("landing.nav.getStarted")} />
            ) : null}
            {compact ? (
              <Pressable
                ref={menuButtonRef}
                accessibilityLabel={
                  menuOpen
                    ? t("landing.nav.closeMenu")
                    : t("landing.nav.openMenu")
                }
                accessibilityRole="button"
                accessibilityState={{ expanded: menuOpen }}
                aria-expanded={menuOpen}
                onPress={() => setMenuOpen((value) => !value)}
                style={[
                  styles.menuButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <MaterialIcons
                  color={colors.text}
                  name={menuOpen ? "close" : "menu"}
                  size={25}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {compact && menuOpen ? (
        <>
          <Pressable
            accessibilityLabel={t("landing.nav.closeMenu")}
            onPress={closeMenu}
            style={styles.mobileBackdrop}
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
                onPress={closeMenu}
                style={StyleSheet.flatten([
                  styles.mobileLink,
                  { color: colors.text },
                ])}
              >
                {t(`landing.nav.${item.key}`)}
              </Link>
            ))}
            <View style={styles.mobileMenuFooter}>
              <LanguageMenu />
              <View style={styles.mobileMenuActions}>
                <Cta href="/login" label={t("landing.nav.signIn")} secondary />
                <Cta href="/login" label={t("landing.nav.getStarted")} />
              </View>
            </View>
          </View>
        </>
      ) : null}

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

        <View nativeID="features" style={styles.section}>
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
          nativeID="howItWorks"
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

        <View nativeID="news" style={styles.section}>
          <Text style={[styles.sectionKicker, { color: colors.primary }]}>
            {t("landing.news.kicker")}
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("landing.news.title")}
          </Text>
          <View style={styles.grid}>
            {updateIcons.map((icon, index) => (
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
                <MaterialIcons color={colors.primary} name={icon} size={27} />
                <Text style={[styles.newsMeta, { color: colors.primary }]}>
                  {t(`landing.news.items.${index}.category`)}
                </Text>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {t(`landing.news.items.${index}.title`)}
                </Text>
                <Text
                  style={[styles.cardBody, { color: colors.textSecondary }]}
                >
                  {t(`landing.news.items.${index}.description`)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          nativeID="about"
          style={[styles.finalCta, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.finalTitle}>{t("landing.final.title")}</Text>
          <Text style={styles.finalBody}>{t("landing.final.description")}</Text>
          <Cta href="/login" label={t("landing.final.action")} secondary />
        </View>
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Brand />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {t("landing.footer")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {
    height: 76,
    borderBottomWidth: 1,
    justifyContent: "center",
    zIndex: 30,
  },
  headerInner: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerInnerPhone: { paddingHorizontal: 16 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  brandText: { fontSize: 18, fontWeight: "800" },
  desktopNav: { flexDirection: "row", gap: 28, alignItems: "center" },
  navLink: { fontSize: 14, fontWeight: "600", textDecorationLine: "none" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileBackdrop: {
    position: "absolute",
    zIndex: 10,
    top: 76,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
  },
  mobileMenu: {
    position: "absolute",
    zIndex: 20,
    top: 76,
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    padding: 24,
    gap: 6,
  },
  mobileLink: {
    paddingVertical: 13,
    fontSize: 17,
    fontWeight: "700",
    textDecorationLine: "none",
  },
  mobileMenuFooter: {
    marginTop: 14,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
  },
  mobileMenuActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
  },
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
  footer: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  footerText: { fontSize: 13 },
  pressed: { opacity: 0.76 },
});
