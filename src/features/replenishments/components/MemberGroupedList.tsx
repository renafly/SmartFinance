import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/data-surface";
import { Card, Section } from "@/components/migrated-page";
import { SelectionOptionRow } from "@/components/selection-shell";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

export type GroupedRow = {
  id: string;
  title: string;
  subtitle?: string;
  rightLabel?: string;
  active?: boolean;
  danger?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export type MemberGroup = {
  key: string;
  label: string;
  /** The list's only rows when `secondaryLabel` is omitted (e.g. a flat
   * transactions list); the "accounts" half of an accounts+pots list
   * otherwise. */
  primary: GroupedRow[];
  secondary?: GroupedRow[];
};

/**
 * Renders a list already split into per-member groups (see
 * `member-grouping.ts`) as one Card per member/"Shared" bucket. Shared by
 * every step of the replenishment wizard that needs to show accounts,
 * pots, or transactions broken down by who they belong to, so the grouping
 * behaves and looks identical everywhere it appears.
 *
 * Pass `secondaryLabel` (e.g. "Saving pots") to render `primary`/`secondary`
 * as two labeled sub-lists within each member's card -- used by the
 * accounts-to-replenish and sources steps, which need accounts and pots
 * kept visually distinct within the same member section. Omit it for a
 * single homogeneous list (e.g. a member's transactions) and only
 * `primary` is used, with no sub-heading.
 */
export function MemberGroupedList({
  groups,
  primaryLabel,
  secondaryLabel,
  emptyLabel,
  emptyIcon = "people-outline",
}: {
  groups: MemberGroup[];
  primaryLabel?: string;
  secondaryLabel?: string;
  emptyLabel: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
}) {
  const nonEmptyGroups = groups.filter(
    (group) => group.primary.length > 0 || (group.secondary?.length ?? 0) > 0,
  );

  if (nonEmptyGroups.length === 0) {
    return (
      <Card>
        <EmptyState title={emptyLabel} icon={emptyIcon} />
      </Card>
    );
  }

  return (
    <>
      {nonEmptyGroups.map((group) => (
        <Card key={group.key}>
          <Section title={group.label}>
            <View style={{ gap: spacing(4) }}>
              {group.primary.length > 0 ? (
                <RowList label={secondaryLabel ? primaryLabel : undefined} rows={group.primary} />
              ) : null}
              {secondaryLabel && (group.secondary?.length ?? 0) > 0 ? (
                <RowList label={secondaryLabel} rows={group.secondary!} />
              ) : null}
            </View>
          </Section>
        </Card>
      ))}
    </>
  );
}

function RowList({ label, rows }: { label?: string; rows: GroupedRow[] }) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing(2) }}>
      {label ? (
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
      {rows.map((row) => (
        <SelectionOptionRow
          key={row.id}
          title={row.title}
          subtitle={row.subtitle}
          rightLabel={row.rightLabel}
          active={row.active}
          danger={row.danger}
          iconName={row.iconName}
          onPress={row.onPress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  subheading: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold as any,
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing[10],
  },
});
