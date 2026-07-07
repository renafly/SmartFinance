import { useMemo, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Page, Card, Section, Field, Button, Pill } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import { useAuth } from '../../providers/AuthProvider';
import { useCategories, useCreateCategory, useArchiveCategory, useRestoreCategory, useDeleteCategory } from '../../features/categories/hooks';

const types = ['income', 'expense', 'account'] as const;

type CategoryLike = {
  id: string;
  name: string;
  type: (typeof types)[number];
  parent_id: string | null;
  is_archived: boolean;
};

function getTypeAccent(type: CategoryLike['type'], colors: any) {
  switch (type) {
    case 'income':
      return { backgroundColor: colors.successSoft, color: colors.success };
    case 'expense':
      return { backgroundColor: colors.destructiveSoft, color: colors.destructive };
    case 'account':
      return { backgroundColor: colors.warningSoft, color: colors.warning };
    default:
      return { backgroundColor: colors.surfaceMuted, color: colors.textSecondary };
  }
}

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const { householdId } = useAuth();
  const { width } = useWindowDimensions();
  const [createType, setCreateType] = useState<(typeof types)[number]>('expense');
  const [filterType, setFilterType] = useState<(typeof types)[number]>('expense');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const createCategory = useCreateCategory();
  const archiveCategory = useArchiveCategory();
  const restoreCategory = useRestoreCategory();
  const deleteCategory = useDeleteCategory();
  const categoriesQuery = useCategories(filterType);

  const categories = (categoriesQuery.data ?? []) as CategoryLike[];
  const activeCategories = categories.filter((category) => !category.is_archived);
  const archivedCategories = categories.filter((category) => category.is_archived);
  const showTableHeader = width >= 760;

  const canCreateCategory = !createCategory.isPending && name.trim().length > 0;

  const summaryCards = useMemo(
    () => [
      {
        label: t('categories.summary.total'),
        value: String(categories.length),
      },
      {
        label: t('categories.summary.active'),
        value: String(activeCategories.length),
      },
      {
        label: t('categories.summary.archived'),
        value: String(archivedCategories.length),
      },
    ],
    [activeCategories.length, archivedCategories.length, categories.length, t],
  );

  async function handleCreate() {
    if (!householdId || !name.trim()) return;

    await createCategory.mutateAsync({
      household_id: householdId,
      name: name.trim(),
      type: createType,
      parent_id: parentId || null,
    } as any);

    setName('');
    setParentId('');
  }

  return (
    <Page title={t('categories.title')} subtitle={t('categories.subtitle')}>
      <Card>
        <Section title={t('categories.summaryTitle')} subtitle={t('categories.summarySubtitle')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) } as any}>
            {summaryCards.map((item) => (
              <View
                key={item.label}
                style={{
                  flexBasis: width >= 980 ? '31%' : '100%',
                  flexGrow: 1,
                  minWidth: 180,
                  padding: spacing(3),
                  borderRadius: radius.lg,
                  backgroundColor: colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: colors.border,
                } as any}
              >
                <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10], fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[12] } as any}>
                  {item.label}
                </Text>
                <Text style={{ color: colors.text, fontSize: typography.fontSize[28], fontWeight: typography.fontWeight.extraBold } as any}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      </Card>

      <Card>
        <Section
          title={t('categories.filterTitle')}
          subtitle={t('categories.filterSubtitle')}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
            {types.map((item) => (
              <Pill
                key={item}
                label={t(`categories.types.${item}`)}
                active={filterType === item}
                onPress={() => setFilterType(item)}
              />
            ))}
          </View>
        </Section>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3), alignItems: 'flex-start' } as any}>
        <View style={{ flexGrow: 1, flexBasis: width >= 980 ? '38%' : '100%' } as any}>
          <Card>
          <Section title={t('categories.createTitle')} subtitle={t('categories.createSubtitle')}>
            <View style={{ gap: spacing(3) } as any}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                {types.map((item) => (
                  <Pill key={item} label={t(`categories.types.${item}`)} active={createType === item} onPress={() => setCreateType(item)} />
                ))}
              </View>

              <Field label={t('categories.name')} value={name} onChangeText={setName} />
              <Field
                label={t('categories.parentId')}
                value={parentId}
                onChangeText={setParentId}
                placeholder={t('categories.optional')}
              />
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], lineHeight: typography.lineHeight[17] } as any}>
                {t('categories.parentHint')}
              </Text>

              <View style={{ gap: spacing(2) } as any}>
                <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold } as any}>
                  {t('categories.selectedType')}
                </Text>
                <View style={{ padding: spacing(3), borderRadius: radius.lg, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border } as any}>
                  <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold } as any}>
                    {t(`categories.types.${createType}`)}
                  </Text>
                </View>
              </View>

              <Button label={createCategory.isPending ? t('creating') : t('categories.create')} onPress={() => void handleCreate()} disabled={!canCreateCategory} />
            </View>
          </Section>
          </Card>
        </View>

        <View style={{ flexGrow: 2, flexBasis: width >= 980 ? '58%' : '100%' } as any}>
          <Card>
          <Section
            title={t('categories.listTitle')}
            subtitle={t('categories.listSubtitle', { type: t(`categories.types.${filterType}`) })}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
              {activeCategories.length > 0 ? (
                <Pill label={`${t('categories.active')} ${activeCategories.length}`} active />
              ) : null}
              {archivedCategories.length > 0 ? (
                <Pill label={`${t('categories.archived')} ${archivedCategories.length}`} active={false} />
              ) : null}
            </View>

            <View
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                overflow: 'hidden',
                backgroundColor: colors.surfaceMuted,
              } as any}
            >
              {showTableHeader ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.surface,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    paddingHorizontal: spacing(3),
                    paddingVertical: spacing(2),
                  } as any}
                >
                  <Text style={{ flex: 2, color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.extraBold, textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10] } as any}>
                    {t('categories.table.name')}
                  </Text>
                  <Text style={{ flex: 1, color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.extraBold, textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10] } as any}>
                    {t('categories.table.type')}
                  </Text>
                  <Text style={{ flex: 1, color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.extraBold, textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10] } as any}>
                    {t('categories.table.status')}
                  </Text>
                  <Text style={{ flex: 1.2, color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.extraBold, textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10] } as any}>
                    {t('categories.table.parent')}
                  </Text>
                  <Text style={{ flex: 1.1, color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.extraBold, textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10], textAlign: 'right' } as any}>
                    {t('categories.table.actions')}
                  </Text>
                </View>
              ) : null}

              {categories.map((category, index) => {
                const accent = getTypeAccent(category.type, colors);
                const statusAccent = category.is_archived
                  ? { backgroundColor: colors.destructiveSoft, color: colors.destructive }
                  : { backgroundColor: colors.successSoft, color: colors.success };
                return (
                  <View
                    key={category.id}
                    style={{
                      flexDirection: showTableHeader ? 'row' : 'column',
                      alignItems: showTableHeader ? 'center' : 'flex-start',
                      gap: spacing(2),
                      paddingHorizontal: spacing(3),
                      paddingVertical: spacing(2.5),
                      backgroundColor: index % 2 === 0 ? colors.surfaceMuted : colors.surface,
                      borderBottomWidth: index === categories.length - 1 ? 0 : 1,
                      borderBottomColor: colors.border,
                    } as any}
                  >
                    <View style={{ flex: showTableHeader ? 2 : undefined, width: showTableHeader ? undefined : '100%', gap: spacing(1) } as any}>
                      <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[15] } as any}>
                        {category.name}
                      </Text>
                      {!showTableHeader && category.parent_id ? (
                        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
                          {t('categories.parentId')}: {category.parent_id}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ flex: showTableHeader ? 1 : undefined, width: showTableHeader ? undefined : '100%' } as any}>
                      <View style={{ alignSelf: showTableHeader ? 'flex-start' : 'flex-start', paddingHorizontal: spacing(2), paddingVertical: spacing(0.75), borderRadius: radius.full, backgroundColor: accent.backgroundColor } as any}>
                        <Text style={{ color: accent.color, fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[12], textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10] } as any}>
                          {t(`categories.types.${category.type}`)}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flex: showTableHeader ? 1 : undefined, width: showTableHeader ? undefined : '100%' } as any}>
                      <View style={{ alignSelf: showTableHeader ? 'flex-start' : 'flex-start', paddingHorizontal: spacing(2), paddingVertical: spacing(0.75), borderRadius: radius.full, backgroundColor: statusAccent.backgroundColor } as any}>
                        <Text style={{ color: statusAccent.color, fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[12], textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10] } as any}>
                          {category.is_archived ? t('categories.archived') : t('categories.active')}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ flex: showTableHeader ? 1.2 : undefined, width: showTableHeader ? undefined : '100%', color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
                      {category.parent_id ? category.parent_id : t('categories.noParent')}
                    </Text>

                    <View style={{ flex: showTableHeader ? 1.1 : undefined, width: showTableHeader ? undefined : '100%', flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), justifyContent: showTableHeader ? 'flex-end' : 'flex-start' } as any}>
                      <Button
                        label={category.is_archived ? t('categories.restore') : t('categories.archive')}
                        variant="secondary"
                        onPress={() => void (category.is_archived ? restoreCategory.mutateAsync(category.id) : archiveCategory.mutateAsync(category.id))}
                      />
                      <Button
                        label={t('delete')}
                        variant="danger"
                        onPress={() => void deleteCategory.mutateAsync(category.id)}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </Section>
          </Card>
        </View>
      </View>
    </Page>
  );
}
