import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { SelectionShell, SelectionTrigger } from "@/components/selection-shell";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

// Shared category selector used everywhere a transaction/transfer category
// can be picked (transaction create/edit, list filters, bulk edit, transfer
// forms, recurring transactions). Renders main categories as
// expandable/collapsible groups with their subcategories nested underneath,
// so a single dropdown covers both levels of the data model instead of two
// stacked pickers. Pass whatever flat category list makes sense for the
// call site (already filtered by type, etc.) — this component only cares
// about `parent_id` to build the two-level grouping.
export type CategoryPickerCategory = {
  id: string;
  name: string;
  icon?: string | null;
  parent_id?: string | null;
  type?: string | null;
};

export type CategoryPickerProps = {
  label: string;
  placeholder: string;
  hint?: string;
  categories: CategoryPickerCategory[];
  selectedId?: string | null;
  onChange: (id: string | null) => void;
  // When provided, shows a leading "clear selection" row (e.g. "No
  // category" / "All categories") that calls onChange(null).
  clearLabel?: string;
  disabled?: boolean;
};

export function CategoryPicker({
  label,
  placeholder,
  hint,
  categories,
  selectedId,
  onChange,
  clearLabel,
  disabled,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // This component only ever shows two visual levels (main / sub), matching
  // the "select a main category or a subcategory" model transaction tagging
  // is built around. The categories-management screen's own picker allows
  // arbitrary nesting depth, though, so a category handed to this component
  // could in principle sit 3+ levels deep. Rather than only grouping by
  // *direct* parent (which would make anything past depth 1 vanish — its
  // parent is a sub-category, not a main one, and this component never
  // rendered a third level to find it in), every category is bucketed under
  // its top-most reachable ancestor within the list. For the common 2-level
  // case this produces the exact same grouping as before; for deeper data
  // it just means "everything under this main" flattens into one sub list
  // instead of silently disappearing.
  const { mainCategories, childrenByParent, categoriesById, rootIdByCategoryId } = useMemo(() => {
    const byId = new Map(categories.map((category) => [category.id, category]));

    function findRootId(category: CategoryPickerCategory): string {
      let current = category;
      const seen = new Set<string>();
      while (
        current.parent_id &&
        byId.has(current.parent_id) &&
        !seen.has(current.id)
      ) {
        seen.add(current.id);
        current = byId.get(current.parent_id)!;
      }
      return current.id;
    }

    const rootMap = new Map<string, string>();
    const childrenMap = new Map<string, CategoryPickerCategory[]>();
    const mains: CategoryPickerCategory[] = [];
    for (const category of categories) {
      const rootId = findRootId(category);
      rootMap.set(category.id, rootId);
      if (rootId === category.id) {
        mains.push(category);
      } else {
        const list = childrenMap.get(rootId) ?? [];
        list.push(category);
        childrenMap.set(rootId, list);
      }
    }
    return {
      mainCategories: mains,
      childrenByParent: childrenMap,
      categoriesById: byId,
      rootIdByCategoryId: rootMap,
    };
  }, [categories]);

  const selected = selectedId ? (categoriesById.get(selectedId) ?? null) : null;
  const selectedRootId = selectedId ? (rootIdByCategoryId.get(selectedId) ?? null) : null;
  const selectedRoot =
    selectedRootId && selectedRootId !== selectedId
      ? (categoriesById.get(selectedRootId) ?? null)
      : null;

  // Auto-expand the group containing the current selection every time the
  // picker opens, so reopening it never hides the active choice behind a
  // collapsed group. Doesn't reset expansions the user opened manually.
  useEffect(() => {
    if (!open) return;
    const groupId = selected && selectedRootId !== selected.id ? selectedRootId : null;
    if (!groupId) return;
    setExpandedIds((current) => {
      if (current.has(groupId)) return current;
      const next = new Set(current);
      next.add(groupId);
      return next;
    });
    // Only re-run when the modal transitions open, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const valueLabel = selected
    ? selectedRoot
      ? `${selectedRoot.name} · ${selected.name}`
      : selected.name
    : placeholder;

  return (
    <View style={{ gap: spacing(2) }}>
      <SelectionTrigger
        label={label}
        valueLabel={valueLabel}
        hint={hint}
        placeholder={placeholder}
        iconName="pricetag-outline"
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      <SelectionShell
        visible={open}
        title={label}
        subtitle={hint ?? placeholder}
        closeLabel={placeholder}
        onClose={() => setOpen(false)}
      >
        <View style={{ gap: spacing(2) }}>
          {clearLabel ? (
            <CategoryPickerRow
              title={clearLabel}
              iconName="close-circle-outline"
              active={!selectedId}
              depth={0}
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
            />
          ) : null}
          {mainCategories.map((main) => {
            const children = childrenByParent.get(main.id) ?? [];
            const isExpanded = expandedIds.has(main.id);
            return (
              <View key={main.id} style={{ gap: spacing(2) }}>
                <CategoryPickerRow
                  title={main.name}
                  iconName={(main.icon as keyof typeof Ionicons.glyphMap | null) ?? "pricetag-outline"}
                  active={selectedId === main.id}
                  depth={0}
                  expandable={children.length > 0}
                  expanded={isExpanded}
                  onToggleExpand={
                    children.length > 0 ? () => toggleExpanded(main.id) : undefined
                  }
                  onPress={() => {
                    onChange(main.id);
                    setOpen(false);
                  }}
                />
                {isExpanded
                  ? children.map((child) => (
                      <CategoryPickerRow
                        key={child.id}
                        title={child.name}
                        iconName={
                          (child.icon as keyof typeof Ionicons.glyphMap | null) ??
                          "pricetag-outline"
                        }
                        active={selectedId === child.id}
                        depth={1}
                        onPress={() => {
                          onChange(child.id);
                          setOpen(false);
                        }}
                      />
                    ))
                  : null}
              </View>
            );
          })}
        </View>
      </SelectionShell>
    </View>
  );
}

type CategoryPickerRowProps = {
  title: string;
  iconName: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  depth: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onPress: () => void;
};

// Indentation (via marginLeft scaled by depth) is the visual cue that
// distinguishes a subcategory row from a main category row, alongside the
// smaller icon/text size — matching the "clearly distinguish... for example
// through indentation" requirement. The expand/collapse chevron is a
// separate pressable from the row body so tapping it doesn't also select
// the main category.
function CategoryPickerRow({
  title,
  iconName,
  active,
  depth,
  expandable,
  expanded,
  onToggleExpand,
  onPress,
}: CategoryPickerRowProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing(2),
        marginLeft: depth * spacing(6),
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: !!active }}
        style={({ pressed }) => [
          {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(3),
            borderRadius: radius.lg,
            borderWidth: 1,
            padding: spacing(3),
            // A floor rather than a fixed height, so a name long enough to
            // wrap to a second line (see numberOfLines={2} below) still
            // grows the row instead of clipping — only pathologically long
            // names ever hit the numberOfLines cap.
            minHeight: spacing(9) + spacing(3) * 2,
            backgroundColor: active ? colors.primary : colors.surfaceMuted,
            borderColor: active ? colors.primary : colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons
          name={iconName}
          size={depth > 0 ? 15 : 18}
          color={active ? colors.primaryForeground : colors.textSecondary}
        />
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={{
            flex: 1,
            fontSize: typography.fontSize[depth > 0 ? 13 : 14],
            fontWeight: typography.fontWeight.bold,
            color: active ? colors.primaryForeground : colors.text,
          }}
        >
          {title}
        </Text>
        {active ? (
          <Ionicons
            name="checkmark"
            size={16}
            color={active ? colors.primaryForeground : colors.textSecondary}
          />
        ) : null}
      </Pressable>
      {expandable ? (
        <Pressable
          onPress={onToggleExpand}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ expanded: !!expanded }}
          style={({ pressed }) => [
            {
              width: spacing(9),
              height: spacing(9),
              borderRadius: radius.lg,
              borderWidth: 1,
              alignItems: "center",
              justifyContent: "center",
              borderColor: colors.border,
              backgroundColor: colors.surfaceMuted,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons
            name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>
      ) : (
        <View style={{ width: spacing(9) }} />
      )}
    </View>
  );
}
