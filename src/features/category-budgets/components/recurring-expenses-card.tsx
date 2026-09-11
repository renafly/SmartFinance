import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Section, Field, Button, Pill, formatCurrency } from '@/components/migrated-page';
import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { CategoryPicker, type CategoryPickerCategory } from '@/components/category-picker';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import { useToast } from '@/providers/ToastProvider';
import { MONTH_OPTIONS } from '@/features/monthly-budget/ui-utils';
import type { BudgetAccountLike, BudgetMemberLike } from '@/features/monthly-budget/types';
import {
  useCreatePlannedItem,
  useDeletePlannedItem,
  usePlannedItems,
  useSetPlannedItemActive,
  useUpdatePlannedItem,
} from '@/features/planned-items/hooks';
import { emptyPlannedItemDraft, formatPlannedItemRecurrenceSummary, plannedItemToDraft } from '@/features/planned-items/utils';
import type { PlannedItemDraft, PlannedItemWithDestinations } from '@/features/planned-items/types';

function pickDefaultAccountId(accounts: BudgetAccountLike[], allowedTypes: string[]): string {
  const owned = accounts.find((account) => allowedTypes.includes(account.type));
  return owned?.id ?? '';
}

/** Monthly/specific-months/interval/one-time picker, shared by the add and edit forms below -- same fields planned-item-card.tsx exposes for these four recurrence types, just without that card's destinations/estimate/owner/start-end-month sections (out of scope here, see this file's top doc comment). */
function RecurrenceFields({ draft, onChange }: { draft: PlannedItemDraft; onChange: (patch: Partial<PlannedItemDraft>) => void }) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();

  function toggleMonth(value: number) {
    onChange({
      recurrenceMonths: draft.recurrenceMonths.includes(value)
        ? draft.recurrenceMonths.filter((entry) => entry !== value)
        : [...draft.recurrenceMonths, value].sort((a, b) => a - b),
    });
  }

  return (
    <View style={{ gap: spacing(1) } as any}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
        <Pill label={t('budget.recurringExpenses.recurrenceTypes.monthly')} active={draft.recurrenceType === 'monthly'} onPress={() => onChange({ recurrenceType: 'monthly' })} />
        <Pill label={t('budget.recurringExpenses.recurrenceTypes.specific_months')} active={draft.recurrenceType === 'specific_months'} onPress={() => onChange({ recurrenceType: 'specific_months' })} />
        <Pill label={t('budget.recurringExpenses.recurrenceTypes.interval')} active={draft.recurrenceType === 'interval'} onPress={() => onChange({ recurrenceType: 'interval' })} />
        <Pill label={t('budget.incomeSources.recurrenceTypes.one_time')} active={draft.recurrenceType === 'one_time'} onPress={() => onChange({ recurrenceType: 'one_time' })} />
      </View>

      {draft.recurrenceType === 'specific_months' ? (
        <View style={{ gap: spacing(1) } as any}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) } as any}>
            {MONTH_OPTIONS.map((option) => (
              <Pill key={option.value} label={option.label} active={draft.recurrenceMonths.includes(option.value)} onPress={() => toggleMonth(option.value)} />
            ))}
          </View>
          {draft.recurrenceMonths.length === 0 ? (
            <Text style={{ color: colors.warning, fontSize: typography.fontSize[12] } as any}>{t('budget.recurringExpenses.selectAtLeastOneMonth')}</Text>
          ) : null}
        </View>
      ) : null}

      {draft.recurrenceType === 'interval' ? (
        <Field
          label={t('budget.recurringExpenses.everyNMonths')}
          value={draft.recurrenceIntervalMonths}
          onChangeText={(value) => onChange({ recurrenceIntervalMonths: value })}
          keyboardType="numeric"
          placeholder="2"
        />
      ) : null}
    </View>
  );
}

