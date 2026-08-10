import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Page, Card, Section, Field, Button, Pill } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { IconPicker } from '@/components/icon-picker';
import { SelectionOptionRow, SelectionShell, SelectionTrigger } from '@/components/selection-shell';
import { buildCategoryExplorerTree, getDescendantCategoryIds, type ExplorerNode } from '@/features/categories/explorer-data';
import { CategoryBrowserSidebar } from '@/features/categories/components/category-browser-sidebar';
import { CategoryBrowserDetailPanel } from '@/features/categories/components/category-browser-detail-panel';
import { categoryBrowserPeriodRange, computeCategoryBrowserStats, type CategoryBrowserPeriod } from '@/features/categories/category-browser-data';
import { DEFAULT_EXPENSE_CATEGORY_SEED, DEFAULT_INCOME_CATEGORY_SEED } from '@/features/categories/default-category-seed';
import { useAllTransactions } from '@/features/transactions/hooks/useTransactions';

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
  is_discretionary?: boolean;
};

type CategoryEditDraft = {
  id: string;
  name: string;
  type: CategoryLike['type'];
  parentId: string;
  icon: string | null;
  isArchived: boolean;
  isDiscretionary: boolean;
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
  const { width, height } = useWindowDimensions();
  const isWide = width >= 980;
  // Single source of truth for both panels' height so neither the category
  // list nor the detail panel can ever be taller than the other -- each
  // panel scrolls its own content internally instead of growing the box.
  const browserPanelHeight = isWide ? Math.max(420, Math.min(height * 0.62, 720)) : 480;

  const [createType, setCreateType] = useState<(typeof types)[number]>('expense');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [editParentPickerOpen, setEditParentPickerOpen] = useState(false);
  // Shared expand/collapse state for both parent-category pickers below --
  // safe to share since only one of the two is ever visible at a time.
  const [expandedParentGroupIds, setExpandedParentGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [icon, setIcon] = useState<string | null>('pricetag-outline');
  const [editCategory, setEditCategory] = useState<CategoryEditDraft | null>(null);
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  // State for the two-panel category browser (see categories.browser.* below).
  const [browserSearch, setBrowserSearch] = useState('');
  const [browserSelectedNodeId, setBrowserSelectedNodeId] = useState<string | null>(null);
  const [browserHoverNodeId, setBrowserHoverNodeId] = useState<string | null>(null);
  const [browserCollapsedIds, setBrowserCollapsedIds] = useState<Set<string>>(() => new Set());
  const [browserPeriod, setBrowserPeriod] = useState<CategoryBrowserPeriod>('3m');

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const archiveCategory = useArchiveCategory();
  const restoreCategory = useRestoreCategory();
  const deleteCategory = useDeleteCategory();
  // Needs archived categories too (not just active) — the browser tree and
  // the parent-category pickers below rely on the FULL chain to correctly
  // compute descendants for cycle prevention. If an archived category sat
  // in the middle of a chain and was silently excluded here, its still-active
  // children would look like orphaned top-level categories instead of
  // descendants of whatever's being edited, and the "exclude all
  // descendants" check below would miss them.
  const categoriesQuery = useCategories(undefined, true);

  const categories = (categoriesQuery.data ?? []) as CategoryLike[];
  const activeCategories = categories.filter((category) => !category.is_archived);

  const canCreateCategory = !createCategory.isPending && name.trim().length > 0;
  const canSaveCategory = Boolean(editCategory?.name.trim()) && !updateCategory.isPending;

  const hasExpenseMainCategories = activeCategories.some((category) => category.type === 'expense' && !category.parent_id);
  const hasIncomeMainCategories = activeCategories.some((category) => category.type === 'income' && !category.parent_id);

  // Additive-only: skips any main category whose name already exists for
  // that type, so re-running this (or running it when only expense or only
  // income is missing) never creates duplicates. For a full wipe-and-reset
  // instead, see scripts/seed_default_categories.sql.
  async function handleSeedDefaultCategories() {
    if (!householdId || seedingDefaults) return;

    setSeedingDefaults(true);
    try {
      const existingExpenseMainNames = new Set(
        activeCategories.filter((category) => category.type === 'expense' && !category.parent_id).map((category) => category.name),
      );
      const existingIncomeMainNames = new Set(
        activeCategories.filter((category) => category.type === 'income' && !category.parent_id).map((category) => category.name),
      );

      for (const main of DEFAULT_EXPENSE_CATEGORY_SEED) {
        const mainName = t(`categories.defaults.${main.key}`);
        if (existingExpenseMainNames.has(mainName)) continue;

        const created: any = await createCategory.mutateAsync({
          household_id: householdId,
          name: mainName,
          type: 'expense',
          icon: main.icon,
          parent_id: null,
        } as any);
        const createdParentId = created?.id;
        if (!createdParentId) continue;

        for (const sub of main.subcategories) {
          await createCategory.mutateAsync({
            household_id: householdId,
            name: t(`categories.defaultsSub.${main.key}.${sub.key}`),
            type: 'expense',
            icon: sub.icon,
            parent_id: createdParentId,
          } as any);
        }
      }

      for (const main of DEFAULT_INCOME_CATEGORY_SEED) {
        const mainName = t(`categories.defaultsIncome.${main.key}`);
        if (existingIncomeMainNames.has(mainName)) continue;

        await createCategory.mutateAsync({
          household_id: householdId,
          name: mainName,
          type: 'income',
          icon: main.icon,
          parent_id: null,
        } as any);
      }
    } finally {
      setSeedingDefaults(false);
    }
  }

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
        value: String(categories.length - activeCategories.length),
        icon: 'archive-outline',
      },
    ],
    [activeCategories.length, categories.length, t],
  );

  // The category browser's tree: every category (income/expense/account,
  // active and archived) reshaped into type -> main -> sub. See
  // explorer-data.ts for the full rationale.
  const tree = useMemo(
    () =>
      buildCategoryExplorerTree(categories, {
        typeLabels: {
          income: t('categories.types.income'),
          expense: t('categories.types.expense'),
          account: t('categories.types.account'),
        },
        typeIcons: {
          income: getTypeIcon('income') as any,
          expense: getTypeIcon('expense') as any,
          account: getTypeIcon('account') as any,
        },
        typeColors: {
          income: getTypeColor('income', colors),
          expense: getTypeColor('expense', colors),
          account: getTypeColor('account', colors),
        },
      }),
    [categories, colors, t],
  );

  // --- Category browser ---------------------------------------------------
  const browserMatchedIds = useMemo(() => {
    const query = browserSearch.trim().toLowerCase();
    if (!query) return null;
    const set = new Set<string>();
    tree.nodesById.forEach((node, id) => {
      if (node.label.toLowerCase().includes(query)) set.add(id);
    });
    return set;
  }, [browserSearch, tree]);

  const browserSelectedNode = browserSelectedNodeId ? (tree.nodesById.get(browserSelectedNodeId) ?? null) : null;

  const categoryTypeById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.type] as const)),
    [categories],
  );

  const browserNow = useMemo(() => new Date(), []);
  const browserRange = useMemo(
    () => categoryBrowserPeriodRange(browserPeriod, browserNow),
    [browserPeriod, browserNow],
  );
  // Full history for the selected window, via useAllTransactions (pages
  // through every row rather than truncating at PostgREST's default page
  // size) so the browser's totals are always computed from real
  // transactions, the same way the dashboard's category spend network does.
  const browserTransactionsQuery = useAllTransactions({ from: browserRange.from, to: browserRange.to });

  const browserStats = useMemo(() => {
    if (!browserSelectedNode) return null;
    return computeCategoryBrowserStats(
      browserSelectedNode,
      tree,
      browserTransactionsQuery.data ?? [],
      categoryTypeById,
      t('dashboard.shared'),
    );
  }, [browserSelectedNode, tree, browserTransactionsQuery.data, categoryTypeById, t]);

  function handleBrowserSelectNode(id: string | null) {
    setBrowserSelectedNodeId((current) => (id === null ? null : current === id ? null : id));
  }

  // Drilling into a subcategory from the detail panel should select it (not
  // toggle it off like re-clicking the same sidebar row) and make sure it's
  // visible in the sidebar by expanding its ancestor groups.
  function handleBrowserSelectChild(id: string) {
    setBrowserSelectedNodeId(id);
    setBrowserCollapsedIds((current) => {
      const next = new Set(current);
      let ancestorId = tree.nodesById.get(id)?.parentId ?? null;
      while (ancestorId) {
        next.delete(ancestorId);
        ancestorId = tree.nodesById.get(ancestorId)?.parentId ?? null;
      }
      return next;
    });
  }

  function toggleBrowserCollapse(id: string) {
    setBrowserCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Any active category of the matching type can be a parent — nesting
  // depth is unbounded (parent_id is a plain self-referencing FK), so a
  // sub-category can itself be picked as the parent of a new sub-sub-
  // category, and so on. Sourced from the tree (not the flat category
  // list) so we get each node's depth/breadcrumb for free.
  const createParentOptions = useMemo(
    () =>
      tree.order
        .map((id) => tree.nodesById.get(id)!)
        .filter((node) => node.kind === 'category' && node.categoryType === createType && !node.isArchived),
    [tree, createType],
  );
  const editParentOptions = useMemo(() => {
    if (!editCategory) return [];
    const descendantIds = getDescendantCategoryIds(tree, editCategory.id);
    return tree.order
      .map((id) => tree.nodesById.get(id)!)
      .filter(
        (node) =>
          node.kind === 'category' &&
          node.categoryType === editCategory.type &&
          !node.isArchived &&
          node.id !== editCategory.id &&
          !descendantIds.has(node.id),
      );
  }, [tree, editCategory]);
  const selectedCreateParentLabel = createParentOptions.find((node) => node.id === parentId)?.label ?? t('categories.topLevel');
  const selectedEditParentLabel = editParentOptions.find((node) => node.id === editCategory?.parentId)?.label ?? t('categories.topLevel');

  // Groups a flat list of eligible parent nodes into a tree by their real
  // parentId (falling back to root when the parent isn't in this filtered
  // list, e.g. the synthetic type root) -- the same grouped/expandable shape
  // as the category picker used in transactions and Wage Flow, generalized
  // to arbitrary nesting depth since a category's parent can itself be a
  // sub-category here.
  function groupParentOptionsByParent(nodes: typeof createParentOptions) {
    const idSet = new Set(nodes.map((node) => node.id));
    const childrenMap = new Map<string, typeof createParentOptions>();
    const roots: typeof createParentOptions = [];
    for (const node of nodes) {
      if (node.parentId && idSet.has(node.parentId)) {
        const list = childrenMap.get(node.parentId) ?? [];
        list.push(node);
        childrenMap.set(node.parentId, list);
      } else {
        roots.push(node);
      }
    }
    return { roots, childrenMap };
  }

  const createParentTree = useMemo(
    () => groupParentOptionsByParent(createParentOptions),
    [createParentOptions],
  );
  const editParentTree = useMemo(
    () => groupParentOptionsByParent(editParentOptions),
    [editParentOptions],
  );

  function toggleParentGroupExpanded(id: string) {
    setExpandedParentGroupIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Ancestor ids (within the given filtered list) of a node, walking up via
  // the full tree's parentId chain -- used to auto-expand the groups
  // containing the current selection whenever a picker opens, so reopening
  // it never hides the active choice behind a collapsed group.
  function ancestorIdsWithinList(nodeId: string, idSet: Set<string>) {
    const result: string[] = [];
    let current = tree.nodesById.get(nodeId)?.parentId ?? null;
    while (current) {
      if (idSet.has(current)) result.push(current);
      current = tree.nodesById.get(current)?.parentId ?? null;
    }
    return result;
  }

  useEffect(() => {
    if (!parentPickerOpen || !parentId) return;
    const idSet = new Set(createParentOptions.map((node) => node.id));
    const ancestors = ancestorIdsWithinList(parentId, idSet);
    if (ancestors.length === 0) return;
    setExpandedParentGroupIds((current) => {
      const next = new Set(current);
      ancestors.forEach((id) => next.add(id));
      return next;
    });
    // Only re-run when the modal transitions open, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentPickerOpen]);

  useEffect(() => {
    if (!editParentPickerOpen || !editCategory?.parentId) return;
    const idSet = new Set(editParentOptions.map((node) => node.id));
    const ancestors = ancestorIdsWithinList(editCategory.parentId, idSet);
    if (ancestors.length === 0) return;
    setExpandedParentGroupIds((current) => {
      const next = new Set(current);
      ancestors.forEach((id) => next.add(id));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParentPickerOpen]);

  // Recursively renders a level of the parent-category picker: each node is
  // a row (select this as the parent) plus, if it has children in this
  // filtered list, a chevron that expands/collapses them nested underneath.
  function renderParentOptionRows(
    nodes: typeof createParentOptions,
    depth: number,
    childrenMap: Map<string, typeof createParentOptions>,
    selectedId: string | null,
    onSelect: (id: string) => void,
  ) {
    return nodes.map((node) => {
      const children = childrenMap.get(node.id) ?? [];
      const isExpanded = expandedParentGroupIds.has(node.id);
      return (
        <View key={node.id} style={{ gap: spacing(2) } as any}>
          <View
            style={
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(2),
                marginLeft: depth * spacing(6),
              } as any
            }
          >
            <View style={{ flex: 1 } as any}>
              <SelectionOptionRow
                title={node.label}
                subtitle={node.pathLabels.length > 1 ? node.pathLabels.join(' / ') : undefined}
                active={selectedId === node.id}
                iconName={node.icon as any}
                onPress={() => onSelect(node.id)}
              />
            </View>
            {children.length > 0 ? (
              <Pressable
                onPress={() => toggleParentGroupExpanded(node.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={node.label}
                accessibilityState={{ expanded: isExpanded }}
                style={({ pressed }) =>
                  [
                    {
                      width: spacing(9),
                      height: spacing(9),
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceMuted,
                    },
                    pressed && { opacity: 0.85 },
                  ] as any
                }
              >
                <Ionicons
                  name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            ) : (
              <View style={{ width: spacing(9) } as any} />
            )}
          </View>
          {isExpanded && children.length > 0
            ? renderParentOptionRows(children, depth + 1, childrenMap, selectedId, onSelect)
            : null}
        </View>
      );
    });
  }

  function openEditCategory(category: CategoryLike) {
    setEditCategory({
      id: category.id,
      name: category.name,
      type: category.type,
      parentId: category.parent_id ?? '',
      icon: category.icon,
      isArchived: category.is_archived,
      isDiscretionary: category.is_discretionary ?? false,
    });
  }

  // Generic node-scoped CRUD handlers used by the category browser's detail
  // panel.
  function handleEditNode(node: ExplorerNode | null) {
    if (!node?.categoryId) return;
    const category = categories.find((item) => item.id === node.categoryId);
    if (category) openEditCategory(category);
  }

  // Opens the same "create category" modal used for the top-level "New
  // category" action, but pre-filled with the selected category as the
  // parent (and matching its type), so adding a sub-category under whatever
  // is currently selected is a single tap.
  function handleAddChildToNode(node: ExplorerNode | null) {
    if (!node?.categoryId) return;
    setCreateType(node.categoryType);
    setName('');
    setIcon('pricetag-outline');
    setParentId(node.categoryId);
    setCreateModalOpen(true);
  }

  async function handleArchiveToggleNode(node: ExplorerNode | null) {
    if (!node?.categoryId) return;
    if (node.isArchived) await restoreCategory.mutateAsync(node.categoryId);
    else await archiveCategory.mutateAsync(node.categoryId);
  }

  async function handleDeleteNode(node: ExplorerNode | null, onDeleted: () => void) {
    if (!node?.categoryId) return;
    await deleteCategory.mutateAsync(node.categoryId);
    onDeleted();
  }

  function handleEditBrowserSelected() {
    handleEditNode(browserSelectedNode);
  }

  function handleAddChildToBrowserSelected() {
    handleAddChildToNode(browserSelectedNode);
  }

  async function handleArchiveToggleBrowserSelected() {
    await handleArchiveToggleNode(browserSelectedNode);
  }

  async function handleDeleteBrowserSelected() {
    await handleDeleteNode(browserSelectedNode, () => setBrowserSelectedNodeId(null));
  }

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
    setParentPickerOpen(false);
    setIcon(null);
    setCreateModalOpen(false);
  }

  async function handleArchiveEditedCategory() {
    if (!editCategory) return;
    if (editCategory.isArchived) await restoreCategory.mutateAsync(editCategory.id);
    else await archiveCategory.mutateAsync(editCategory.id);
    setEditCategory(null);
  }

  async function handleDeleteEditedCategory() {
    if (!editCategory) return;
    await deleteCategory.mutateAsync(editCategory.id);
    setEditCategory(null);
  }

  async function handleSaveCategory() {
    if (!editCategory?.name.trim()) return;

    await updateCategory.mutateAsync({
      id: editCategory.id,
      name: editCategory.name.trim(),
      type: editCategory.type,
      icon: editCategory.icon,
      parent_id: editCategory.parentId.trim() || null,
      is_discretionary: editCategory.type === 'expense' ? editCategory.isDiscretionary : false,
    });

    setEditCategory(null);
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

      {!categoriesQuery.isPending && (!hasExpenseMainCategories || !hasIncomeMainCategories) ? (
        <Card>
          <View style={{ flexDirection: width >= 760 ? 'row' : 'column', alignItems: width >= 760 ? 'center' : 'flex-start', gap: spacing(3) } as any}>
            <View style={{ flex: 1, gap: spacing(1) } as any}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold, fontSize: typography.fontSize[15] } as any}>
                  {t('categories.seedTitle')}
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13], lineHeight: typography.lineHeight[18] } as any}>
                {t('categories.seedSubtitle')}
              </Text>
            </View>
            <Button
              label={seedingDefaults ? t('categories.seedInProgress') : t('categories.seedAction')}
              onPress={() => void handleSeedDefaultCategories()}
              disabled={seedingDefaults || !householdId}
            />
          </View>
        </Card>
      ) : null}

      <Card>
        <Section
          title={t('categories.browser.title')}
          subtitle={t('categories.browser.subtitle')}
          action={<Button label={t('categories.browser.newCategory')} onPress={() => setCreateModalOpen(true)} />}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3), marginBottom: spacing(3) } as any}>
            {types.map((type) => (
              <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                <View style={{ width: 10, height: 10, borderRadius: radius.full, backgroundColor: getTypeColor(type, colors) } as any} />
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold } as any}>
                  {t(`categories.types.${type}`)}
                </Text>
              </View>
            ))}
          </View>

          {/* Equal-height two-panel layout: both columns share the same
              fixed `browserPanelHeight`, set by the container rather than by
              either side's content, so neither can grow taller than the
              other. Each panel owns its own internal ScrollView (inside
              CategoryBrowserSidebar / CategoryBrowserDetailPanel), and
              `overflow: hidden` here keeps that scrolling contained within
              the bordered box instead of spilling past it. On narrow screens
              the panels stack (column) but still share one height so the
              same "no side grows past the other" rule holds. */}
          <View style={{ flexDirection: isWide ? 'row' : 'column', alignItems: 'stretch', gap: spacing(3) } as any}>
            <View
              style={{
                width: isWide ? 320 : undefined,
                height: browserPanelHeight,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing(3),
                backgroundColor: colors.surfaceMuted,
                overflow: 'hidden',
              } as any}
            >
              <CategoryBrowserSidebar
                tree={tree}
                search={browserSearch}
                onSearchChange={setBrowserSearch}
                selectedId={browserSelectedNodeId}
                hoverId={browserHoverNodeId}
                onSelect={handleBrowserSelectNode}
                onHover={setBrowserHoverNodeId}
                matchedIds={browserMatchedIds}
                collapsedIds={browserCollapsedIds}
                onToggleCollapse={toggleBrowserCollapse}
              />
            </View>

            <View
              style={{
                flex: isWide ? 1 : undefined,
                height: browserPanelHeight,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing(3),
                overflow: 'hidden',
              } as any}
            >
              <CategoryBrowserDetailPanel
                node={browserSelectedNode}
                stats={browserStats}
                isLoading={browserTransactionsQuery.isPending}
                period={browserPeriod}
                onPeriodChange={setBrowserPeriod}
                onSelectChild={handleBrowserSelectChild}
                onEdit={handleEditBrowserSelected}
                onAddChild={handleAddChildToBrowserSelected}
                onArchiveToggle={() => void handleArchiveToggleBrowserSelected()}
                onDelete={() => void handleDeleteBrowserSelected()}
                archivePending={archiveCategory.isPending || restoreCategory.isPending}
                deletePending={deleteCategory.isPending}
              />
            </View>
          </View>
        </Section>
      </Card>

      <SelectionShell
        visible={createModalOpen}
        title={t('categories.createTitle')}
        subtitle={t('categories.createSubtitle')}
        closeLabel={t('cancel')}
        onClose={() => setCreateModalOpen(false)}
      >
        <View style={{ gap: spacing(3) } as any}>
          <View style={{ gap: spacing(2) } as any}>
            <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold } as any}>
              {t('categories.selectedType')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
              {types.map((item) => (
                <Pill
                  key={item}
                  label={t(`categories.types.${item}`)}
                  active={createType === item}
                  onPress={() => {
                    setCreateType(item);
                    setParentId('');
                  }}
                />
              ))}
            </View>
          </View>

          <Field label={t('categories.name')} value={name} onChangeText={setName} />
          <SelectionTrigger
            label={t('categories.parentCategory')}
            valueLabel={selectedCreateParentLabel}
            placeholder={t('categories.topLevel')}
            iconName="git-branch-outline"
            disabled={createParentOptions.length === 0}
            onPress={() => setParentPickerOpen(true)}
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
            {createParentOptions.length === 0 ? t('categories.parentHintEmpty') : t('categories.parentHint')}
          </Text>

          <Button label={createCategory.isPending ? t('creating') : t('categories.create')} onPress={() => void handleCreate()} disabled={!canCreateCategory} />
        </View>
      </SelectionShell>

      <SelectionShell
        visible={editCategory !== null}
        title={t('categories.editTitle')}
        subtitle={editCategory?.name ?? t('categories.listTitle')}
        closeLabel={t('cancel')}
        onClose={() => {
          setEditCategory(null);
          setEditParentPickerOpen(false);
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
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                {types.map((item) => (
                  <Pill
                    key={item}
                    label={t(`categories.types.${item}`)}
                    active={editCategory.type === item}
                    onPress={() =>
                      setEditCategory((current) => (current ? { ...current, type: item, parentId: '' } : current))
                    }
                  />
                ))}
              </View>
            </View>

            <SelectionTrigger
              label={t('categories.parentCategory')}
              valueLabel={selectedEditParentLabel}
              placeholder={t('categories.topLevel')}
              iconName="git-branch-outline"
              disabled={editParentOptions.length === 0}
              onPress={() => setEditParentPickerOpen(true)}
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

            {editCategory.type === 'expense' ? (
              <View style={{ gap: spacing(2) } as any}>
                <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold } as any}>
                  {t('categories.discretionary')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                  <Pill
                    label={t('categories.discretionaryOn')}
                    active={editCategory.isDiscretionary}
                    onPress={() =>
                      setEditCategory((current) => (current ? { ...current, isDiscretionary: true } : current))
                    }
                  />
                  <Pill
                    label={t('categories.discretionaryOff')}
                    active={!editCategory.isDiscretionary}
                    onPress={() =>
                      setEditCategory((current) => (current ? { ...current, isDiscretionary: false } : current))
                    }
                  />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
                  {t('categories.discretionaryHint')}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing(2), flexWrap: 'wrap' } as any}>
              <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' } as any}>
                <Button
                  label={editCategory.isArchived ? t('categories.restore') : t('categories.archive')}
                  variant="secondary"
                  onPress={() => void handleArchiveEditedCategory()}
                  disabled={archiveCategory.isPending || restoreCategory.isPending}
                />
                <Button
                  label={t('delete')}
                  variant="danger"
                  onPress={() => void handleDeleteEditedCategory()}
                  disabled={deleteCategory.isPending}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' } as any}>
                <Button
                  label={t('cancel')}
                  variant="secondary"
                  onPress={() => setEditCategory(null)}
                />
                <Button
                  label={updateCategory.isPending ? t('saving') : t('settings.saveChanges')}
                  onPress={() => void handleSaveCategory()}
                  disabled={!canSaveCategory}
                />
              </View>
            </View>
          </View>
        ) : null}
      </SelectionShell>

      <SelectionShell
        visible={parentPickerOpen}
        title={t('categories.parentCategory')}
        subtitle={t('categories.parentHint')}
        closeLabel={t('cancel')}
        onClose={() => setParentPickerOpen(false)}
      >
        <View style={{ gap: spacing(2) } as any}>
          <SelectionOptionRow
            title={t('categories.topLevel')}
            subtitle={t('categories.topLevelHint')}
            active={parentId === ''}
            iconName="layers-outline"
            onPress={() => {
              setParentId('');
              setParentPickerOpen(false);
            }}
          />
          {renderParentOptionRows(createParentTree.roots, 0, createParentTree.childrenMap, parentId || null, (id) => {
            setParentId(id);
            setParentPickerOpen(false);
          })}
        </View>
      </SelectionShell>

      <SelectionShell
        visible={editParentPickerOpen}
        title={t('categories.parentCategory')}
        subtitle={t('categories.parentHint')}
        closeLabel={t('cancel')}
        onClose={() => setEditParentPickerOpen(false)}
      >
        <View style={{ gap: spacing(2) } as any}>
          <SelectionOptionRow
            title={t('categories.topLevel')}
            subtitle={t('categories.topLevelHint')}
            active={!editCategory?.parentId}
            iconName="layers-outline"
            onPress={() => {
              setEditCategory((current) => (current ? { ...current, parentId: '' } : current));
              setEditParentPickerOpen(false);
            }}
          />
          {renderParentOptionRows(
            editParentTree.roots,
            0,
            editParentTree.childrenMap,
            editCategory?.parentId || null,
            (id) => {
              setEditCategory((current) => (current ? { ...current, parentId: id } : current));
              setEditParentPickerOpen(false);
            },
          )}
        </View>
      </SelectionShell>
    </Page>
  );
}
