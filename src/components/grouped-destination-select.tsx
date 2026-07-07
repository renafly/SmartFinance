import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type MemberLike = {
  userId: string;
  fullName: string | null;
  email: string | null;
};

type AccountLike = {
  id: string;
  name: string;
  type: string;
  current_balance?: number | null;
  balance?: number | null;
  owner_profile_id: string | null;
};

type SavingPotLike = {
  id: string;
  name: string;
  target_amount?: number | null;
  balance?: number | null;
  selected_account_count?: number | null;
};

export type DestinationSelection =
  | { kind: "account"; id: string }
  | { kind: "pot"; id: string };

type GroupedDestinationSelectProps = {
  label: string;
  accounts: AccountLike[];
  pots: SavingPotLike[];
  members: MemberLike[];
  value: DestinationSelection | null;
  placeholder: string;
  onChange: (selection: DestinationSelection) => void;
  hint?: string;
  allowedTypes?: string[];
  allowedAccountIds?: string[];
  groupBy?: "member" | "type";
  sharedLabel?: string;
  unassignedLabel?: string;
  closeLabel?: string;
  typeLabels?: Record<string, string>;
  potGroupLabel?: string;
};

function getMemberLabel(member?: MemberLike | null, fallback = "") {
  if (!member) return fallback;
  return member.fullName?.trim() || member.email || fallback;
}

function getAccountLabel(account: AccountLike) {
  const balance = Number(account.current_balance ?? account.balance ?? 0).toFixed(2);
  return `${account.name} · ${account.type} · €${balance}`;
}

