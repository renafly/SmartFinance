import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Section, Field, Button } from '@/components/migrated-page';
import { CategoryPicker, type CategoryPickerCategory } from '@/components/category-picker';
import { spacing } from '@/theme/spacing';

export type AddCategoryBudgetFormProps = {
  categories: CategoryPickerCategory[];
  categoryId: string | null;
  amount: string;
  onCategoryChange: (categoryId: string | null) => void;
  onAmountChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
};

/**
 * The "set a category limit" form, split out of CategoryBudgetsSection so it
 * can sit in its own card next to RecurringExpensesCard (same row) instead
 * of trailing below the full category-budget-cards grid -- per the user's
 * request to group "add a recurring expense" and "add a category budget"
 * together as the two quick-add actions for this screen.
 *
 * Deliberately stateless/controlled: categoryId/amount live in the parent
 * screen (CategoryBudgetsScreen) rather than here, because
 * CategoryBudgetsSection's per-row edit (pencil) icon also needs to prefill
 * these same fields, and that row list renders in a different card/column
 * on wide screens -- lifting the state to their shared parent is what lets
 * both sides drive the same form.
 */
export function AddCategoryBudgetForm({
  categories,
  categoryId,
  amount,
  onCategoryChange,
  onAmountChange,
  onSave,
  isSaving,
}: AddCategoryBudgetFormProps) {
  const { t } = useTranslation('common');

  return (
    <Section title={t('budget.categoryBudgets.setLimitTitle')} subtitle={t('budget.categoryBudgets.setLimitHint')}>
      <View style={{ gap: spacing(2) } as any}>
        <CategoryPicker
          label={t('budget.categoryBudgets.categoryLabel')}
          placeholder={t('budget.categoryBudgets.categoryPlaceholder')}
          categories={categories}
          selectedId={categoryId}
          onChange={onCategoryChange}
        />
        <Field
          label={t('budget.categoryBudgets.amountLabel')}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType="numeric"
          placeholder="0.00"
        />
        <Button
          label={isSaving ? t('budget.categoryBudgets.saving') : t('budget.categoryBudgets.saveLimit')}
          onPress={onSave}
          disabled={!categoryId || !amount || isSaving}
        />
      </View>
    </Section>
  );
}
