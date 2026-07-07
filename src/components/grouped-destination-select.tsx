import { useMemo, useState } from "react";
import { Text, View, StyleSheet } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
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
                      subtitle={`${account.type} · €${Number(account.current_balance ?? account.balance ?? 0).toFixed(2)}`}
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

          {pots.length > 0 ? (
            <View style={{ gap: spacing(2) }}>
              <Text style={[styles.groupTitle, { color: colors.primary }]}>{potGroupLabel}</Text>
              <View style={{ gap: spacing(2) }}>
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
                    <SelectionOptionRow
                      key={pot.id}
                      title={pot.name}
                      subtitle={`${summary}${typeof pot.selected_account_count === "number" ? ` · ${pot.selected_account_count}` : ""}`}
                      active={active}
                      iconName="briefcase-outline"
                      onPress={() => {
                        onChange({ kind: "pot", id: pot.id });
                        setOpen(false);
                      }}
                    />
                  );
                })}
              </View>
            </View>
          ) : null}
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
