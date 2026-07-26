import { useMemo, useState } from "react";
import { Text, View, StyleSheet } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatCurrency } from "@/components/migrated-page";
import { SelectionOptionRow, SelectionShell, SelectionTrigger } from "@/components/selection-shell";
import {
  SHARED_ACCOUNT_OWNER_KEY,
  compareAccountsByOwnerThenType,
  compareAccountsByTypeThenName,
} from "@/features/accounts/account-ordering";

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
  allOption?: {
    value: string;
    label: string;
    subtitle?: string;
  };
};

function getMemberLabel(member?: MemberLike | null, fallback = "") {
  if (!member) return fallback;
  return member.fullName?.trim() || member.email || fallback;
}

function getAccountLabel(account: AccountLike) {
  return `${account.name} · ${formatCurrency(account.current_balance ?? account.balance ?? 0)}`;
}

function getOwnerLabel(
  account: AccountLike,
  memberMap: Map<string, MemberLike>,
  sharedLabel: string,
  unassignedLabel: string,
) {
  return account.owner_profile_id
    ? getMemberLabel(memberMap.get(account.owner_profile_id), unassignedLabel)
    : sharedLabel;
}

function getAccountSubtitle(
  account: AccountLike,
  memberMap: Map<string, MemberLike>,
  sharedLabel: string,
  unassignedLabel: string,
  typeLabels: Record<string, string>,
) {
  return `${getOwnerLabel(account, memberMap, sharedLabel, unassignedLabel)} · ${typeLabels[account.type] ?? account.type}`;
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
  allOption,
}: GroupedAccountSelectProps) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();

  const selectedAccount = accounts.find((item) => item.id === value);
  const selectedLabel =
    allOption?.value === value
      ? allOption.label
      : selectedAccount
        ? getAccountLabel(selectedAccount)
        : placeholder;

  const memberMap = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);
  const groupedAccounts = useMemo(() => {
    const ownerOrder = [...members.map((member) => member.userId), SHARED_ACCOUNT_OWNER_KEY];
    const filteredAccounts = accounts.filter((account) => {
      if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(account.type)) return false;
      if (allowedAccountIds && allowedAccountIds.length > 0 && !allowedAccountIds.includes(account.id)) return false;
      return true;
    });
    const orderedAccounts = [...filteredAccounts].sort((left, right) =>
      groupBy === "type"
        ? compareAccountsByTypeThenName(left, right)
        : compareAccountsByOwnerThenType(left, right, ownerOrder),
    );
    const buckets = new Map<string, { key: string; title: string; accounts: AccountLike[] }>();

    for (const account of orderedAccounts) {
      const key = groupBy === "type" ? account.type : (account.owner_profile_id ?? SHARED_ACCOUNT_OWNER_KEY);
      const title =
        groupBy === "type"
          ? (typeLabels[account.type] ?? account.type)
          : account.owner_profile_id
            ? getMemberLabel(memberMap.get(account.owner_profile_id), unassignedLabel)
            : sharedLabel;

      const existing = buckets.get(key);
      if (existing) {
        existing.accounts.push(account);
      } else {
        buckets.set(key, { key, title, accounts: [account] });
      }
    }

    return [...buckets.values()];
  }, [
    accounts,
    allowedAccountIds,
    allowedTypes,
    groupBy,
    memberMap,
    members,
    sharedLabel,
    typeLabels,
    unassignedLabel,
  ]);

  const groupTones = [
    { accent: colors.primary, surface: colors.primarySoft },
    { accent: colors.financialPositive, surface: colors.financialPositiveSoft },
    { accent: colors.financialNeutral, surface: colors.financialNeutralSoft },
    {
      accent: colors.financialAttention,
      surface: colors.financialAttentionSoft,
    },
    { accent: colors.financialGoal, surface: colors.financialGoalSoft },
  ];

  return (
    <View style={styles.wrapper}>
      <SelectionTrigger
        label={label}
        valueLabel={selectedLabel}
        hint={hint}
        placeholder={placeholder}
        iconName="wallet-outline"
        onPress={() => setOpen(true)}
      />

      <SelectionShell
        visible={open}
        title={label}
        subtitle={hint ?? placeholder}
        closeLabel={closeLabel}
        onClose={() => setOpen(false)}
      >
        <View style={{ gap: spacing(3) }}>
          {allOption ? (
            <SelectionOptionRow
              title={allOption.label}
              subtitle={allOption.subtitle}
              active={value === allOption.value}
              iconName="layers-outline"
              onPress={() => {
                onChange(allOption.value);
                setOpen(false);
              }}
            />
          ) : null}
          {groupedAccounts.map((group, groupIndex) => {
            const tone = groupTones[groupIndex % groupTones.length];
            return (
              <View key={group.key} style={[styles.group, { backgroundColor: tone.surface, borderColor: tone.accent }]}>
                <Text style={[styles.groupTitle, { color: tone.accent }]}>{group.title}</Text>
                <View style={{ gap: spacing(2) }}>
                  {group.accounts.map((account) => {
                    const active = account.id === value;
                    return (
                      <SelectionOptionRow
                        key={account.id}
                        title={account.name}
                        subtitle={getAccountSubtitle(account, memberMap, sharedLabel, unassignedLabel, typeLabels)}
                        rightLabel={formatCurrency(account.current_balance ?? account.balance ?? 0)}
                        active={active}
                        iconName="business-outline"
                        onPress={() => {
                          onChange(account.id);
                          setOpen(false);
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </SelectionShell>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing(2),
  },
  groupTitle: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold,
    letterSpacing: typography.letterSpacing[10],
    textTransform: "uppercase",
  },
  group: {
    gap: spacing(2),
    padding: spacing(3),
    borderWidth: 1,
    borderLeftWidth: spacing(1),
    borderRadius: spacing(2.5),
  },
});
