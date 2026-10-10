import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { formatCurrency } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import type { MonthlyPlanSummary, PlanAccountImpact } from '../monthly-plan';
import type { BudgetAccountLike } from '../types';
import { groupImpactsByOwner } from '../ui-utils';

/**
 * "Balance after" for 2 · Expected movements -- per ACCOUNT, never one
 * global number: each account's real current balance, plus this month's
 * not-yet-created income into it, minus/plus the transfers out of/into it.
 * Accounts money leaves from (and income accounts) are always shown;
 * accounts that only receive money sit behind a toggle to keep it compact.
 * Accounts are grouped under their owner (accounts.owner_profile_id),
 * people first, shared accounts last -- display only, the numbers come
 * straight from `summary.impacts`.
 */
export function BalanceAfter({
  summary,
  accountsById,
  ownerLabel,
}: {
  summary: MonthlyPlanSummary;
  accountsById: Map<string, BudgetAccountLike>;
  /** Owner's display name for an owner_profile_id ("Shared" for null). */
  ownerLabel: (ownerProfileId: string | null) => string;
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const [showReceiving, setShowReceiving] = useState(false);

  if (summary.impacts.length === 0) return null;

  const money = (amount: number) => displayCurrency(formatCurrency(amount), hideValues);
  const primary = summary.impacts.filter((impact) => impact.isIncomeAccount || impact.outgoing > 0.004);
  const receiving = summary.impacts.filter((impact) => !impact.isIncomeAccount && impact.outgoing <= 0.004);
  const over = new Set(summary.overAllocatedAccountIds);
  const primaryIds = new Set(primary.map((impact) => impact.accountId));
  // Paying/income accounts first, receiving-only ones after, within each owner.
  const visible = showReceiving ? [...primary, ...receiving] : primary;
  const groups = groupImpactsByOwner(visible, accountsById, ownerLabel);

  const line = (impact: PlanAccountImpact, emphasis: boolean) => {
    const negative = impact.after < -0.004;
    return (
      <View key={impact.accountId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(1.5) } as any}>
        <Text style={{ flex: 1, color: colors.text, fontWeight: String(emphasis ? typography.fontWeight.semibold : typography.fontWeight.regular) } as any} numberOfLines={1}>
          {accountsById.get(impact.accountId)?.name ?? ''}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>{money(impact.before)}</Text>
        <Ionicons name="arrow-forward" size={12} color={colors.textSecondary} />
        <Text
          style={{
            minWidth: 90,
            textAlign: 'right',
            color: negative || over.has(impact.accountId) ? colors.destructive : colors.text,
            fontWeight: String(emphasis ? typography.fontWeight.extraBold : typography.fontWeight.bold),
            fontSize: emphasis ? typography.fontSize[16] : typography.fontSize[14],
          } as any}
        >
          {money(impact.after)}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ gap: spacing(1), padding: spacing(3), borderRadius: radius.lg, backgroundColor: colors.surfaceMuted } as any}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as any}>
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.plan.balanceAfter')}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{t('budget.plan.balanceNowToAfter')}</Text>
      </View>
      {groups.map((group, index) => (
        <View
          key={group.key}
          style={{
            gap: spacing(0.5),
            paddingTop: spacing(2),
            marginTop: index === 0 ? 0 : spacing(1),
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: colors.border,
          } as any}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name={group.isShared ? 'people-outline' : 'person-circle-outline'} size={16} color={colors.textSecondary} />
            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: typography.fontSize[13], fontWeight: String(typography.fontWeight.bold) } as any} numberOfLines={1}>
              {group.label}
            </Text>
          </View>
          <View style={{ paddingLeft: spacing(5.5) } as any}>
            {group.impacts.map((impact) => line(impact, primaryIds.has(impact.accountId)))}
          </View>
        </View>
      ))}
      {receiving.length > 0 ? (
        <>
          <Pressable onPress={() => setShowReceiving((current) => !current)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingVertical: spacing(1) } as any}>
            <Ionicons name={showReceiving ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: typography.fontSize[13], fontWeight: String(typography.fontWeight.semibold) } as any}>
              {showReceiving ? t('budget.plan.hideReceiving') : t('budget.plan.showReceiving', { count: receiving.length })}
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
