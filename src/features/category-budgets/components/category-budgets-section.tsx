import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Section } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsiveMetrics } from '@/theme/responsive';
import { type CategoryPickerCategory } from '@/components/category-picker';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { usePlannedItemMatches, usePlannedItems, usePlannedItemsPreview } from '@/features/planned-items/hooks';
import { useAllTransactions } from '@/features/transactions/hooks/useTransactions';
import { getLocalCalendarDate } from '@/features/transactions/utils/transaction-create-form';

import { useCategoryBudgets } from '../hooks/useCategoryBudgets';
import { buildCategoryBudgetViewModel, type CategoryBudgetAccountLike } from '../services/category-budget-view-model';
import { CategoryBudgetRow } from './category-budget-row';

export type CategoryBudgetsSectionProps = {
  /** "YYYY-MM" */
  month: string;
  categories: CategoryPickerCategory[];
  accounts: CategoryBudgetAccountLike[];
  /** Wired to each row's edit (pencil) icon; prefills the "set a category
   * limit" form (AddCategoryBudgetForm, rendered by the parent screen in
   * its own card alongside RecurringExpensesCard) with that category and
   * its current limit. */
  onEditLimit: (categoryId: string, currentAmount: number) => void;
};

/** First/last calendar date of `month` ("YYYY-MM"), same local-date convention categoryBrowserPeriodRange (category-browser-data.ts) uses for its own period totals -- kept consistent with that existing feature rather than inventing a second month-bounds convention. */
function monthDateRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const from = getLocalCalendarDate(new Date(year, (monthNumber ?? 1) - 1, 1));
  const to = getLocalCalendarDate(new Date(year, monthNumber ?? 1, 0));
  return { from, to };
}

// householdId/createdBy are NOT props here -- useCategoryBudgets and
// useSetCategoryBudget both pull them from useAuth() internally (same
// convention as useConfirmPlannedItemMonth etc.), so there is nothing for
// this component to thread through.
export function CategoryBudgetsSection({ month, categories, accounts, onEditLimit }: CategoryBudgetsSectionProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();

  const { from, to } = useMemo(() => monthDateRange(month), [month]);
  // useAllTransactions (not useTransactions) -- pages through every row
  // rather than truncating at PostgREST's default page size, same reason
  // categories.tsx's own category-browser totals use it (see
  // categoryBrowserPeriodRange): a budget figure the user relies on must
  // never silently under-count a high-volume month.
  const transactionsQuery = useAllTransactions({ from, to });
  const budgetsQuery = useCategoryBudgets(month);
  const previewQuery = usePlannedItemsPreview(month);
  const itemsQuery = usePlannedItems();

  // Card grid: 1 column on phone, up to 4 on a big screen -- same named
  // breakpoints (theme/responsive.ts) the rest of the app sizes off of,
  // rather than a bespoke width check for just this screen. Rows default
  // collapsed once there's more than one per row (see CategoryBudgetRow's
  // defaultExpanded) so a wide screen shows compact cards side by side
  // instead of several fully-expanded ones, which is what made this list
  // hard to follow before.
  const responsive = useResponsiveMetrics();
  const columns = responsive.size === 'xl' ? 4 : responsive.size === 'lg' ? 3 : responsive.size === 'md' ? 2 : 1;
  const cardFlexBasis = columns === 4 ? '23%' : columns === 3 ? '31%' : columns === 2 ? '48%' : '100%';

  const plannedItemNameById = useMemo(() => new Map((itemsQuery.data ?? []).map((item) => [item.id, item.name])), [itemsQuery.data]);

  // Reverse lookup (transactionId -> occurrenceId) for occurrences paid via
  // "link an existing transaction" (match_planned_item_occurrence) --
  // mirrors PlannedItemsSection's own relevantOccurrenceIds/matchByOccurrenceId
  // pattern (see planned-items-section.tsx) so the transaction list can flag
  // "currently linked" the same way Monthly Budget's own estimate-matching
  // UI already does. An occurrence paid via "mark as paid -> create
  // transaction" instead needs no lookup here -- that transaction carries
  // its own planned_item_occurrence_id column directly (see the map below).
  const relevantOccurrenceIds = useMemo(
    () => (previewQuery.data?.occurrences ?? []).map((resolved) => resolved.occurrence.id).filter((id): id is string => !!id),
    [previewQuery.data],
  );
  const { matchByOccurrenceId } = usePlannedItemMatches(relevantOccurrenceIds);
  const matchedOccurrenceIdByTransactionId = useMemo(() => {
    const map = new Map<string, string>();
    for (const match of matchByOccurrenceId.values()) {
      map.set(match.transactionId, match.occurrenceId);
    }
    return map;
  }, [matchByOccurrenceId]);

  const transactions = useMemo(
    () =>
      (transactionsQuery.data ?? []).map((transaction) => {
        // A transaction this app generated directly (confirm_planned_item_
        // occurrence/confirm_planned_item_month) carries its own occurrence
        // id; one linked afterward to a pre-existing transaction only shows
        // up in the matches lookup instead. A transaction is never both.
        const linkedOccurrenceId = transaction.planned_item_occurrence_id ?? matchedOccurrenceIdByTransactionId.get(transaction.id) ?? null;
        return {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          accountId: transaction.account_id,
          title: transaction.title,
          transactionDate: transaction.transaction_date,
          accountName: transaction.account?.name ?? '',
          categoryId: transaction.category_id,
          transferGroupId: transaction.transfer_group_id,
          linkedOccurrenceId,
          isAutoCreatedTransaction: !!transaction.planned_item_occurrence_id,
        };
      }),
    [transactionsQuery.data, matchedOccurrenceIdByTransactionId],
  );

  const viewModelCategories = useMemo(
    () => categories.map((category) => ({ id: category.id, name: category.name, parentId: category.parent_id ?? null })),
    [categories],
  );

  const viewModel = useMemo(
    () =>
      previewQuery.data
        ? buildCategoryBudgetViewModel({
            month,
            categories: viewModelCategories,
            budgets: budgetsQuery.data ?? [],
            transactions,
            accounts,
            resolved: previewQuery.data,
            plannedItemNameById,
          })
        : null,
    [month, viewModelCategories, budgetsQuery.data, transactions, accounts, previewQuery.data, plannedItemNameById],
  );

  const entries = viewModel?.entries ?? [];
  const isLoading = !viewModel;

  return (
    <Section title={t('budget.categoryBudgets.title')} subtitle={t('budget.categoryBudgets.subtitle')} collapsible defaultCollapsed={false}>
      {isLoading ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[14] } as any}>{t('loading')}</Text>
      ) : entries.length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[14] } as any}>{t('budget.categoryBudgets.empty')}</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) } as any}>
          {entries.map((entry) => (
            <View
              key={entry.categoryId}
              style={{
                flexBasis: cardFlexBasis,
                flexGrow: 1,
                minWidth: 260,
                padding: spacing(3),
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              } as any}
            >
              <CategoryBudgetRow entry={entry} month={month} defaultExpanded={columns === 1} onEditLimit={onEditLimit} />
            </View>
          ))}
        </View>
      )}
    </Section>
  );
}
