import { MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { usePublicBreakpoints } from "../hooks/use-public-breakpoints";
import { LanguageMenu } from "./language-menu.web";

const navItems = [
  { key: "features", href: "/features" },
  { key: "howItWorks", href: "/how-it-works" },
  { key: "news", href: "/news" },
  { key: "about", href: "/about" },
] as const;

const HEADER_HEIGHT = 76;

export function PublicBrand() {
  const { colors } = useTheme();
  return (
    <Link href="/" asChild>
      <Pressable accessibilityRole="link" style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={[styles.brandText, { color: colors.text }]}>
          Kintally
        </Text>
      </Pressable>
    </Link>
  );
}

// Single, shared CTA button used by every public page's header (desktop
// and mobile). Home and the Features/How It Works/News/About headers
// used to implement this separately, which let "Sign in" drift from a
// full button on Home into a bare text link everywhere else, and let
// button height/padding drift slightly too. There is now exactly one
// place that decides what these buttons look like.
function HeaderCta({
  href,
  label,
  secondary = false,
  showIcon = false,
}: {
  href: "/login";
  label: string;
  secondary?: boolean;
  showIcon?: boolean;
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
              : { borderColor: "transparent", backgroundColor: colors.primary },
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
        {showIcon ? (
          <MaterialIcons
            color={colors.primaryForeground}
            name="arrow-forward"
            size={16}
          />
        ) : null}
      </Pressable>
    </Link>
  );
}

/**
 * Shared header for every public marketing page (Home, Features, How It
 * Works, News, About). Renders identically everywhere: same nav items,
 * same language menu, same Sign in / Get started treatment, same mobile
 * hamburger behavior (scroll lock, Escape-to-close, focus restore).
 */
export function PublicHeader() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { compact } = usePublicBreakpoints();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View & { focus?: () => void }>(null);

  useEffect(() => {
    if (compact || !open) return undefined;
    const frame = requestAnimationFrame(() => setOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [compact, open]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    if (!open) {
      document.body.style.overflow = "";
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus?.());
      }
    };
    document.addEventListener("keydown", close);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <View
        role="banner"
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerInner}>
          <PublicBrand />
          {!compact ? (
            <View role="navigation" style={styles.nav}>
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
              <HeaderCta href="/login" label={t("landing.nav.signIn")} secondary />
            ) : null}
            {!compact ? (
              <HeaderCta href="/login" label={t("landing.nav.getStarted")} showIcon />
            ) : null}
            {compact ? (
              <Pressable
                ref={triggerRef}
                accessibilityLabel={
                  open ? t("landing.nav.closeMenu") : t("landing.nav.openMenu")
                }
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                aria-expanded={open}
                onPress={() => setOpen((value) => !value)}
                style={[
                  styles.menuButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
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

      {compact && open ? (
        <>
          <Pressable
            accessibilityLabel={t("landing.nav.closeMenu")}
            onPress={closeMenu}
            style={styles.backdrop}
          />
          <View
            style={[
              styles.mobileMenu,
              { backgroundColor: colors.background, borderBottomColor: colors.border },
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
            <View style={styles.mobileBottom}>
              <LanguageMenu />
              <View style={styles.mobileActions}>
                <HeaderCta href="/login" label={t("landing.nav.signIn")} secondary />
                <HeaderCta href="/login" label={t("landing.nav.getStarted")} showIcon />
              </View>
            </View>
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    borderBottomWidth: 1,
    justifyContent: "center",
    zIndex: 30,
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
  nav: { flexDirection: "row", gap: 26, alignItems: "center" },
  navLink: { fontSize: 14, fontWeight: "600", textDecorationLine: "none" },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  cta: {
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.76 },
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
    zIndex: 20,
    top: HEADER_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,.25)",
  },
  mobileMenu: {
    position: "absolute",
    top: HEADER_HEIGHT,
    left: 0,
    right: 0,
    zIndex: 25,
    padding: 22,
    borderBottomWidth: 1,
    gap: 6,
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
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mobileActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
  },
});
