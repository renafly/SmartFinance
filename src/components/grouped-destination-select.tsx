import { useMemo, useState } from "react";
import { Text, View, StyleSheet } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatCurrency } from "@/components/migrated-page";
import { SelectionOptionRow, SelectionShell, SelectionTrigger } from "@/components/selection-shell";

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

export type DestinationSelection = { kind: "account"; id: string };

type GroupedDestinationSelectProps = {
  label: string;
  accounts: AccountLike[];
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
  potNameByAccountId?: Record<string, string>;
  potLabel?: string;
};

function getMemberLabel(member?: MemberLike | null, fallback = "") {
  if (!member) return fallback;
  return member.fullName?.trim() || member.email || fallback;
}

function getAccountLabel(account: AccountLike, potName?: string, potLabel = "") {
  const potSuffix = potName && potLabel ? ` · ${potLabel}: ${potName}` : "";
  return `${account.name}${potSuffix} · ${formatCurrency(account.current_balance ?? account.balance ?? 0)}`;
}

function getOwnerLabel(account: AccountLike, memberMap: Map<string, MemberLike>, sharedLabel: string, unassignedLabel: string) {
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
  potName?: string,
  potLabel = "",
) {
  const potSuffix = potName && potLabel ? ` · ${potLabel}: ${potName}` : "";
  return `${getOwnerLabel(account, memberMap, sharedLabel, unassignedLabel)} · ${typeLabels[account.type] ?? account.type}${potSuffix} · ${formatCurrency(account.current_balance ?? account.balance ?? 0)}`;
}

export function GroupedDestinationSelect({
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
  potNameByAccountId = {},
  potLabel = "",
}: GroupedDestinationSelectProps) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();

  const selectedLabel = useMemo(() => {
    if (!value) return placeholder;
    const account = accounts.find((item) => item.id === value.id);
    return account ? getAccountLabel(account, potNameByAccountId[account.id], potLabel) : placeholder;
  }, [accounts, placeholder, potLabel, potNameByAccountId, value]);

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
    <View style={styles.wrapper}>
      <SelectionTrigger
        label={label}
        valueLabel={selectedLabel}
        hint={hint}
        placeholder={placeholder}
        iconName="swap-horizontal-outline"
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
          {groupedAccounts.map((group) => (
            <View key={group.title} style={{ gap: spacing(2) }}>
              <Text style={[styles.groupTitle, { color: colors.primary }]}>{group.title}</Text>
              <View style={{ gap: spacing(2) }}>
                {group.accounts.map((account) => {
                  const selectionKey = `account:${account.id}`;
                  const active = selectionKey === activeSelection;
                  return (
                    <SelectionOptionRow
                      key={account.id}
                      title={account.name}
                      subtitle={getAccountSubtitle(account, memberMap, sharedLabel, unassignedLabel, typeLabels, potNameByAccountId[account.id], potLabel)}
                      active={active}
                      iconName="business-outline"
                      onPress={() => {
                        onChange({ kind: "account", id: account.id });
                        setOpen(false);
                      }}
                    />
                  );
                })}
              </View>
            </View>
          ))}
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
});
