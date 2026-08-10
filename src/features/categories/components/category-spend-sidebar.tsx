import { Pressable as RNPressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { formatCurrency } from "@/components/migrated-page";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";

import type { CategorySpendNode } from "../network-data";

type CategorySpendSidebarProps = {
  nodes: CategorySpendNode[];
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
};

// Left column for the dashboard's spend network — a flat list (no tree,
// unlike the categories page explorer, since these are already just
// top-level expense categories with sub-spend rolled up), each row showing
// icon, name, transaction count, and total spent. Selecting or hovering a
// row drives the same selectedId/hoverId state as clicking a node in the 3D
// graph, so the two stay in sync in either direction.
export function CategorySpendSidebar({ nodes, selectedId, hoverId, onSelect, onHover }: CategorySpendSidebarProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);

  return (
    <ScrollView style={{ flex: 1 } as any} contentContainerStyle={{ gap: spacing(1), paddingBottom: spacing(2) } as any}>
      {nodes.map((node) => {
        const isSelected = node.id === selectedId;
        const isHovered = node.id === hoverId && !isSelected;

        return (
          <RNPressable
            key={node.id}
            accessibilityRole="button"
            accessibilityLabel={node.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(isSelected ? null : node.id)}
            onHoverIn={() => onHover(node.id)}
            onHoverOut={() => onHover(null)}
            style={({ pressed }: { pressed: boolean }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: spacing(2.5),
                padding: spacing(2),
                borderRadius: radius.md,
                backgroundColor: isSelected ? colors.primarySoft : isHovered ? colors.surfaceMuted : "transparent",
                borderLeftWidth: 2,
                borderLeftColor: isSelected ? colors.primary : "transparent",
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View
              style={{
                width: spacing(8.5),
                height: spacing(8.5),
                borderRadius: radius.full,
                backgroundColor: node.color,
                alignItems: "center",
                justifyContent: "center",
              } as any}
            >
              <Ionicons name={node.icon} size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, gap: spacing(0.25) } as any}>
              <Text numberOfLines={1} style={{ color: isSelected ? colors.primary : colors.text, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize[13] } as any}>
                {node.label}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
                {t("dashboard.categoryNetworkTransactions", { count: node.count })}
              </Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[13] } as any}>
              {displayCurrency(formatCurrency(node.value), hideValues)}
            </Text>
          </RNPressable>
        );
      })}
    </ScrollView>
  );
}
