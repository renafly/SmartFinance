import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { Field } from "@/components/migrated-page";
import { Badge } from "@/components/data-surface";

import type { ExplorerNode, ExplorerTree } from "../explorer-data";

type CategoryBrowserSidebarProps = {
  tree: ExplorerTree;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  matchedIds: Set<string> | null;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
};

// Left column of the category browser: a search field plus a nested
// type -> main category -> subcategory tree. Rows collapse/expand their
// children so a long category list stays scannable, and the whole column is
// meant to be given a fixed height by its parent (see categories.tsx) so it
// scrolls internally rather than growing taller than the detail panel next
// to it.
export function CategoryBrowserSidebar({
  tree,
  search,
  onSearchChange,
  selectedId,
  hoverId,
  onSelect,
  onHover,
  matchedIds,
  collapsedIds,
  onToggleCollapse,
}: CategoryBrowserSidebarProps) {
  const { t } = useTranslation("common");

  const typeNodes = tree.typeOrder
    .map((type) => tree.nodesById.get(`type-${type}`))
    .filter((node): node is ExplorerNode => !!node);

  return (
    <View style={{ flex: 1, gap: spacing(3) } as any}>
      <Field
        label={t("categories.browser.searchLabel")}
        value={search}
        onChangeText={onSearchChange}
        placeholder={t("categories.browser.searchPlaceholder")}
      />

      <ScrollView style={{ flex: 1 } as any} contentContainerStyle={{ gap: spacing(0.5), paddingBottom: spacing(4) } as any}>
        {typeNodes.map((typeNode) => (
          <BrowserTreeRow
            key={typeNode.id}
            node={typeNode}
            tree={tree}
            search={search}
            selectedId={selectedId}
            hoverId={hoverId}
            onSelect={onSelect}
            onHover={onHover}
            matchedIds={matchedIds}
            collapsedIds={collapsedIds}
            onToggleCollapse={onToggleCollapse}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function BrowserTreeRow({
  node,
  tree,
  search,
  selectedId,
  hoverId,
  onSelect,
  onHover,
  matchedIds,
  collapsedIds,
  onToggleCollapse,
}: {
  node: ExplorerNode;
  tree: ExplorerTree;
  search: string;
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  matchedIds: Set<string> | null;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const isSelected = node.id === selectedId;
  const isHovered = node.id === hoverId && !isSelected;
  const isSearching = !!search.trim();
  const isMatch = (!matchedIds || matchedIds.has(node.id)) && !node.isArchived;

  const children = node.childIds.map((id) => tree.nodesById.get(id)).filter((child): child is ExplorerNode => !!child);
  const hasChildren = children.length > 0;
  // While searching, always show every branch so a match is never hidden
  // behind a collapsed parent — collapse state only applies when browsing.
  const isExpanded = isSearching || !collapsedIds.has(node.id);

  const paddingLeft = node.depth * spacing(4);
  const labelWeight =
    node.depth === 0 ? typography.fontWeight.extraBold : node.depth === 1 ? typography.fontWeight.bold : typography.fontWeight.regular;
  const labelSize = node.depth === 0 ? typography.fontSize[14] : node.depth === 1 ? typography.fontSize[13] : typography.fontSize[12];
  const badgeTone = node.depth === 0 ? "neutral" : "primary";

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing(1),
          paddingLeft,
          paddingRight: spacing(2),
          marginTop: node.depth === 0 ? spacing(2) : spacing(0.5),
          borderRadius: radius.md,
          backgroundColor: isSelected ? colors.primarySoft : isHovered ? colors.surfaceMuted : "transparent",
          borderLeftWidth: 2,
          borderLeftColor: isSelected ? colors.primary : "transparent",
          opacity: node.isArchived ? 0.5 : isSearching && !isMatch ? 0.4 : 1,
        } as any}
      >
        {hasChildren ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isExpanded
                ? t("categories.browser.collapseGroup", { name: node.label })
                : t("categories.browser.expandGroup", { name: node.label })
            }
            onPress={() => onToggleCollapse(node.id)}
            hitSlop={8}
            style={({ pressed }) => [
              { width: spacing(6), height: spacing(7), alignItems: "center", justifyContent: "center" },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name={isExpanded ? "chevron-down-outline" : "chevron-forward-outline"} size={13} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <View style={{ width: spacing(6) } as any} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={node.label}
          accessibilityState={{ selected: isSelected }}
          onPress={() => onSelect(node.id)}
          onHoverIn={() => onHover(node.id)}
          onHoverOut={() => onHover(null)}
          style={({ pressed }) => [
            {
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: spacing(2),
              paddingVertical: spacing(1.5),
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(1.5), flex: 1, minWidth: 0 } as any}>
            <Ionicons name={node.icon} size={node.depth === 0 ? 15 : 13} color={isSelected ? colors.primary : node.color} />
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                color: isSelected ? colors.primary : colors.text,
                fontWeight: labelWeight,
                fontSize: labelSize,
              } as any}
            >
              {node.label}
            </Text>
          </View>
          {hasChildren ? <Badge label={String(children.length)} tone={badgeTone} /> : null}
        </Pressable>
      </View>
      {isExpanded && hasChildren
        ? children.map((child) => (
            <BrowserTreeRow
              key={child.id}
              node={child}
              tree={tree}
              search={search}
              selectedId={selectedId}
              hoverId={hoverId}
              onSelect={onSelect}
              onHover={onHover}
              matchedIds={matchedIds}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
            />
          ))
        : null}
    </View>
  );
}
