import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/migrated-page';
import { SelectionShell } from '@/components/selection-shell';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

type DeleteCategoryBudgetDialogProps = {
  category: { id: string; name: string } | null;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Confirms removing a category from Category Budgets. Same shell/pattern as
 * DeleteTagDialog: spells out that only the limit goes -- the category, its
 * transactions and its recurring expenses are kept.
 */
export function DeleteCategoryBudgetDialog({ category, deleting, onConfirm, onClose }: DeleteCategoryBudgetDialogProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();

  return (
    <SelectionShell
      visible={!!category}
      title={category ? t('budget.categoryBudgets.deleteTitle', { name: category.name }) : ''}
      closeLabel={t('cancel')}
      onClose={onClose}
      bodyScrollable={false}
    >
      <View style={{ gap: spacing(3) }}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[14], lineHeight: typography.lineHeight[20] }}>
          {t('budget.categoryBudgets.deleteBody')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
          <Button
            label={deleting ? t('deleting') : t('budget.categoryBudgets.deleteConfirm')}
            variant="danger"
            disabled={deleting}
            onPress={onConfirm}
          />
          <Button label={t('cancel')} variant="secondary" disabled={deleting} onPress={onClose} />
        </View>
      </View>
    </SelectionShell>
  );
}
