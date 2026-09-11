import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Page, Card } from '@/components/migrated-page';
import { MonthPickerField } from '@/components/date-picker-field';
import { spacing } from '@/theme/spacing';
import { useToast } from '@/providers/ToastProvider';
import { useAccounts } from '@/features/accounts/hooks';
import { useCategories } from '@/features/categories/hooks';
import { useHouseholdMemberDetails } from '@/features/households/hooks';
import { RecurringExpensesCard } from '@/features/category-budgets/components/recurring-expenses-card';
import { CategoryBudgetsSection } from '@/features/category-budgets/components/category-budgets-section';
import { AddCategoryBudgetForm } from '@/features/category-budgets/components/add-category-budget-form';
import { useSetCategoryBudget } from '@/features/category-budgets/hooks/useCategoryBudgets';
import type { BudgetMemberLike } from '@/features/monthly-budget/types';

function monthKey(value: string) {
  return value.slice(0, 7);
}

/**
 * Category Budgets -- its own drawer entry (previously a card embedded in
 * the Monthly Budget screen; extracted out per the user's request).
 *
 * Recurring-expense management here is NOT the existing PlannedItemsSection
 * (that stays on the Monthly Budget screen, for the general
 * income/allocation/multi-destination case) -- the user explicitly asked
 * for something new, purpose-built for this screen: a purely plain-expense
 * quick manager (see recurring-expenses-card.tsx's doc comment for the
 * exact scope decision), reusing planned_items underneath either way.
 *
 * All budget-vs-spend calculation/data-fetching lives in
 * CategoryBudgetsSection/category-budget-view-model.ts -- this screen
 * only owns the month picker and the queries (categories, accounts,
 * members) the two sections need as props. react-query dedupes every one
 * of these cache keys against whatever budget.tsx or any other mounted
 * screen already fetched.
 */
export default function CategoryBudgetsScreen() {
  const { t } = useTranslation('common');

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const normalizedMonth = useMemo(() => monthKey(month), [month]);

  const categoriesQuery = useCategories('expense');
  const accountsQuery = useAccounts();
  const membersQuery = useHouseholdMemberDetails();
  const members = ((membersQuery.data ?? []) as BudgetMemberLike[]).filter((member) => member.status === 'accepted');

  // "Set a category limit" state lives here (rather than inside
  // CategoryBudgetsSection) so it can be shared between the quick-add form
  // -- rendered in its own card next to RecurringExpensesCard below -- and
  // CategoryBudgetsSection's per-row edit (pencil) icon, which prefills the
  // same fields from a different card/column.
  const { show: showToast } = useToast();
  const setBudget = useSetCategoryBudget();
  const [limitCategoryId, setLimitCategoryId] = useState<string | null>(null);
  const [limitAmount, setLimitAmount] = useState('');

  function handleEditLimit(categoryId: string, currentAmount: number) {
    setLimitCategoryId(categoryId);
    setLimitAmount(String(currentAmount));
  }

  async function handleSaveLimit() {
    if (!limitCategoryId || !limitAmount) return;
    try {
      await setBudget.mutateAsync({ categoryId: limitCategoryId, amount: limitAmount, effectiveMonth: normalizedMonth });
      setLimitCategoryId(null);
      setLimitAmount('');
      showToast(t('budget.categoryBudgets.limitSavedToast'));
    } catch {
      showToast(t('budget.categoryBudgets.limitSaveErrorToast'));
    }
  }

  return (
    <Page title={t('drawer.categoryBudgets')} subtitle={t('budget.categoryBudgets.subtitle')}>
      <Animated.View entering={FadeInDown.delay(0).duration(420)}>
        <Card>
          <MonthPickerField label={t('budget.month')} value={month} onChange={setMonth} placeholder="MM-YYYY" />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(420)}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(4) } as any}>
          <View style={{ flex: 1, minWidth: 320 } as any}>
            <Card>
              <RecurringExpensesCard
                accounts={accountsQuery.data ?? []}
                members={members}
                categories={categoriesQuery.data ?? []}
              />
            </Card>
          </View>
          <View style={{ flex: 1, minWidth: 320 } as any}>
            <Card>
              <AddCategoryBudgetForm
                categories={categoriesQuery.data ?? []}
                categoryId={limitCategoryId}
                amount={limitAmount}
                onCategoryChange={setLimitCategoryId}
                onAmountChange={setLimitAmount}
                onSave={handleSaveLimit}
                isSaving={setBudget.isPending}
              />
            </Card>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(420)}>
        <Card>
          <CategoryBudgetsSection
            month={normalizedMonth}
            categories={categoriesQuery.data ?? []}
            accounts={accountsQuery.data ?? []}
            onEditLimit={handleEditLimit}
          />
        </Card>
      </Animated.View>
    </Page>
  );
}
