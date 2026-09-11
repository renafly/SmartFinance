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
 * OccurrenceMatchPicker (same UX: a plain list of same-month
 * transactions of the matching type, tap to select). The only real
 * difference is direction-awareness (an inflow estimate matches against
 * income transactions, not expenses).
 *
 * Searches the whole household for the month, not just `accountId` (see
 * usePlannedItemOccurrenceCandidates's own doc comment) -- so every
 * candidate shows its account name, and same-account ones (already
 * sorted first by the hook) get a "Suggested" flag, so it's still
 * obvious which one is expected to be right.
 */
export function PlannedItemOccurrenceMatchPicker({
  accountId,
  month,
  direction,
  categoryId,
  mainCategoryId,
  onSelect,
  onClose,
}: {
  accountId: string;
  month: string;
  direction: 'outflow' | 'inflow';
  /** Optional exact-category scope, tried first (see usePlannedItemOccurrenceCandidates) -- omit to search every transaction in the household this month, unscoped, same as before this was added. */
  categoryId?: string | null;
  /** Optional fallback scope (the category's main/root ancestor) used only when `categoryId` comes back empty. Ignored when `categoryId` is omitted. */
  mainCategoryId?: string | null;
  onSelect: (transactionId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const candidatesQuery = usePlannedItemOccurrenceCandidates(accountId, month, direction, true, categoryId, mainCategoryId);
  const candidates = candidatesQuery.data ?? [];
  // Surface a fetch failure distinctly from a genuine empty result --
  // without this, a thrown query error renders identically to
  // "no candidates" (candidatesQuery.data stays undefined either way),
  // which silently hides real problems (a bad filter, an RLS/join
  // failure, a network error) behind what looks like a normal empty
  // state.
  // The repository throws whatever Supabase/PostgREST returned as
  // `error` -- usually a plain PostgrestError object ({message, details,
  // hint, code}), not an Error instance, so `String(...)` on it collapses
  // to the useless "[object Object]". Pull every field that might carry
  // the actual reason (RLS denial, bad column/join, etc.) instead.
  const rawError = candidatesQuery.error as
    | { message?: string; details?: string; hint?: string; code?: string }
    | Error
    | string
    | null
    | undefined;
  const errorMessage = candidatesQuery.isError
    ? typeof rawError === 'string'
      ? rawError
      : rawError instanceof Error
        ? rawError.message
        : [rawError?.message, rawError?.details, rawError?.hint, rawError?.code ? `(${rawError.code})` : null]
            .filter(Boolean)
            .join(' -- ') || JSON.stringify(rawError)
    : null;
  // Debug line shown alongside the empty state -- the exact window/type
  // this search used, so a genuine "found nothing" (filters excluded a
  // transaction that looks like it should match) is distinguishable from
  // a bug in this component itself without needing DB access to check.
  const [rangeYear, rangeMonthNumber] = month.slice(0, 7).split('-').map(Number);
  const rangeStart = `${month.slice(0, 7)}-01`;
  const rangeEnd = `${month.slice(0, 7)}-${String(new Date(rangeYear, rangeMonthNumber, 0).getDate()).padStart(2, '0')}`;

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
      {errorMessage ? (
        <Text style={{ color: colors.destructive } as any}>{t('budget.plannedItems.candidatesErrorToast', { message: errorMessage })}</Text>
      ) : null}
      {!candidatesQuery.isLoading && !errorMessage && candidates.length === 0 ? (
        <View style={{ gap: spacing(0.5) } as any}>
          <Text style={{ color: colors.textSecondary } as any}>{t('budget.plannedItems.noCandidates')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
            {t('budget.plannedItems.noCandidatesDebug', {
              type: direction === 'outflow' ? 'expense' : 'income',
              from: rangeStart,
              to: rangeEnd,
            })}
          </Text>
        </View>
      ) : null}
      {candidates.map((transaction) => {
        const isSameAccount = !!accountId && transaction.account_id === accountId;
        return (
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
                {transaction.account?.name ? ` · ${transaction.account.name}` : ''}
                {isSameAccount ? ` · ${t('budget.plannedItems.suggestedMatch')}` : ''}
              </Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.semibold) } as any}>
              {displayCurrency(formatCurrency(transaction.amount), hideValues)}
            </Text>
          </Pressable>
        );
      })}
      <Button label={t('cancel')} onPress={onClose} variant="secondary" />
    </View>
  );
}