function RecurringExpenseForm({
  draft,
  onChange,
  onSave,
  onCancel,
  isSaving,
  accounts,
  members,
  categories,
}: {
  draft: PlannedItemDraft;
  onChange: (patch: Partial<PlannedItemDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  accounts: BudgetAccountLike[];
  members: BudgetMemberLike[];
  categories: CategoryPickerCategory[];
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing(2), padding: spacing(4), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted } as any}>
      <Field label={t('budget.plannedItems.name')} value={draft.name} onChangeText={(value) => onChange({ name: value })} placeholder={t('budget.plannedItems.namePlaceholder')} />
      <Field label={t('budget.plannedItems.amount')} value={draft.amount} onChangeText={(value) => onChange({ amount: value })} keyboardType="numeric" placeholder="0.00" />
      <CategoryPicker
        label={t('budget.plannedItems.category')}
        placeholder={t('budget.plannedItems.categoryPlaceholder')}
        categories={categories}
        selectedId={draft.categoryId || null}
        onChange={(categoryId) => onChange({ categoryId: categoryId ?? '' })}
      />
      <GroupedAccountSelect
        label={t('budget.sourceAccount')}
        accounts={accounts}
        members={members}
        value={draft.sourceAccountId}
        placeholder={t('budget.selectSourceAccount')}
        hint={t('budget.plannedItems.sourceAccountHint')}
        allowedTypes={['cash', 'bank']}
        sharedLabel={t('budget.shared')}
        unassignedLabel={t('settings.unnamedUser')}
        closeLabel={t('cancel')}
        onChange={(accountId) => onChange({ sourceAccountId: accountId })}
      />
      <RecurrenceFields draft={draft} onChange={onChange} />
      <View style={{ flexDirection: 'row', gap: spacing(2) } as any}>
        <Button label={isSaving ? t('saving') : t('budget.plannedItems.save')} onPress={onSave} disabled={isSaving} />
        <Button label={t('cancel')} onPress={onCancel} variant="secondary" disabled={isSaving} />
      </View>
    </View>
  );
}

export type RecurringExpensesCardProps = {
  accounts: BudgetAccountLike[];
  members: BudgetMemberLike[];
  categories: CategoryPickerCategory[];
};

/**
 * A NEW, purpose-built recurring-expense manager for the Category Budgets
 * screen -- explicitly NOT the existing PlannedItemsSection (which stays
 * on the Monthly Budget screen for the general case: income, multi-
 * account transfers/splits, estimates matched to a real transaction,
 * month-wide confirm). The user asked for something new here rather than
 * that tab reused, so this is deliberately narrower:
 *
 * Scope: plain expenses only -- direction 'outflow', zero destination
 * accounts (buildFreshLegs' "plain_expense" shape: paid straight out of
 * one source account into one category, e.g. Rent/Electricity/Internet/
 * Insurance). This is exactly the shape confirm_planned_item_occurrence
 * (the new one-click "mark as paid" action on the category rows below)
 * and this feature's budget math are built around. An item with
 * destinations (a transfer/split) was created via the full Monthly
 * Budget editor and keeps being managed there -- this manager only
 * lists/creates/edits the zero-destination subset, so it never
 * mis-edits a split item's allocation.
 *
 * Underneath, still the SAME planned_items/useCreatePlannedItem/etc.
 * this codebase already has (no second recurring-expense table) -- this
 * is a different, smaller FORM over the same data, not a new backend.
 */
