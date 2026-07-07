import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, Field, Button, Pill } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { useCategories, useCreateCategory, useArchiveCategory, useRestoreCategory, useDeleteCategory } from '../../features/categories/hooks';

const types = ['income', 'expense', 'account'] as const;

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const { householdId } = useAuth();
  const [type, setType] = useState<(typeof types)[number]>('expense');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const createCategory = useCreateCategory();
  const archiveCategory = useArchiveCategory();
  const restoreCategory = useRestoreCategory();
  const deleteCategory = useDeleteCategory();
  const categoriesQuery = useCategories(type);
  const canCreateCategory = !createCategory.isPending && name.trim().length > 0;

  async function handleCreate() {
    if (!householdId || !name.trim()) return;

    await createCategory.mutateAsync({
      household_id: householdId,
      name: name.trim(),
      type,
      parent_id: parentId || null,
    } as any);

    setName('');
    setParentId('');
  }

  return (
    <Page title={t('categories.title')} subtitle={t('categories.subtitle')}>
      <Card>
        <Section title={t('categories.createTitle')}>
          <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
            {types.map((item) => (
              <Pill key={item} label={t(`categories.types.${item}`)} active={type === item} onPress={() => setType(item)} />
            ))}
          </View>
          <Field label={t('categories.name')} value={name} onChangeText={setName} />
          <Field label={t('categories.parentId')} value={parentId} onChangeText={setParentId} placeholder={t('categories.optional')} />
          <Button label={createCategory.isPending ? t('creating') : t('categories.create')} onPress={() => void handleCreate()} disabled={!canCreateCategory} />
        </Section>
      </Card>

      <Section title={t('categories.listTitle')} subtitle={t('categories.listSubtitle', { type: t(`categories.types.${type}`) })}>
        <View style={{ gap: spacing(2.5) }}>
          {(categoriesQuery.data ?? []).map((category: any) => (
            <Card key={category.id}>
              <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{category.name}</Text>
              <Text style={{ color: colors.textSecondary }}>{t(`categories.types.${category.type}`)}{category.parent_id ? ` · ${t('categories.parent')} ${category.parent_id}` : ''}</Text>
              <Text style={{ color: category.is_archived ? colors.destructive : colors.success, fontWeight: typography.fontWeight.semibold }}>{category.is_archived ? t('categories.archived') : t('categories.active')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                <Button
                  label={category.is_archived ? t('categories.restore') : t('categories.archive')}
                  variant="secondary"
                  onPress={() => void (category.is_archived ? restoreCategory.mutateAsync(category.id) : archiveCategory.mutateAsync(category.id))}
                />
                <Button label={t('delete')} variant="danger" onPress={() => void deleteCategory.mutateAsync(category.id)} />
              </View>
            </Card>
          ))}
        </View>
      </Section>
    </Page>
  );
}
