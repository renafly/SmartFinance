import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

/**
 * Small pill shown under the lead paragraph on Features/How It
 * Works/News/About, giving each sub-page one lightweight,
 * page-specific point of interest instead of always being just
 * kicker -> title -> lead -> card grid.
 */
export function PublicHeroHighlight({
  icon,
  text,
}: {
  icon: MaterialIconName;
  text: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.primarySoft }]}>
      <MaterialIcons color={colors.primary} name={icon} size={16} />
      <Text style={[styles.text, { color: colors.primary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 22,
  },
  text: { fontSize: 13, fontWeight: "700" },
});
