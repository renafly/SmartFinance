import { useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Page, Card, Section, Field, Button, Pill } from '@/components/migrated-page';
import { Badge, EmptyState } from '@/components/data-surface';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { IconPicker } from '@/components/icon-picker';
import { DropdownMenu, SelectionShell } from '@/components/selection-shell';

import { useAuth } from '../../providers/AuthProvider';
import { useCategories, useCreateCategory, useUpdateCategory, useArchiveCategory, useRestoreCategory, useDeleteCategory } from '../../features/categories/hooks';

const types = ['income', 'expense', 'account'] as const;
const categoryIconSuggestions: Record<(typeof types)[number], readonly string[]> = {
  expense: [
    'cart-outline',
    'basket-outline',
    'restaurant-outline',
    'fast-food-outline',
    'cafe-outline',
    'beer-outline',
    'car-outline',
    'train-outline',
    'bus-outline',
    'airplane-outline',
    'home-outline',
    'build-outline',
    'medical-outline',
    'fitness-outline',
    'school-outline',
    'gift-outline',
    'game-controller-outline',
    'shirt-outline',
    'phone-portrait-outline',
    'wifi-outline',
    'receipt-outline',
    'card-outline',
    'cash-outline',
    'pricetag-outline',
  ],
  income: [
    'cash-outline',
    'wallet-outline',
    'card-outline',
    'briefcase-outline',
    'business-outline',
    'trending-up-outline',
    'stats-chart-outline',
    'bar-chart-outline',
    'pie-chart-outline',
    'trophy-outline',
    'gift-outline',
    'home-outline',
    'people-outline',
    'person-outline',
    'rocket-outline',
    'diamond-outline',
    'sparkles-outline',
    'add-circle-outline',
    'arrow-up-circle-outline',
    'checkmark-done-outline',
  ],
  account: [
    'wallet-outline',
    'card-outline',
    'cash-outline',
    'business-outline',
    'home-outline',
    'shield-checkmark-outline',
    'lock-closed-outline',
    'key-outline',
    'save-outline',
    'archive-outline',
    'layers-outline',
    'folder-outline',
    'pie-chart-outline',
    'trending-up-outline',
    'swap-horizontal-outline',
    'repeat-outline',
    'receipt-outline',
    'calculator-outline',
  ],
};

type CategoryLike = {
  id: string;
  name: string;
  type: (typeof types)[number];
  icon: string | null;
  parent_id: string | null;
  is_archived: boolean;
};

type CategoryEditDraft = {
  id: string;
  name: string;
  type: CategoryLike['type'];
  parentId: string;
  icon: string | null;
};

function getTypeIcon(type: CategoryLike['type']) {
  switch (type) {
    case 'income':
      return 'trending-up-outline';
    case 'expense':
      return 'trending-down-outline';
    case 'account':
      return 'wallet-outline';
    default:
      return 'pricetag-outline';
  }
}