export function GroupedDestinationSelect({
  label,
  accounts,
  pots,
  members,
  value,
  placeholder,
  onChange,
  hint,
  allowedTypes,
  allowedAccountIds,
  groupBy = "member",
  sharedLabel = "",
  unassignedLabel = "",
  closeLabel = "",
  typeLabels = {},
  potGroupLabel = "",
}: GroupedDestinationSelectProps) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();

  const selectedLabel = useMemo(() => {
    if (!value) return placeholder;
    if (value.kind === "pot") {
      return pots.find((item) => item.id === value.id)?.name ?? placeholder;
    }

    const account = accounts.find((item) => item.id === value.id);
    return account ? getAccountLabel(account) : placeholder;
  }, [accounts, placeholder, pots, value]);

  const memberMap = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);
  const groupedAccounts = useMemo(() => {
    const buckets = new Map<string, { title: string; accounts: AccountLike[] }>();

    for (const account of accounts) {
      if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(account.type)) continue;
      if (allowedAccountIds && allowedAccountIds.length > 0 && !allowedAccountIds.includes(account.id)) continue;

      const key = groupBy === "type" ? account.type : account.owner_profile_id ?? "__shared__";
      const title =
        groupBy === "type"
          ? typeLabels[account.type] ?? account.type
          : account.owner_profile_id
            ? getMemberLabel(memberMap.get(account.owner_profile_id), unassignedLabel)
            : sharedLabel;

      const existing = buckets.get(key);
      if (existing) {
        existing.accounts.push(account);
      } else {
        buckets.set(key, { title, accounts: [account] });
      }
    }

    return [...buckets.values()].map((group) => ({
      ...group,
      accounts: [...group.accounts].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [accounts, allowedAccountIds, allowedTypes, groupBy, memberMap, sharedLabel, typeLabels, unassignedLabel]);

  const activeSelection = value ? `${value.kind}:${value.id}` : "";

  return (
    <View style={styles.wrapper as any}>
      <Text style={[styles.label, { color: colors.textSecondary }] as any}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.selector,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          pressed && styles.pressed,
        ] as any}
      >
        <Ionicons name="swap-horizontal-outline" size={16} color={colors.textSecondary} />
        <View style={{ flex: 1, gap: spacing(1) } as any}>
          <Text style={[styles.value, { color: colors.text }] as any}>{selectedLabel}</Text>
          {hint ? <Text style={[styles.hint, { color: colors.textSecondary }] as any}>{hint}</Text> : null}
        </View>
        <Text style={[styles.chevron, { color: colors.link }] as any}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }] as any}>
          <Pressable style={StyleSheet.absoluteFill as any} onPress={() => setOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }] as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
              <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }] as any}>{label}</Text>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }] as any}>{hint ?? placeholder}</Text>
            <View style={{ gap: spacing(3) } as any}>
              {groupedAccounts.map((group) => (
                <View key={group.title} style={{ gap: spacing(2) } as any}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                    <Ionicons name="layers-outline" size={14} color={colors.primary} />
                    <Text style={[styles.groupTitle, { color: colors.primary }] as any}>{group.title}</Text>
                  </View>
                  <View style={{ gap: spacing(2) } as any}>
                    {group.accounts.map((account) => {
                      const selectionKey = `account:${account.id}`;
                      const active = selectionKey === activeSelection;
                      return (
                        <Pressable
                          key={account.id}
                          onPress={() => {
                            onChange({ kind: "account", id: account.id });
                            setOpen(false);
                          }}
                          style={({ pressed }) => [
                            styles.option,
                            {
                              backgroundColor: active ? colors.primary : colors.surfaceMuted,
                              borderColor: active ? colors.primary : colors.border,
                            },
                            pressed && styles.pressed,
                          ] as any}
                        >
                          <Ionicons
                            name="business-outline"
                            size={18}
                            color={active ? colors.primaryForeground : colors.textSecondary}
                          />
                          <View style={{ flex: 1, gap: spacing(1) } as any}>
                            <Text style={[styles.optionTitle, { color: active ? colors.primaryForeground : colors.text }] as any}>
                              {account.name}
                            </Text>
                            <Text style={[styles.optionSubtitle, { color: active ? colors.primaryForeground : colors.textSecondary }] as any}>
                              {account.type} · €{Number(account.current_balance ?? account.balance ?? 0).toFixed(2)}
                            </Text>
                          </View>
                          <Text style={[styles.check, { color: active ? colors.primaryForeground : colors.textSecondary }] as any}>
                            {active ? "✓" : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              {pots.length > 0 ? (
                <View style={{ gap: spacing(2) } as any}>
                  <Text style={[styles.groupTitle, { color: colors.primary }] as any}>{potGroupLabel}</Text>
                  <View style={{ gap: spacing(2) } as any}>
                    {pots.map((pot) => {
                      const selectionKey = `pot:${pot.id}`;
                      const active = selectionKey === activeSelection;
                      const target = pot.target_amount ?? 0;
                      const balance = pot.balance ?? 0;
                      const hasTarget = Number(target) > 0;
                      const summary = hasTarget
                        ? `€${balance.toFixed(2)} / €${Number(target).toFixed(2)}`
                        : `€${balance.toFixed(2)}`;

                      return (
                        <Pressable
                          key={pot.id}
                          onPress={() => {
                            onChange({ kind: "pot", id: pot.id });
                            setOpen(false);
                          }}
                          style={({ pressed }) => [
                            styles.option,
                            {
                              backgroundColor: active ? colors.primary : colors.surfaceMuted,
                              borderColor: active ? colors.primary : colors.border,
                            },
                            pressed && styles.pressed,
                          ] as any}
                        >
                          <Ionicons
                            name="briefcase-outline"
                            size={18}
                            color={active ? colors.primaryForeground : colors.textSecondary}
                          />
                          <View style={{ flex: 1, gap: spacing(1) } as any}>
                            <Text style={[styles.optionTitle, { color: active ? colors.primaryForeground : colors.text }] as any}>
                              {pot.name}
                            </Text>
                            <Text style={[styles.optionSubtitle, { color: active ? colors.primaryForeground : colors.textSecondary }] as any}>
                              {summary}
                              {typeof pot.selected_account_count === "number" ? ` · ${pot.selected_account_count}` : ""}
                            </Text>
                          </View>
                          <Text style={[styles.check, { color: active ? colors.primaryForeground : colors.textSecondary }] as any}>
                            {active ? "✓" : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                pressed && styles.pressed,
              ] as any}
            >
              <Ionicons name="close-outline" size={16} color={colors.text} />
              <Text style={[styles.closeButtonText, { color: colors.text }] as any}>{closeLabel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing(2),
  },
  label: {
    fontWeight: typography.fontWeight.semibold as any,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  value: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold as any,
  },
  hint: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[17],
  },
  chevron: {
    fontSize: typography.fontSize[18],
    fontWeight: "800" as any,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing(5),
  },
  modalCard: {
    gap: spacing(3.5),
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing(4.5),
  },
  modalTitle: {
    fontSize: typography.fontSize[20],
    fontWeight: "800" as any,
  },
  modalSubtitle: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  groupTitle: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold as any,
    letterSpacing: typography.letterSpacing[10],
    textTransform: "uppercase",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold as any,
  },
  optionSubtitle: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  check: {
    fontSize: typography.fontSize[18],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  closeButton: {
    alignSelf: "flex-end",
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  closeButtonText: {
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.bold as any,
  },
  pressed: {
    opacity: 0.85,
  },
});
