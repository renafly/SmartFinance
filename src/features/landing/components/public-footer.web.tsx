import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { PublicBrand } from "./public-header.web";

/**
 * Shared footer for every public marketing page. Always includes a link
 * to the Cookie Policy page, which previously had no path back to it
 * once the cookie-consent banner was dismissed.
 */
export function PublicFooter() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();

  return (
    <View style={[styles.footer, { borderTopColor: colors.border }]}>
      <PublicBrand />
      <View style={styles.footerRight}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {t("landing.footer")}
        </Text>
        <Link
          href="/cookie-policy"
          style={StyleSheet.flatten([
            styles.footerLink,
            { color: colors.textSecondary },
          ])}
        >
          {t("landing.footerCookiePolicy")}
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    flexWrap: "wrap",
    gap: 18,
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 18,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