export function RecurringExpensesCard({ accounts, members, categories }: RecurringExpensesCardProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const { show: showToast } = useToast();

  const itemsQuery = usePlannedItems();
  const createItem = useCreatePlannedItem();
  const updateItem = useUpdatePlannedItem();
  const setActive = useSetPlannedItemActive();
  const deleteItem = useDeletePlannedItem();

  const items = useMemo(
    () => (itemsQuery.data ?? []).filter((item) => item.direction === 'outflow' && item.destinations.length === 0),
    [itemsQuery.data],
  );

  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const [newDraft, setNewDraft] = useState<PlannedItemDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PlannedItemDraft | null>(null);

  function startAdding() {
    setEditingId(null);
    setEditDraft(null);
    setNewDraft(emptyPlannedItemDraft('outflow', pickDefaultAccountId(accounts, ['cash', 'bank']), ''));
  }

  async function handleSaveNew() {
    if (!newDraft) return;
    try {
      await createItem.mutateAsync(newDraft);
      setNewDraft(null);
      showToast(t('budget.categoryBudgets.recurring.addedToast'));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('budget.categoryBudgets.recurring.errorToast'));
    }
  }

  function startEditing(item: PlannedItemWithDestinations) {
    setNewDraft(null);
    setEditingId(item.id);
    setEditDraft(plannedItemToDraft(item));
  }

  async function handleSaveEdit() {
    if (!editDraft) return;
    try {
      await updateItem.mutateAsync(editDraft);
      setEditingId(null);
      setEditDraft(null);
      showToast(t('budget.categoryBudgets.recurring.updatedToast'));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('budget.categoryBudgets.recurring.errorToast'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteItem.mutateAsync(id);
      showToast(t('budget.categoryBudgets.recurring.deletedToast'));
    } catch {
      showToast(t('budget.categoryBudgets.recurring.errorToast'));
    }
  }

  return (
    <Section title={t('budget.categoryBudgets.recurring.title')} subtitle={t('budget.categoryBudgets.recurring.subtitle')}>
      {itemsQuery.isLoading ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[14] } as any}>{t('loading')}</Text>
      ) : items.length === 0 && !newDraft ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[14] } as any}>{t('budget.categoryBudgets.recurring.empty')}</Text>
      ) : (
        <View style={{ gap: spacing(2) } as any}>
          {items.map((item) =>
            editingId === item.id && editDraft ? (
              <RecurringExpenseForm
                key={item.id}
                draft={editDraft}
                onChange={(patch) => setEditDraft((current) => (current ? { ...current, ...patch } : current))}
                onSave={handleSaveEdit}
                onCancel={() => {
                  setEditingId(null);
                  setEditDraft(null);
                }}
                isSaving={updateItem.isPending}
                accounts={accounts}
                members={members}
                categories={categories}
              />
            ) : (
              <Pressable
                key={item.id}
                onPress={() => startEditing(item)}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing(2), borderBottomWidth: 1, borderBottomColor: colors.border } as any}
              >
                <View style={{ flex: 1, gap: 2, paddingRight: spacing(2) } as any}>
                  <Text style={{ color: colors.text, fontSize: typography.fontSize[14], fontWeight: String(typography.fontWeight.semibold) } as any} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any} numberOfLines={1}>
                    {categoryNameById.get(item.categoryId) ?? ''} · {formatPlannedItemRecurrenceSummary(item)}
                    {!item.isActive ? ` · ${t('budget.recurringExpenses.paused')}` : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(4) } as any}>
                  <Text style={{ color: colors.text, fontSize: typography.fontSize[14] } as any}>{displayCurrency(formatCurrency(item.amount), hideValues)}</Text>
                  <Pressable onPress={() => setActive.mutate({ id: item.id, isActive: !item.isActive })} hitSlop={8}>
                    <Ionicons name={item.isActive ? 'pause-outline' : 'play-outline'} size={18} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => void handleDelete(item.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                  </Pressable>
                </View>
              </Pressable>
            ),
          )}
        </View>
      )}

      {newDraft ? (
        <View style={{ marginTop: spacing(4) } as any}>
          <RecurringExpenseForm
            draft={newDraft}
            onChange={(patch) => setNewDraft((current) => (current ? { ...current, ...patch } : current))}
            onSave={handleSaveNew}
            onCancel={() => setNewDraft(null)}
            isSaving={createItem.isPending}
            accounts={accounts}
            members={members}
            categories={categories}
          />
        </View>
      ) : (
        <View style={{ marginTop: spacing(4) } as any}>
          <Button label={t('budget.categoryBudgets.recurring.addButton')} onPress={startAdding} variant="secondary" />
        </View>
      )}
    </Section>
  );
}
