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

type GroupedAccountSelectProps = {
  label: string;
  accounts: AccountLike[];
  members: MemberLike[];
  value: string;
  placeholder: string;
  onChange: (accountId: string) => void;
  hint?: string;
  allowedTypes?: string[];
  allowedAccountIds?: string[];
  groupBy?: "member" | "type";
  sharedLabel?: string;
  unassignedLabel?: string;
  closeLabel?: string;
  typeLabels?: Record<string, string>;
};

function getMemberLabel(member?: MemberLike | null, fallback = "") {
  if (!member) return fallback;
  return member.fullName?.trim() || member.email || fallback;
}

function getAccountLabel(account: AccountLike) {
  const balance = Number(account.current_balance ?? account.balance ?? 0).toFixed(2);
  return `${account.name} · ${account.type} · €${balance}`;
}

export function GroupedAccountSelect({
  label,
  accounts,
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
}: GroupedAccountSelectProps) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();

  const selectedLabel = useMemo(() => {
    const account = accounts.find((item) => item.id === value);
    return account ? getAccountLabel(account) : placeholder;
  }, [accounts, placeholder, value]);

  const memberMap = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);
  const groupedAccounts = useMemo(() => {
    const buckets = new Map<string, { title: string; accounts: AccountLike[] }>();

    for (const account of accounts) {
      if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(account.type)) continue;
      if (allowedAccountIds && allowedAccountIds.length > 0 && !allowedAccountIds.includes(account.id)) continue;

      const key = groupBy === "type"
        ? account.type
        : account.owner_profile_id ?? "__shared__";
      const title = groupBy === "type"
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

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.selector,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="wallet-outline" size={16} color={colors.textSecondary} />
        <View style={{ flex: 1, gap: spacing(1) }}>
          <Text style={[styles.value, { color: colors.text }]}>{selectedLabel}</Text>
          {hint ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text> : null}
        </View>
        <Text style={[styles.chevron, { color: colors.link }]}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
              <Ionicons name="wallet-outline" size={18} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{hint ?? placeholder}</Text>
            <View style={{ gap: spacing(3) }}>
              {groupedAccounts.map((group) => (
                <View key={group.title} style={{ gap: spacing(2) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                    <Ionicons name="layers-outline" size={14} color={colors.primary} />
                    <Text style={[styles.groupTitle, { color: colors.primary }]}>{group.title}</Text>
                  </View>
                  <View style={{ gap: spacing(2) }}>
                    {group.accounts.map((account) => {
                      const active = account.id === value;
                      return (
                        <Pressable
                          key={account.id}
                          onPress={() => {
                            onChange(account.id);
                            setOpen(false);
                          }}
                          style={({ pressed }) => [
                            styles.option,
                            { backgroundColor: active ? colors.primary : colors.surfaceMuted, borderColor: active ? colors.primary : colors.border },
                            pressed && styles.pressed,
                          ]}
                        >
                          <Ionicons
                            name="business-outline"
                            size={18}
                            color={active ? colors.primaryForeground : colors.textSecondary}
                          />
                          <View style={{ flex: 1, gap: spacing(1) }}>
                            <Text style={[styles.optionTitle, { color: active ? colors.primaryForeground : colors.text }]}>
                              {account.name}
                            </Text>
                            <Text style={[styles.optionSubtitle, { color: active ? colors.primaryForeground : colors.textSecondary }]}>
                              {account.type} · €{Number(account.current_balance ?? account.balance ?? 0).toFixed(2)}
                            </Text>
                          </View>
                          <Text style={[styles.check, { color: active ? colors.primaryForeground : colors.textSecondary }]}>
                            {active ? "✓" : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close-outline" size={16} color={colors.text} />
              <Text style={[styles.closeButtonText, { color: colors.text }]}>{closeLabel}</Text>
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
    fontWeight: typography.fontWeight.semibold,
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
    fontWeight: typography.fontWeight.bold,
  },
  hint: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[17],
  },
  chevron: {
    fontSize: typography.fontSize[18],
    fontWeight: "800",
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
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  groupTitle: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold,
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
    fontWeight: typography.fontWeight.bold,
  },
  optionSubtitle: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  check: {
    fontSize: typography.fontSize[18],
    fontWeight: typography.fontWeight.extraBold,
  },
  closeButton: {
    alignSelf: "flex-end",
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.md,
    borderWidth: 1,
  },
  closeButtonText: {
    fontWeight: typography.fontWeight.bold,
  },
  pressed: {
    opacity: 0.85,
  },
} as any) as any;
