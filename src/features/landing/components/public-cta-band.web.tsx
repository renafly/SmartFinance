import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

/**
 * Shared closing CTA band used on Features/How It Works/News/About.
 * The button and primary conversion path (/login) are identical
 * everywhere, but title/description are supplied per page so a visitor
 * reading through all four pages doesn't see the exact same pitch four
 * times in a row.
 */
export function PublicCtaBand({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.cta, { backgroundColor: colors.primary }]}>
      <Text style={styles.ctaTitle}>{title}</Text>
      <Text style={styles.ctaBody}>{description}</Text>
      <Link href="/login" asChild>
        <Pressable style={styles.ctaButton}>
          <Text style={{ color: colors.primary, fontWeight: "800" }}>
            {action}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