function getTypeColor(type: CategoryLike['type'], colors: ReturnType<typeof useTheme>['colors']) {
  switch (type) {
    case 'income':
      return colors.success;
    case 'expense':
      return colors.destructive;
    case 'account':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
}

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const { householdId } = useAuth();
  const { width } = useWindowDimensions();
  const [createType, setCreateType] = useState<(typeof types)[number]>('expense');
  const [createTypeMenuOpen, setCreateTypeMenuOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | (typeof types)[number]>('all');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [icon, setIcon] = useState<string | null>('pricetag-outline');
  const [editCategory, setEditCategory] = useState<CategoryEditDraft | null>(null);
  const [editTypeMenuOpen, setEditTypeMenuOpen] = useState(false);
  const [menuCategory, setMenuCategory] = useState<CategoryLike | null>(null);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const archiveCategory = useArchiveCategory();
  const restoreCategory = useRestoreCategory();
  const deleteCategory = useDeleteCategory();
  const categoriesQuery = useCategories();

  const categories = (categoriesQuery.data ?? []) as CategoryLike[];
  const activeCategories = categories.filter((category) => !category.is_archived);
  const archivedCategories = categories.filter((category) => category.is_archived);
  const filteredCategories = typeFilter === 'all'
    ? categories
    : categories.filter((category) => category.type === typeFilter);
  const showTableHeader = width >= 760;

  const canCreateCategory = !createCategory.isPending && name.trim().length > 0;
  const canSaveCategory = Boolean(editCategory?.name.trim()) && !updateCategory.isPending;

  const summaryCards = useMemo(
    () => [
      {
        label: t('categories.summary.total'),
        value: String(categories.length),
        icon: 'layers-outline',
      },
      {
        label: t('categories.summary.active'),
        value: String(activeCategories.length),
        icon: 'checkmark-circle-outline',
      },
      {
        label: t('categories.summary.archived'),
        value: String(archivedCategories.length),
        icon: 'archive-outline',
      },
    ],
    [activeCategories.length, archivedCategories.length, categories.length, t],
  );

  const filteredActiveCount = filteredCategories.filter((category) => !category.is_archived).length;
  const filteredArchivedCount = filteredCategories.length - filteredActiveCount;

  async function handleCreate() {
    if (!householdId || !name.trim()) return;

    await createCategory.mutateAsync({
      household_id: householdId,
      name: name.trim(),
      type: createType,
      icon,
      parent_id: parentId || null,
    } as any);

    setName('');
    setParentId('');
    setIcon(null);
  }

  function openEditCategory(category: CategoryLike) {
    setMenuCategory(null);
    setEditCategory({
      id: category.id,
      name: category.name,
      type: category.type,
      parentId: category.parent_id ?? '',
      icon: category.icon,
    });
    setEditTypeMenuOpen(false);
  }

  async function handleSaveCategory() {
    if (!editCategory?.name.trim()) return;

    await updateCategory.mutateAsync({
      id: editCategory.id,
      name: editCategory.name.trim(),
      type: editCategory.type,
      icon: editCategory.icon,
      parent_id: editCategory.parentId.trim() || null,
    });

    setEditCategory(null);
    setEditTypeMenuOpen(false);
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                  <Ionicons name={item.icon as any} size={16} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: typography.letterSpacing[10], fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[12] } as any}>
                    {item.label}
                  </Text>
                </View>
              <Text style={{ color: colors.text, fontSize: typography.fontSize[28], fontWeight: typography.fontWeight.extraBold } as any}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3), alignItems: 'flex-start' } as any}>
        <View style={{ flexGrow: 1, flexBasis: width >= 980 ? '38%' : '100%' } as any}>
          <Card>
          <Section title={t('categories.createTitle')} subtitle={t('categories.createSubtitle')}>
            <View style={{ gap: spacing(3) } as any}>
              <View style={{ gap: spacing(2) } as any}>
                <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold } as any}>
                  {t('categories.selectedType')}
                </Text>
                <Pressable
                  onPress={() => setCreateTypeMenuOpen((current) => !current)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: spacing(3.5),
                    paddingVertical: spacing(3),
                    borderRadius: radius.mdPlus,
                    backgroundColor: colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: colors.border,
                  } as any}
                >
                  <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold } as any}>
                    {t(`categories.types.${createType}`)}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.bold } as any}>
                    {createTypeMenuOpen ? '▴' : '▾'}
                  </Text>
                </Pressable>

                {createTypeMenuOpen ? (
                  <View style={{ gap: spacing(2) } as any}>
                    {types.map((item) => {
                      const isActive = createType === item;

                      return (
                        <Pressable
                          key={item}
                          onPress={() => {
                            setCreateType(item);
                            setCreateTypeMenuOpen(false);
                          }}
                          style={{
                            paddingHorizontal: spacing(3.5),
                            paddingVertical: spacing(3),
                            borderRadius: radius.mdPlus,
                            backgroundColor: isActive ? colors.primary : colors.surfaceMuted,
                            borderWidth: 1,
                            borderColor: isActive ? colors.primary : colors.border,
                          } as any}
                        >
                          <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold } as any}>
                            {t(`categories.types.${item}`)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <Field label={t('categories.name')} value={name} onChangeText={setName} />
              <Field
                label={t('categories.parentId')}
                value={parentId}
                onChangeText={setParentId}
                placeholder={t('categories.optional')}
              />
              <IconPicker
                label={t('categories.icon')}
                value={icon}
                onChange={setIcon}
                suggestedIcons={categoryIconSuggestions[createType]}
                placeholder={t('categories.noIcon')}
                hint={t('categories.iconHint')}
                closeLabel={t('cancel')}
                searchPlaceholder={t('categories.searchIcons')}
                noneLabel={t('categories.noIcon')}
              />
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], lineHeight: typography.lineHeight[17] } as any}>
                {t('categories.parentHint')}
              </Text>

              <Button label={createCategory.isPending ? t('creating') : t('categories.create')} onPress={() => void handleCreate()} disabled={!canCreateCategory} />
            </View>
          </Section>
          </Card>
        </View>

        <View style={{ flexGrow: 2, flexBasis: width >= 980 ? '58%' : '100%' } as any}>
          <Card>
          <Section
            title={t('categories.listTitle')}
            subtitle={t('categories.listSubtitle', { count: filteredCategories.length })}
          >
            <View style={{ gap: spacing(2.5) } as any}>
              <View style={{ gap: spacing(1.5) } as any}>
                <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold } as any}>
                  {t('categories.filterTitle')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                  <Pill
                    label={t('categories.filters.all')}
                    active={typeFilter === 'all'}
                    onPress={() => setTypeFilter('all')}
                  />
                  {types.map((item) => (
                    <Pill
                      key={item}
                      label={t(`categories.types.${item}`)}
                      active={typeFilter === item}
                      onPress={() => setTypeFilter(item)}
                    />
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                <Badge label={`${t('categories.active')} ${filteredActiveCount}`} tone="success" />
                <Badge label={`${t('categories.archived')} ${filteredArchivedCount}`} tone={filteredArchivedCount > 0 ? 'destructive' : 'neutral'} />
              </View>
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

              {filteredCategories.length > 0 ? (
                filteredCategories.map((category, index) => (
                  <View
                    key={category.id}
                    style={{
                      flexDirection: showTableHeader ? 'row' : 'column',
                      alignItems: showTableHeader ? 'center' : 'flex-start',
                      gap: spacing(2),
                      paddingHorizontal: spacing(3),
                      paddingVertical: spacing(2.5),
                      backgroundColor: index % 2 === 0 ? colors.surfaceMuted : colors.surface,
                      borderBottomWidth: index === filteredCategories.length - 1 ? 0 : 1,
                      borderBottomColor: colors.border,
                    } as any}
                  >
                    <View style={{ flex: showTableHeader ? 2 : undefined, width: showTableHeader ? undefined : '100%', gap: spacing(1) } as any}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                        <View style={{ width: spacing(8), height: spacing(8), borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' } as any}>
                          <Ionicons name={(category.icon ?? 'pricetag-outline') as any} size={18} color={colors.primary} />
                        </View>
                        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[15] } as any}>
                          {category.name}
                        </Text>
                      </View>
                      {!showTableHeader && category.parent_id ? (
                        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
                          {t('categories.parentId')}: {category.parent_id}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ flex: showTableHeader ? 1 : undefined, width: showTableHeader ? undefined : '100%' } as any}>
                      <View
                        accessibilityLabel={t(`categories.types.${category.type}`)}
                        style={{
                          alignSelf: 'flex-start',
                          width: spacing(8),
                          height: spacing(8),
                          borderRadius: radius.full,
                          backgroundColor: colors.surfaceMuted,
                          borderWidth: 1,
                          borderColor: colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        } as any}
                      >
                        <Ionicons name={getTypeIcon(category.type) as any} size={18} color={getTypeColor(category.type, colors)} />
                      </View>
                    </View>

                    <View style={{ flex: showTableHeader ? 1 : undefined, width: showTableHeader ? undefined : '100%' } as any}>
                      <View
                        accessibilityLabel={category.is_archived ? t('categories.archived') : t('categories.active')}
                        style={{
                          alignSelf: 'flex-start',
                          width: spacing(8),
                          height: spacing(8),
                          borderRadius: radius.full,
                          backgroundColor: colors.surfaceMuted,
                          borderWidth: 1,
                          borderColor: colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        } as any}
                      >
                        <Ionicons
                          name={category.is_archived ? 'archive-outline' : 'checkmark-circle-outline'}
                          size={18}
                          color={category.is_archived ? colors.destructive : colors.success}
                        />
                      </View>
                    </View>

                    <Text style={{ flex: showTableHeader ? 1.2 : undefined, width: showTableHeader ? undefined : '100%', color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>
                      {category.parent_id ? category.parent_id : t('categories.noParent')}
                    </Text>

                    <View style={{ flex: showTableHeader ? 1.1 : undefined, width: showTableHeader ? undefined : '100%', alignItems: showTableHeader ? 'flex-end' : 'flex-start' } as any}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('categories.table.actions')}
                        onPress={() => setMenuCategory(category)}
                        style={({ pressed }) => [
                          {
                            width: spacing(9),
                            height: spacing(9),
                            borderRadius: radius.mdPlus,
                            backgroundColor: colors.surfaceMuted,
                            borderWidth: 1,
                            borderColor: colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                          },
                          pressed && { opacity: 0.85 },
                        ] as any}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ padding: spacing(4) } as any}>
                  <EmptyState
                    title={t('categories.emptyFilteredTitle')}
                    description={t('categories.emptyFilteredSubtitle')}
                    icon="filter-outline"
                  />
                </View>
              )}
            </View>
          </Section>
          </Card>
        </View>
      </View>

      <SelectionShell
        visible={editCategory !== null}
        title={t('categories.editTitle')}
        subtitle={editCategory?.name ?? t('categories.listTitle')}
        closeLabel={t('cancel')}
        onClose={() => {
          setEditCategory(null);
          setEditTypeMenuOpen(false);
        }}
      >
        {editCategory ? (
          <View style={{ gap: spacing(3) } as any}>
            <Field
              label={t('categories.name')}
              value={editCategory.name}
              onChangeText={(value) => setEditCategory((current) => (current ? { ...current, name: value } : current))}
            />

            <View style={{ gap: spacing(2) } as any}>
              <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold } as any}>
                {t('categories.selectedType')}
              </Text>
              <Pressable
                onPress={() => setEditTypeMenuOpen((current) => !current)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing(3.5),
                  paddingVertical: spacing(3),
                  borderRadius: radius.mdPlus,
                  backgroundColor: colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: colors.border,
                } as any}
              >
                <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold } as any}>
                  {t(`categories.types.${editCategory.type}`)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.bold } as any}>
                  {editTypeMenuOpen ? '▴' : '▾'}
                </Text>
              </Pressable>

              {editTypeMenuOpen ? (
                <View style={{ gap: spacing(2) } as any}>
                  {types.map((item) => {
                    const isActive = editCategory.type === item;

                    return (
                      <Pressable
                        key={item}
                        onPress={() => {
                          setEditCategory((current) => (current ? { ...current, type: item } : current));
                          setEditTypeMenuOpen(false);
                        }}
                        style={{
                          paddingHorizontal: spacing(3.5),
                          paddingVertical: spacing(3),
                          borderRadius: radius.mdPlus,
                          backgroundColor: isActive ? colors.primary : colors.surfaceMuted,
                          borderWidth: 1,
                          borderColor: isActive ? colors.primary : colors.border,
                        } as any}
                      >
                        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold } as any}>
                          {t(`categories.types.${item}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <Field
              label={t('categories.parentId')}
              value={editCategory.parentId}
              onChangeText={(value) => setEditCategory((current) => (current ? { ...current, parentId: value } : current))}
              placeholder={t('categories.optional')}
            />

            <IconPicker
              label={t('categories.icon')}
              value={editCategory.icon}
              onChange={(value) => setEditCategory((current) => (current ? { ...current, icon: value } : current))}
              suggestedIcons={categoryIconSuggestions[editCategory.type]}
              placeholder={t('categories.noIcon')}
              hint={t('categories.iconHint')}
              closeLabel={t('cancel')}
              searchPlaceholder={t('categories.searchIcons')}
              noneLabel={t('categories.noIcon')}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing(2), flexWrap: 'wrap' } as any}>
              <Button
                label={t('cancel')}
                variant="secondary"
                onPress={() => {
                  setEditCategory(null);
                  setEditTypeMenuOpen(false);
                }}
              />
              <Button
                label={updateCategory.isPending ? t('saving') : t('settings.saveChanges')}
                onPress={() => void handleSaveCategory()}
                disabled={!canSaveCategory}
              />
            </View>
          </View>
        ) : null}
      </SelectionShell>

      <DropdownMenu
        visible={menuCategory !== null}
        title={menuCategory?.name ?? t('categories.listTitle')}
        closeLabel={t('cancel')}
        onClose={() => setMenuCategory(null)}
        items={[
          {
            key: 'edit',
            label: t('categories.edit'),
            iconName: 'create-outline',
            onPress: () => {
              if (!menuCategory) return;
              openEditCategory(menuCategory);
            },
          },
          {
            key: 'archive',
            label: menuCategory?.is_archived ? t('categories.restore') : t('categories.archive'),
            iconName: menuCategory?.is_archived ? 'refresh-outline' : 'archive-outline',
            onPress: () => {
              if (!menuCategory) return;
              void (menuCategory.is_archived
                ? restoreCategory.mutateAsync(menuCategory.id)
                : archiveCategory.mutateAsync(menuCategory.id));
              setMenuCategory(null);
            },
          },
          {
            key: 'delete',
            label: t('delete'),
            iconName: 'trash-outline',
            danger: true,
            onPress: () => {
              if (!menuCategory) return;
              void deleteCategory.mutateAsync(menuCategory.id);
              setMenuCategory(null);
            },
          },
        ]}
      />
    </Page>
  );
}
