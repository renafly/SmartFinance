import { useState } from 'react';
import { Text, View } from 'react-native';

import { Page, Card, Section, Field, Button, Pill } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { useCategories, useCreateCategory, useArchiveCategory, useRestoreCategory, useDeleteCategory } from '../../features/categories/hooks';

const types = ['income', 'expense', 'account'] as const;

export default function CategoriesScreen() {
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
    <Page title="Categories" subtitle="Create and manage the category structure used by transactions.">
      <Card>
        <Section title="Create category">
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {types.map((item) => (
              <Pill key={item} label={item} active={type === item} onPress={() => setType(item)} />
            ))}
          </View>
          <Field label="Name" value={name} onChangeText={setName} />
          <Field label="Parent category id" value={parentId} onChangeText={setParentId} placeholder="Optional" />
          <Button label={createCategory.isPending ? 'Creating...' : 'Create category'} onPress={() => void handleCreate()} disabled={!canCreateCategory} />
        </Section>
      </Card>

      <Section title="Categories" subtitle={`Showing ${type} categories.`}>
        <View style={{ gap: 10 }}>
          {(categoriesQuery.data ?? []).map((category: any) => (
            <Card key={category.id}>
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{category.name}</Text>
              <Text style={{ color: '#94A3B8' }}>{category.type}{category.parent_id ? ` · parent ${category.parent_id}` : ''}</Text>
              <Text style={{ color: category.is_archived ? '#FCA5A5' : '#86EFAC', fontWeight: '600' }}>{category.is_archived ? 'Archived' : 'Active'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button
                  label={category.is_archived ? 'Restore' : 'Archive'}
                  variant="secondary"
                  onPress={() => void (category.is_archived ? restoreCategory.mutateAsync(category.id) : archiveCategory.mutateAsync(category.id))}
                />
                <Button label="Delete" variant="danger" onPress={() => void deleteCategory.mutateAsync(category.id)} />
              </View>
            </Card>
          ))}
        </View>
      </Section>
    </Page>
  );
}
