import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Pill } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useSavingPotAccountAssignments, useSavingPots } from '@/features/saving-pots/hooks';

export type PotAwareBrowseMode = 'accounts' | 'pots';

/**
 * The "browse by pot" affordance for a destination account picker (Part
 * A.3 of the Phase 5 brief). Deliberately NOT a change to
 * GroupedAccountSelect itself -- that component is shared well beyond this
 * feature, and pots are never a valid *stored* value (every
 * planned_item_destinations.destination_account_id is always a real
 * account id, never a pot id). Instead this renders as a sibling toggle +
 * pot-pill row that sits above the normal GroupedAccountSelect: picking a
 * pot with exactly one linked account resolves the destination
 * immediately; picking one with several expands an inline row of just
 * those accounts to choose from. Either way, `onSelectAccount` is always
 * called with a real account id.
 */
export function PotDestinationBrowser({
  accountNameMap,
  onSelectAccount,
}: {
  accountNameMap: Map<string, string>;
  onSelectAccount: (accountId: string) => void;
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const potsQuery = useSavingPots();
  const assignmentsQuery = useSavingPotAccountAssignments();
  const [expandedPotId, setExpandedPotId] = useState<string | null>(null);

  const pots = potsQuery.data ?? [];
  const accountIdsByPotId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const assignment of assignmentsQuery.data ?? []) {
      const list = map.get(assignment.pot_id) ?? [];
      list.push(assignment.account_id);
      map.set(assignment.pot_id, list);
    }
    return map;
  }, [assignmentsQuery.data]);

  if (pots.length === 0) return null;

  const expandedAccountIds = expandedPotId ? (accountIdsByPotId.get(expandedPotId) ?? []) : [];

  return (
    <View style={{ gap: spacing(1.5) } as any}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
        {pots.map((pot) => {
          const accountIds = accountIdsByPotId.get(pot.id) ?? [];
          return (
            <Pill
              key={pot.id}
              label={pot.name}
              active={expandedPotId === pot.id}
              onPress={() => {
                if (accountIds.length === 0) {
                  setExpandedPotId(expandedPotId === pot.id ? null : pot.id);
                  return;
                }
                if (accountIds.length === 1) {
                  onSelectAccount(accountIds[0]);
                  setExpandedPotId(null);
                  return;
                }
                setExpandedPotId(expandedPotId === pot.id ? null : pot.id);
              }}
            />
          );
        })}
      </View>
      {expandedPotId ? (
        <View style={{ gap: spacing(1) } as any}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
            {expandedAccountIds.length === 0 ? t('budget.plannedItems.potNoAccounts') : t('budget.plannedItems.selectPotAccount')}
          </Text>
          {expandedAccountIds.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) } as any}>
              {expandedAccountIds.map((accountId) => (
                <Pill
                  key={accountId}
                  label={accountNameMap.get(accountId) ?? accountId}
                  onPress={() => {
                    onSelectAccount(accountId);
                    setExpandedPotId(null);
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Small "Accounts / Pots" segmented toggle, shared by every destination-account field that wants the pot browser available. Purely local UI state -- the caller decides what to render for each mode. */
export function AccountBrowseModeToggle({
  mode,
  onChange,
}: {
  mode: PotAwareBrowseMode;
  onChange: (mode: PotAwareBrowseMode) => void;
}) {
  const { t } = useTranslation('common');
  return (
    <View style={{ flexDirection: 'row', gap: spacing(1.5) } as any}>
      <Pill label={t('budget.plannedItems.browseAccounts')} active={mode === 'accounts'} onPress={() => onChange('accounts')} />
      <Pill label={t('budget.plannedItems.browsePots')} active={mode === 'pots'} onPress={() => onChange('pots')} />
    </View>
  );
}
