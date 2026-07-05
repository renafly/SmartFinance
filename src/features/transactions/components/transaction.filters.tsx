import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors, spacing, typography, radius } from "@/shared/theme";
import type { Database } from "@/shared/types/database.types";

type TransactionType = Database["public"]["Enums"]["transaction_type"];
type DatePreset = "this_month" | "all_time" | "custom";

export type TransactionFilterState = {
  type: TransactionType | "all";
  datePreset: DatePreset;
  accountIds: string[];
  createdByIds: string[];
};

type Option = { id: string; label: string };

type Props = {
  value: TransactionFilterState;
  onChange: (value: TransactionFilterState) => void;
  accounts: Option[];
  members: Option[];
  onOpenAccountSheet: () => void;
  onOpenMemberSheet: () => void;
  onOpenCustomDate: () => void;
};

const TYPE_OPTIONS: { value: TransactionFilterState["type"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const DATE_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "this_month", label: "This Month" },
  { value: "all_time", label: "All Time" },
  { value: "custom", label: "Custom" },
];

export function TransactionFilters({
  value,
  onChange,
  accounts,
  members,
  onOpenAccountSheet,
  onOpenMemberSheet,
  onOpenCustomDate,
}: Props) {
  const { width } = useWindowDimensions();
  const mobile = width < 820;

  const accountLabel =
    value.accountIds.length === 0
      ? "Account"
      : value.accountIds.length === 1
      ? accounts.find((a) => a.id === value.accountIds[0])?.label ?? "Account"
      : `Account (${value.accountIds.length})`;

  const memberLabel =
    value.createdByIds.length === 0
      ? "Person"
      : value.createdByIds.length === 1
      ? members.find((m) => m.id === value.createdByIds[0])?.label ?? "Person"
      : `Person (${value.createdByIds.length})`;

  const content = (
    <>
      <Segment
        options={TYPE_OPTIONS}
        selected={value.type}
        onSelect={(type) => onChange({ ...value, type })}
      />

      <Segment
        options={DATE_OPTIONS}
        selected={value.datePreset}
        onSelect={(datePreset) => {
          if (datePreset === "custom") {
            onOpenCustomDate();
          }
          onChange({ ...value, datePreset });
        }}
      />

      <Chip
        label={accountLabel}
        active={value.accountIds.length > 0}
        onPress={onOpenAccountSheet}
      />

      <Chip
        label={memberLabel}
        active={value.createdByIds.length > 0}
        onPress={onOpenMemberSheet}
      />
    </>
  );

  if (mobile) {
    return <View style={styles.mobileContainer}>{content}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {content}
    </ScrollView>
  );
}

function Segment<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((option, index) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[
              styles.segmentItem,
              index > 0 && styles.segmentItemBorder,
              isSelected && styles.segmentItemActive,
            ]}
          >
            <Text
              style={[
                styles.segmentLabel,
                isSelected && styles.segmentLabelActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },

  mobileContainer: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },

  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },

  segmentItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  segmentItemBorder: {
    borderLeftWidth: 3,
    borderLeftColor: colors.text,
  },

  segmentItemActive: {
    backgroundColor: colors.text,
  },

  segmentLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "700",
  },

  segmentLabelActive: {
    color: colors.surface,
  },

  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  chipActive: {
    backgroundColor: colors.text,
  },

  chipLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "700",
  },

  chipLabelActive: {
    color: colors.surface,
  },
});