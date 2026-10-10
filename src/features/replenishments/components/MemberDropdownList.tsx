import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/data-surface";
import { Card, Section } from "@/components/migrated-page";
import { SelectionShell, SelectionTrigger } from "@/components/selection-shell";
import { radius } from "@/theme/radius";
import { useResponsiveMetrics } from "@/theme/responsive";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

import { RowList, type GroupedRow, type MemberGroup } from "./MemberGroupedList";

/** How many selected names the closed trigger spells out before it falls
 * back to a "N selected" count, so the trigger stays one compact line. */
const MAX_NAMED_SELECTIONS = 2;

/**
 * Compact counterpart to `MemberGroupedList` for the wizard's account
 * selection steps: one dropdown trigger per member/"Shared" bucket (same
 * groups, same order -- built by the same `member-grouping.ts` helpers)
 * instead of every member's full list of rows rendered at once.
 *
 * - Opening a member's dropdown shows only that member's rows (accounts,
 *   and pots when `secondaryLabel` is set), via the app's standard
 *   SelectionShell picker.
 * - Tapping a row calls its own `onPress` and leaves the dropdown open, so
 *   several rows can be toggled in one go. Selection state is owned by the
 *   caller (it's derived from each row's `active`), so this component never
 *   keeps a draft copy -- every tap is applied immediately, exactly as it
 *   was with the flat list, and one member's dropdown can't affect another's.
 * - A row with `closesDropdown` closes the picker before running its
 *   `onPress` -- for rows that open a picker of their own (e.g. a saving pot
 *   backed by several accounts), since RN can't stack a second Modal on top
 *   of an open one reliably.
 * - With `showSelectedChips`, every active row is also listed under its
 *   member's trigger as a removable chip; tapping the chip's x calls the
 *   same `onPress` the row would, i.e. deselects it.
 */
export function MemberDropdownList({
  groups,
  primaryLabel,
  secondaryLabel,
  emptyLabel,
  emptyIcon = "people-outline",
  title,
  subtitle,
  showSelectedChips = true,
}: {
  groups: MemberGroup[];
  primaryLabel?: string;
  secondaryLabel?: string;
  emptyLabel: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  /** Header shown above the dropdowns, inside the same card. */
  title: string;
  subtitle?: string;
  showSelectedChips?: boolean;
}) {
  const { t } = useTranslation("common");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const nonEmptyGroups = groups.filter(
    (group) => group.primary.length > 0 || (group.secondary?.length ?? 0) > 0,
  );
  const openGroup = nonEmptyGroups.find((group) => group.key === openKey) ?? null;

  function wrapRows(rows: GroupedRow[]): GroupedRow[] {
    return rows.map((row) =>
      row.closesDropdown
        ? {
            ...row,
            onPress: () => {
              setOpenKey(null);
              row.onPress();
            },
          }
        : row,
    );
  }

  const placeholder = t("replenishments.memberDropdownPlaceholder");

  return (
    <Card>
      <Section title={title} subtitle={subtitle}>
      <View style={{ gap: spacing(3.5) }}>
        {nonEmptyGroups.length === 0 ? (
          <EmptyState title={emptyLabel} icon={emptyIcon} />
        ) : (
          nonEmptyGroups.map((group) => {
            const allRows = [...group.primary, ...(group.secondary ?? [])];
            const activeRows = allRows.filter((row) => row.active);
            const valueLabel =
              activeRows.length === 0
                ? placeholder
                : activeRows.length <= MAX_NAMED_SELECTIONS
                  ? activeRows.map((row) => row.title).join(", ")
                  : t("replenishments.memberDropdownCount", { count: activeRows.length });

            return (
              <View key={group.key} style={{ gap: spacing(2) }}>
                <SelectionTrigger
                  label={group.label}
                  valueLabel={valueLabel}
                  placeholder={placeholder}
                  hint={t("replenishments.memberDropdownAvailable", { count: allRows.length })}
                  iconName={activeRows.length > 0 ? "checkmark-circle" : "wallet-outline"}
                  onPress={() => setOpenKey(group.key)}
                />
                {showSelectedChips && activeRows.length > 0 ? (
                  <View style={styles.chipRow}>
                    {activeRows.map((row) => (
                      <RemovableChip
                        key={row.id}
                        label={row.title}
                        accessibilityLabel={t("replenishments.removeSelection", { name: row.title })}
                        onRemove={row.onPress}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>
      </Section>

      <SelectionShell
        visible={openGroup !== null}
        title={openGroup?.label ?? ""}
        subtitle={
          openGroup
            ? t("replenishments.memberDropdownCount", {
                count: [...openGroup.primary, ...(openGroup.secondary ?? [])].filter((row) => row.active).length,
              })
            : undefined
        }
        closeLabel={t("done")}
        onClose={() => setOpenKey(null)}
      >
        {openGroup ? (
          <View style={{ gap: spacing(4) }}>
            {openGroup.primary.length > 0 ? (
              <RowList label={secondaryLabel ? primaryLabel : undefined} rows={wrapRows(openGroup.primary)} />
            ) : null}
            {secondaryLabel && (openGroup.secondary?.length ?? 0) > 0 ? (
              <RowList label={secondaryLabel} rows={wrapRows(openGroup.secondary!)} />
            ) : null}
          </View>
        ) : null}
      </SelectionShell>
    </Card>
  );
}

function RemovableChip({
  label,
  accessibilityLabel,
  onRemove,
}: {
  label: string;
  accessibilityLabel: string;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();

  return (
    <Pressable
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          paddingLeft: responsive.isPhone ? spacing(2.25) : spacing(3),
          paddingRight: responsive.isPhone ? spacing(1.5) : spacing(2),
          paddingVertical: responsive.isPhone ? spacing(1.5) : spacing(2),
        },
        pressed && styles.pressed,
      ]}
    >
      <Text numberOfLines={1} style={[styles.chipText, { color: colors.primaryForeground }]}>
        {label}
      </Text>
      <Ionicons name="close-circle" size={16} color={colors.primaryForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    maxWidth: "100%",
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    flexShrink: 1,
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.85,
  },
});
