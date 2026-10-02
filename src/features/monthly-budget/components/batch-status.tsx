import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Button, formatCurrency } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import { useMonthlyBudgetBatchTransactions } from '@/features/planned-items/hooks';

export type BatchStatusProps = {
  monthLabel: string;
  /** The month's live batch id; null for a month created before batches existed. */
  batchId: string | null;
  transferCount: number;
  transferTotal: number;
  incomeCount: number;
  incomeTotal: number;
  accountLabel: (accountId: string) => string;
  isUndoing: boolean;
  onUndo: () => void;
};

/**
 * 2 · Expected movements once "Create all transfers" has run for the
 * month: what was created, a list of exactly those transactions (read by
 * transactions.monthly_budget_batch_id), and Undo.
 */
export function BatchStatus({ monthLabel, batchId, transferCount, transferTotal, incomeCount, incomeTotal, accountLabel, isUndoing, onUndo }: BatchStatusProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const [showList, setShowList] = useState(false);
  const transactionsQuery = useMonthlyBudgetBatchTransactions(batchId, showList);
  const money = (amount: number) => displayCurrency(formatCurrency(amount), hideValues);

  // Pair each transfer's two legs (same transfer_group_id) into "From → To".
  const rows = (() => {
    const list = transactionsQuery.data ?? [];
    const out: Array<{ key: string; title: string; text: string; amount: string }> = [];
    const byGroup = new Map<string, typeof list>();
    for (const tx of list) {
      if (tx.planned_item_transaction_role === 'income') {
        out.push({ key: tx.id, title: tx.title, text: `→ ${accountLabel(tx.account_id)}`, amount: `+${money(Number(tx.amount))}` });
      } else if (tx.transfer_group_id) {
        byGroup.set(tx.transfer_group_id, [...(byGroup.get(tx.transfer_group_id) ?? []), tx]);
      }
    }
    for (const [groupId, legs] of byGroup) {
      const source = legs.find((leg) => leg.planned_item_transaction_role === 'transfer_source');
      const destination = legs.find((leg) => leg.planned_item_transaction_role === 'transfer_destination');
      out.push({
        key: groupId,
        title: (source ?? destination)?.title ?? '',
        text: `${source ? accountLabel(source.account_id) : '?'} → ${destination ? accountLabel(destination.account_id) : '?'}`,
        amount: money(Number((source ?? destination)?.amount ?? 0)),
      });
    }
    return out;
  })();

  return (
    <View style={{ gap: spacing(3), padding: spacing(3), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.success, backgroundColor: colors.successSoft } as any}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <Text style={{ flex: 1, color: colors.text, fontWeight: String(typography.fontWeight.bold), fontSize: typography.fontSize[15] } as any}>
          {t('budget.plan.allCreated', { month: monthLabel })}
        </Text>
      </View>

      <View style={{ gap: spacing(1) } as any}>
        <Text style={{ color: colors.text } as any}>{t('budget.plan.transfersCreated', { count: transferCount })}</Text>
        <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.plan.totalMovedValue', { amount: money(transferTotal) })}</Text>
        {incomeCount > 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>{t('budget.plan.incomeCreated', { count: incomeCount, amount: money(incomeTotal) })}</Text>
        ) : null}
      </View>

      {showList ? (
        <View style={{ gap: spacing(1.5), padding: spacing(2.5), borderRadius: radius.md, backgroundColor: colors.surface } as any}>
          {transactionsQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {rows.map((row) => (
            <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
              <View style={{ flex: 1, minWidth: 0 } as any}>
                <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.semibold) } as any} numberOfLines={1}>{row.title}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any} numberOfLines={1}>{row.text}</Text>
              </View>
              <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{row.amount}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
        {batchId ? (
          <View style={{ flexGrow: 1, minWidth: 130 } as any}>
            <Button label={showList ? t('budget.plan.hideTransfers') : t('budget.plan.viewTransfers')} variant="secondary" onPress={() => setShowList((current) => !current)} />
          </View>
        ) : null}
        <View style={{ flexGrow: 1, minWidth: 130 } as any}>
          <Button label={isUndoing ? t('budget.reverting') : batchId ? t('budget.plan.undoBatch') : t('budget.plan.resetMonth')} variant="danger" onPress={onUndo} disabled={isUndoing} />
        </View>
      </View>
    </View>
  );
}
