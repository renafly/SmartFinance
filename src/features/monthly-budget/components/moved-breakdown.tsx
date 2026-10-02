import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { formatCurrency } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import { roundMoney } from '@/features/planned-items/utils';
import type { BudgetAccountLike } from '../types';
import type { PlanMovementLine } from '../monthly-plan';

const TYPE_ORDER = ['savings', 'investment', 'ppr', 'bank', 'cash', 'credit_card'];

type AccountTotal = { accountId: string; name: string; amount: number };
type TypeGroup = { type: string; amount: number; accounts: AccountTotal[] };
type OwnerGroup = { key: string; label: string; isShared: boolean; amount: number; types: TypeGroup[] };

/** Groups the month's transfers by who owns the receiving account, then by that account's type. Pure. */
export function groupMovedByOwnerAndType(
  movements: PlanMovementLine[],
  accountsById: Map<string, BudgetAccountLike>,
  ownerLabel: (ownerProfileId: string | null) => string,
): OwnerGroup[] {
  const owners = new Map<string, OwnerGroup>();
  for (const line of movements) {
    const account = accountsById.get(line.toAccountId);
    const ownerId = account?.owner_profile_id ?? null;
    const key = ownerId ?? '__shared__';
    const type = account?.type ?? 'bank';

    let owner = owners.get(key);
    if (!owner) {
      owner = { key, label: ownerLabel(ownerId), isShared: ownerId === null, amount: 0, types: [] };
      owners.set(key, owner);
    }
    owner.amount = roundMoney(owner.amount + line.amount);

    let group = owner.types.find((entry) => entry.type === type);
    if (!group) {
      group = { type, amount: 0, accounts: [] };
      owner.types.push(group);
    }
    group.amount = roundMoney(group.amount + line.amount);

    let accountTotal = group.accounts.find((entry) => entry.accountId === line.toAccountId);
    if (!accountTotal) {
      accountTotal = { accountId: line.toAccountId, name: account?.name ?? '', amount: 0 };
      group.accounts.push(accountTotal);
    }
    accountTotal.amount = roundMoney(accountTotal.amount + line.amount);
  }

  const result = [...owners.values()];
  for (const owner of result) {
    owner.types.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
    for (const group of owner.types) group.accounts.sort((a, b) => b.amount - a.amount);
  }
  // People first (alphabetical), shared accounts last.
  result.sort((a, b) => (a.isShared !== b.isShared ? (a.isShared ? 1 : -1) : a.label.localeCompare(b.label)));
  return result;
}

/**
 * "Total moved" for 2 · Expected movements, organised by the owner of the
 * account the money goes to, then by account type (Savings, Investment,
 * PPR, ...), with each receiving account underneath.
 */
export function MovedBreakdown({
  movements,
  total,
  accountsById,
  ownerLabel,
}: {
  movements: PlanMovementLine[];
  total: number;
  accountsById: Map<string, BudgetAccountLike>;
  ownerLabel: (ownerProfileId: string | null) => string;
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const money = (amount: number) => displayCurrency(formatCurrency(amount), hideValues);
  const owners = groupMovedByOwnerAndType(movements, accountsById, ownerLabel);

  return (
    <View style={{ gap: spacing(2) } as any}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing(1) } as any}>
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.plan.totalMoved')}</Text>
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.extraBold), fontSize: typography.fontSize[16] } as any}>{money(total)}</Text>
      </View>

      {owners.map((owner) => (
        <View key={owner.key} style={{ gap: spacing(1.5), padding: spacing(2.5), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border } as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name={owner.isShared ? 'people-outline' : 'person-circle-outline'} size={16} color={colors.textSecondary} />
            <Text style={{ flex: 1, color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any} numberOfLines={1}>{owner.label}</Text>
            <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.extraBold) } as any}>{money(owner.amount)}</Text>
          </View>

          {owner.types.map((group) => (
            <View key={group.type} style={{ gap: spacing(0.75), paddingLeft: spacing(5.5) } as any}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.bold), textTransform: 'uppercase' } as any}>
                  {t(`budget.destinationGroups.${group.type}`, { defaultValue: group.type })}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.bold) } as any}>{money(group.amount)}</Text>
              </View>
              {group.accounts.map((account) => (
                <View key={account.accountId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing(2) } as any}>
                  <Text style={{ flex: 1, color: colors.text, fontSize: typography.fontSize[14] } as any} numberOfLines={1}>{account.name}</Text>
                  <Text style={{ color: colors.text, fontSize: typography.fontSize[14], fontWeight: String(typography.fontWeight.semibold) } as any}>{money(account.amount)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
