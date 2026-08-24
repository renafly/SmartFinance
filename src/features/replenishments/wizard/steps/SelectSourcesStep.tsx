import { useMemo, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/data-surface";
import { Card, Section, formatCurrency } from "@/components/migrated-page";
import { SelectionOptionRow, SelectionShell } from "@/components/selection-shell";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { spacing } from "@/theme/spacing";
import { useAccountsWithBalances } from "@/features/accounts/hooks";
import {
  useSavingPotAccountAssignments,
  useSavingPotBalances,
  useSavingPots,
} from "@/features/saving-pots/hooks";

import { MemberGroupedList, type MemberGroup } from "../../components/MemberGroupedList";
import {
  accountMemberKey,
  orderMemberSections,
  potMemberKey,
} from "../../member-grouping";
import type { ReplenishmentSourceDraft } from "../../types";

/** Accounts of this type aren't offered as replenishment sources in v1 --
 * their "balance" represents debt, and unlike a cash/bank/savings account
 * there's no floor/limit modeled anywhere in the schema to validate a draw
 * against. */
const INELIGIBLE_SOURCE_ACCOUNT_TYPES = new Set(["credit_card"]);

export function SelectSourcesStep({
  excludedAccountIds,
  sources,
  onChangeSources,
  memberLabelMap,
}: {
  excludedAccountIds: string[];
  sources: ReplenishmentSourceDraft[];
  onChangeSources: (updater: (current: ReplenishmentSourceDraft[]) => ReplenishmentSourceDraft[]) => void;
  memberLabelMap: Map<string, string>;
}) {
  const { t } = useTranslation("common");
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const accountsQuery = useAccountsWithBalances();
  const potsQuery = useSavingPots();
  const potBalancesQuery = useSavingPotBalances();
  const assignmentsQuery = useSavingPotAccountAssignments();

  const [potAccountPicker, setPotAccountPicker] = useState<{
    potId: string;
    potName: string;
    accountIds: string[];
  } | null>(null);

  const accounts = (accountsQuery.data ?? []) as any[];
  const pots = potsQuery.data ?? [];
  const potBalanceById = new Map((potBalancesQuery.data ?? []).map((balance: any) => [balance.id, balance]));
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const accountOwnerById = new Map(accounts.map((account) => [account.id, account.owner_profile_id ?? null]));

  const potAccountIds = useMemo(() => {
    const byPot = new Map<string, string[]>();
    for (const assignment of assignmentsQuery.data ?? []) {
      const list = byPot.get(assignment.pot_id) ?? [];
      list.push(assignment.account_id);
      byPot.set(assignment.pot_id, list);
    }
    return byPot;
  }, [assignmentsQuery.data]);

  const excludedSet = new Set(excludedAccountIds);
  const usedResolvedAccountIds = new Set(sources.map((source) => source.resolvedAccountId));

  const eligibleAccounts = accounts.filter(
    (account) => !excludedSet.has(account.id) && !INELIGIBLE_SOURCE_ACCOUNT_TYPES.has(account.type),
  );

  function addAccountSource(account: any) {
    if (usedResolvedAccountIds.has(account.id)) return;
    const draft: ReplenishmentSourceDraft = {
      kind: "account",
      potId: null,
      resolvedAccountId: account.id,
      label: account.name,
      availableAmount: account.current_balance ?? 0,
      suggestedAmount: 0,
      amount: 0,
    };
    onChangeSources((current) => [...current, draft]);
  }

  function addPotSource(pot: any, resolvedAccountId: string) {
    if (usedResolvedAccountIds.has(resolvedAccountId)) return;
    const account = accountById.get(resolvedAccountId);
    const draft: ReplenishmentSourceDraft = {
      kind: "pot",
      potId: pot.id,
      resolvedAccountId,
      label: `${pot.name} (${account?.name ?? resolvedAccountId})`,
      availableAmount: account?.current_balance ?? potBalanceById.get(pot.id)?.balance ?? 0,
      suggestedAmount: 0,
      amount: 0,
    };
    onChangeSources((current) => [...current, draft]);
  }

  function handlePotPress(pot: any) {
    const candidateIds = (potAccountIds.get(pot.id) ?? []).filter((id) => !excludedSet.has(id));
    if (candidateIds.length === 0) return;
    if (candidateIds.length === 1) {
      addPotSource(pot, candidateIds[0]);
      return;
    }
    setPotAccountPicker({ potId: pot.id, potName: pot.name, accountIds: candidateIds });
  }

  function removeSource(resolvedAccountId: string) {
    onChangeSources((current) => current.filter((source) => source.resolvedAccountId !== resolvedAccountId));
  }

  const groups = useMemo<MemberGroup[]>(() => {
    const keys = [
      ...eligibleAccounts.map((account) => accountMemberKey(account)),
      ...pots.map((pot: any) => potMemberKey(potAccountIds.get(pot.id) ?? [], accountOwnerById)),
    ];
    const sections = orderMemberSections(keys, memberLabelMap, t("savings.sharedAccounts"));

    return sections.map((section) => ({
      key: section.key,
      label: section.label,
      primary: eligibleAccounts
        .filter((account) => accountMemberKey(account) === section.key)
        .map((account) => ({
          id: account.id,
          title: account.name,
          subtitle: t(`accounts.types.${account.type}`, { defaultValue: account.type }),
          rightLabel: displayCurrency(formatCurrency(account.current_balance ?? 0), hideValues),
          active: usedResolvedAccountIds.has(account.id),
          iconName: usedResolvedAccountIds.has(account.id) ? "checkmark-circle" : "add-circle-outline",
          onPress: () => addAccountSource(account),
        })),
      secondary: pots
        .filter(
          (pot: any) =>
            potMemberKey(potAccountIds.get(pot.id) ?? [], accountOwnerById) === section.key,
        )
        .map((pot: any) => {
          const candidateIds = (potAccountIds.get(pot.id) ?? []).filter((id) => !excludedSet.has(id));
          const disabled = candidateIds.length === 0;
          const balance = potBalanceById.get(pot.id)?.balance ?? 0;
          const isActive = sources.some((source) => source.potId === pot.id);
          return {
            id: pot.id,
            title: pot.name,
            subtitle: disabled
              ? t("replenishments.potFullyExcluded")
              : candidateIds.length > 1
                ? t("replenishments.potMultiAccountHint")
                : t("replenishments.sourceKindPot"),
            rightLabel: displayCurrency(formatCurrency(balance), hideValues),
            active: isActive,
            iconName: isActive ? "checkmark-circle" : "add-circle-outline",
            onPress: () => (disabled ? undefined : handlePotPress(pot)),
          };
        }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    eligibleAccounts,
    pots,
    potAccountIds,
    accountOwnerById,
    potBalanceById,
    memberLabelMap,
    sources,
    usedResolvedAccountIds,
    excludedSet,
    hideValues,
    t,
  ]);

  return (
    <>
      <Card>
        <Section title={t("replenishments.chosenSourcesTitle")}>
          {sources.length === 0 ? (
            <EmptyState title={t("replenishments.noSourcesChosen")} icon="git-network-outline" />
          ) : (
            <View style={{ gap: spacing(2) }}>
              {sources.map((source) => (
                <SelectionOptionRow
                  key={source.resolvedAccountId}
                  title={source.label}
                  subtitle={
                    source.kind === "pot"
                      ? t("replenishments.sourceKindPot")
                      : t("replenishments.sourceKindAccount")
                  }
                  rightLabel={displayCurrency(formatCurrency(source.availableAmount), hideValues)}
                  active
                  iconName="close-circle"
                  danger
                  onPress={() => removeSource(source.resolvedAccountId)}
                />
              ))}
            </View>
          )}
        </Section>
      </Card>

      <Card>
        <Section
          title={t("replenishments.selectSourcesTitle")}
          subtitle={t("replenishments.excludedAccountsHint")}
        >
          {null}
        </Section>
      </Card>

      <MemberGroupedList
        groups={groups}
        primaryLabel={t("replenishments.availableAccountsTitle")}
        secondaryLabel={t("replenishments.availablePotsTitle")}
        emptyLabel={t("replenishments.noEligibleAccounts")}
        emptyIcon="wallet-outline"
      />

      <SelectionShell
        visible={potAccountPicker !== null}
        title={t("replenishments.pickPotAccountTitle")}
        subtitle={potAccountPicker ? t("replenishments.pickPotAccountSubtitle", { pot: potAccountPicker.potName }) : undefined}
        closeLabel={t("cancel")}
        onClose={() => setPotAccountPicker(null)}
      >
        <View style={{ gap: spacing(2) }}>
          {potAccountPicker?.accountIds
            .slice()
            .sort((a, b) => (accountById.get(b)?.current_balance ?? 0) - (accountById.get(a)?.current_balance ?? 0))
            .map((accountId) => {
              const account = accountById.get(accountId);
              return (
                <SelectionOptionRow
                  key={accountId}
                  title={account?.name ?? accountId}
                  rightLabel={displayCurrency(formatCurrency(account?.current_balance ?? 0), hideValues)}
                  onPress={() => {
                    const pot = pots.find((candidate: any) => candidate.id === potAccountPicker?.potId);
                    if (pot) addPotSource(pot, accountId);
                    setPotAccountPicker(null);
                  }}
                />
              );
            })}
        </View>
      </SelectionShell>
    </>
  );
}
