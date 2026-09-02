import { useMemo, useState } from "react";
import { Text, View, StyleSheet } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { radius } from "@/theme/radius";
import { Button, formatCurrency } from "@/components/migrated-page";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { MultiSelectShell, SelectionOptionRow, SelectionShell, SelectionTrigger } from "@/components/selection-shell";
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

function getMemberLabel(member?: MemberLike | null, fallback = "") {
  if (!member) return fallback;
  return member.fullName?.trim() || member.email || fallback;
}

function getAccountLabel(account: AccountLike, hideValues: boolean) {
  return `${account.name} · ${displayCurrency(formatCurrency(account.current_balance ?? account.balance ?? 0), hideValues)}`;
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

// ------------------------------------------------------------
// Shared grouping -- both GroupedAccountSelect (single-value) and
// GroupedAccountMultiSelect (bulk multi-pick, see below) group and order
// accounts identically (by member-owner or by type, same tone-per-group
// bucketing), so that logic lives here once rather than being
// reimplemented per component. Neither component duplicates this.
// ------------------------------------------------------------
type GroupedAccountsOptions = {
  groupBy: "member" | "type";
  sharedLabel: string;
  unassignedLabel: string;
  typeLabels: Record<string, string>;
  allowedTypes?: string[];
  allowedAccountIds?: string[];
  /** Accounts to leave out of the grouping entirely -- e.g. already-selected accounts in a multi-pick, so they never appear as available duplicates. */
  excludeAccountIds?: string[];
};

function buildGroupedAccounts(accounts: AccountLike[], members: MemberLike[], options: GroupedAccountsOptions) {
  const { groupBy, sharedLabel, unassignedLabel, typeLabels, allowedTypes, allowedAccountIds, excludeAccountIds } = options;
  const memberMap = new Map(members.map((member) => [member.userId, member]));
  const ownerOrder = [...members.map((member) => member.userId), SHARED_ACCOUNT_OWNER_KEY];
  const excludeSet = excludeAccountIds && excludeAccountIds.length > 0 ? new Set(excludeAccountIds) : null;

  const filteredAccounts = accounts.filter((account) => {
    if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(account.type)) return false;
    if (allowedAccountIds && allowedAccountIds.length > 0 && !allowedAccountIds.includes(account.id)) return false;
    if (excludeSet && excludeSet.has(account.id)) return false;
    return true;
  });
  const orderedAccounts = [...filteredAccounts].sort((left, right) =>
    groupBy === "type" ? compareAccountsByTypeThenName(left, right) : compareAccountsByOwnerThenType(left, right, ownerOrder),
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

  return { groups: [...buckets.values()], memberMap };
}

function useGroupTones() {
  const { colors } = useTheme();
  return [
    { accent: colors.primary, surface: colors.primarySoft },
    { accent: colors.financialPositive, surface: colors.financialPositiveSoft },
    { accent: colors.financialNeutral, surface: colors.financialNeutralSoft },
    { accent: colors.financialAttention, surface: colors.financialAttentionSoft },
    { accent: colors.financialGoal, surface: colors.financialGoalSoft },
  ];
}

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
  disabled?: boolean;
};

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
  disabled,
}: GroupedAccountSelectProps) {
  const [open, setOpen] = useState(false);
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const groupTones = useGroupTones();

  const selectedAccount = accounts.find((item) => item.id === value);
  const selectedLabel =
    allOption?.value === value
      ? allOption.label
      : selectedAccount
        ? getAccountLabel(selectedAccount, hideValues)
        : placeholder;

  const { groups: groupedAccounts, memberMap } = useMemo(
    () => buildGroupedAccounts(accounts, members, { groupBy, sharedLabel, unassignedLabel, typeLabels, allowedTypes, allowedAccountIds }),
    [accounts, allowedAccountIds, allowedTypes, groupBy, members, sharedLabel, typeLabels, unassignedLabel],
  );

  return (
    <View style={styles.wrapper}>
      <SelectionTrigger
        label={label}
        valueLabel={selectedLabel}
        hint={hint}
        placeholder={placeholder}
        iconName="wallet-outline"
        disabled={disabled}
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
                        rightLabel={displayCurrency(formatCurrency(account.current_balance ?? account.balance ?? 0), hideValues)}
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

type GroupedAccountMultiSelectProps = {
  /** Modal title -- e.g. "Select accounts". */
  title: string;
  /** Label of the button that opens the picker -- e.g. "Add accounts". */
  triggerLabel: string;
  accounts: AccountLike[];
  members: MemberLike[];
  /** Called once with every account the user checked, when they confirm. Never called with an empty array (confirming with nothing checked just closes the picker). */
  onConfirm: (accountIds: string[]) => void;
  /** Modal subtitle/hint -- e.g. "Choose every account this expense should be split across." */
  hint?: string;
  allowedTypes?: string[];
  /** Accounts that must not appear as pickable -- already-selected accounts elsewhere in the same flow (e.g. the source account, or destinations already added), so they never show up as available duplicates. */
  excludeAccountIds?: string[];
  groupBy?: "member" | "type";
  sharedLabel?: string;
  unassignedLabel?: string;
  closeLabel?: string;
  confirmLabel?: string;
  typeLabels?: Record<string, string>;
  emptyLabel?: string;
  /** Caps how many accounts can be checked in one confirm. When it's 1, checking a second account swaps the selection (radio-like) instead of being a no-op, so a capped picker still feels responsive. Omit for no cap. */
  maxSelectable?: number;
  disabled?: boolean;
};

/**
 * Bulk account picker: check any number of accounts (grouped/toned exactly
 * like GroupedAccountSelect, via the shared buildGroupedAccounts above),
 * then confirm once to add all of them in a single action. Deliberately a
 * sibling of GroupedAccountSelect rather than a mode flag on it --
 * GroupedAccountSelect's single-value contract (onChange(accountId), closes
 * on every tap) is relied on by several other call sites (transactions,
 * transfers, split-allocations-editor, planned-item-card), so this adds a
 * second, explicitly multi-select component instead of risking those.
 */
export function GroupedAccountMultiSelect({
  title,
  triggerLabel,
  accounts,
  members,
  onConfirm,
  hint,
  allowedTypes,
  excludeAccountIds,
  groupBy = "type",
  sharedLabel = "",
  unassignedLabel = "",
  closeLabel = "",
  confirmLabel = "",
  typeLabels = {},
  emptyLabel = "",
  maxSelectable,
  disabled,
}: GroupedAccountMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const groupTones = useGroupTones();

  const { groups, memberMap } = useMemo(
    () => buildGroupedAccounts(accounts, members, { groupBy, sharedLabel, unassignedLabel, typeLabels, allowedTypes, excludeAccountIds }),
    [accounts, allowedTypes, excludeAccountIds, groupBy, members, sharedLabel, typeLabels, unassignedLabel],
  );

  function toggle(accountId: string) {
    setDraftIds((previous) => {
      if (previous.includes(accountId)) return previous.filter((id) => id !== accountId);
      if (maxSelectable != null && previous.length >= maxSelectable) {
        return maxSelectable === 1 ? [accountId] : previous;
      }
      return [...previous, accountId];
    });
  }

  function handleClose() {
    setOpen(false);
    setDraftIds([]);
  }

  function handleConfirm() {
    if (draftIds.length > 0) onConfirm(draftIds);
    setDraftIds([]);
    setOpen(false);
  }

  return (
    <>
      <Button label={triggerLabel} onPress={() => setOpen(true)} variant="secondary" disabled={disabled} />

      <MultiSelectShell
        visible={open}
        title={title}
        subtitle={hint}
        closeLabel={closeLabel}
        confirmLabel={confirmLabel}
        onClose={handleClose}
        onConfirm={handleConfirm}
        confirmDisabled={draftIds.length === 0}
      >
        <View style={{ gap: spacing(3) }}>
          {groups.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyLabel}</Text>
          ) : (
            groups.map((group, groupIndex) => {
              const tone = groupTones[groupIndex % groupTones.length];
              return (
                <View key={group.key} style={[styles.group, { backgroundColor: tone.surface, borderColor: tone.accent }]}>
                  <Text style={[styles.groupTitle, { color: tone.accent }]}>{group.title}</Text>
                  <View style={{ gap: spacing(2) }}>
                    {group.accounts.map((account) => {
                      const selected = draftIds.includes(account.id);
                      return (
                        <SelectionOptionRow
                          key={account.id}
                          title={account.name}
                          subtitle={getAccountSubtitle(account, memberMap, sharedLabel, unassignedLabel, typeLabels)}
                          rightLabel={displayCurrency(formatCurrency(account.current_balance ?? account.balance ?? 0), hideValues)}
                          active={selected}
                          iconName={selected ? "checkmark-circle" : "ellipse-outline"}
                          onPress={() => toggle(account.id)}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </MultiSelectShell>
    </>
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
  emptyText: {
    fontSize: typography.fontSize[13],
  },
});
