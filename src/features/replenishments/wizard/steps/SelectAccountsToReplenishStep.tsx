import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Card, Section, formatCurrency } from "@/components/migrated-page";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
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

export function SelectAccountsToReplenishStep({
  selected,
  onToggleAccountIds,
  memberLabelMap,
}: {
  selected: Set<string>;
  onToggleAccountIds: (accountIds: string[]) => void;
  memberLabelMap: Map<string, string>;
}) {
  const { t } = useTranslation("common");
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const accountsQuery = useAccountsWithBalances();
  const potsQuery = useSavingPots();
  const potBalancesQuery = useSavingPotBalances();
  const assignmentsQuery = useSavingPotAccountAssignments();

  const accounts = (accountsQuery.data ?? []) as any[];
  const pots = potsQuery.data ?? [];
  const potBalanceById = new Map((potBalancesQuery.data ?? []).map((balance: any) => [balance.id, balance]));
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

  const groups = useMemo<MemberGroup[]>(() => {
    const keys = [
      ...accounts.map((account) => accountMemberKey(account)),
      ...pots.map((pot: any) => potMemberKey(potAccountIds.get(pot.id) ?? [], accountOwnerById)),
    ];
    const sections = orderMemberSections(keys, memberLabelMap, t("savings.sharedAccounts"));

    return sections.map((section) => ({
      key: section.key,
      label: section.label,
      primary: accounts
        .filter((account) => accountMemberKey(account) === section.key)
        .map((account) => ({
          id: account.id,
          title: account.name,
          subtitle: displayCurrency(formatCurrency(account.current_balance ?? 0), hideValues),
          active: selected.has(account.id),
          iconName: selected.has(account.id) ? "checkmark-circle" : "ellipse-outline",
          onPress: () => onToggleAccountIds([account.id]),
        })),
      secondary: pots
        .filter(
          (pot: any) =>
            potMemberKey(potAccountIds.get(pot.id) ?? [], accountOwnerById) === section.key,
        )
        .map((pot: any) => {
          const ids = potAccountIds.get(pot.id) ?? [];
          const active = ids.length > 0 && ids.every((id) => selected.has(id));
          return {
            id: pot.id,
            title: pot.name,
            subtitle: displayCurrency(formatCurrency(potBalanceById.get(pot.id)?.balance ?? 0), hideValues),
            active,
            iconName: active ? "checkmark-circle" : "ellipse-outline",
            onPress: () => onToggleAccountIds(ids),
          };
        }),
    }));
  }, [accounts, pots, potAccountIds, accountOwnerById, potBalanceById, memberLabelMap, selected, hideValues, t, onToggleAccountIds]);

  return (
    <>
      <Card>
        <Section
          title={t("replenishments.selectAccountsTitle")}
          subtitle={t("replenishments.selectAccountsSubtitle")}
        >
          {null}
        </Section>
      </Card>

      <MemberGroupedList
        groups={groups}
        primaryLabel={t("replenishments.availableAccountsTitle")}
        secondaryLabel={t("replenishments.availablePotsTitle")}
        emptyLabel={t("replenishments.noAccounts")}
        emptyIcon="wallet-outline"
      />
    </>
  );
}
