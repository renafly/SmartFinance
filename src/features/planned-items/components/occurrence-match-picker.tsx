import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, formatCurrency, formatDate } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';

import { usePlannedItemOccurrenceCandidates } from '../hooks';

/**
 * Candidate-transaction picker for linking an is_estimate occurrence to
 * the real transaction it turned out to be -- adapted from
 * recurring-expenses/components/recurring-expenses-section.tsx's own
 * OccurrenceMatchPicker (same UX: a plain list of same-account,
 * same-month transactions of the matching type, tap to select). The only
 * real difference is direction-awareness (an inflow estimate matches
 * against income transactions, not expenses).
 */
export function PlannedItemOccurrenceMatchPicker({
  accountId,
  month,
  direction,
  onSelect,
  onClose,
}: {
  accountId: string;
  month: string;
  direction: 'outflow' | 'inflow';
  onSelect: (transactionId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const candidatesQuery = usePlannedItemOccurrenceCandidates(accountId, month, direction, true);
  const candidates = candidatesQuery.data ?? [];

  return (
    <View
      style={{
        gap: spacing(2),
        padding: spacing(2.5),
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      } as any}
    >
      <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>
        {t('budget.plannedItems.pickTransaction')}
      </Text>
      {candidatesQuery.isLoading ? <ActivityIndicator /> : null}
      {!candidatesQuery.isLoading && candidates.length === 0 ? (
        <Text style={{ color: colors.textSecondary } as any}>{t('budget.plannedItems.noCandidates')}</Text>
      ) : null}
      {candidates.map((transaction) => (
        <Pressable
          key={transaction.id}
          onPress={() => onSelect(transaction.id)}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: spacing(2),
              paddingVertical: spacing(1.5),
              paddingHorizontal: spacing(2),
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
            },
          ] as any}
        >
          <View style={{ flex: 1 } as any}>
            <Text style={{ color: colors.text } as any} numberOfLines={1}>{transaction.title}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
              {formatDate(transaction.transaction_date)}
            </Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.semibold) } as any}>
            {displayCurrency(formatCurrency(transaction.amount), hideValues)}
          </Text>
        </Pressable>
      ))}
      <Button label={t('cancel')} onPress={onClose} variant="secondary" />
    </View>
  );
}
