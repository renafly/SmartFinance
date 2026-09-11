import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, formatCurrency } from '@/components/migrated-page';
import { Table } from '@/components/data-surface';
import type { CategoryPickerCategory } from '@/components/category-picker';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import type { BudgetAccountLike, BudgetMemberLike } from '@/features/monthly-budget/types';

import {
  useCreatePlannedItem,
  useDeletePlannedItem,
  useMatchPlannedItemOccurrence,
  usePlannedItemMatchedTransactionLabels,
  usePlannedItemMatches,
  usePlannedItems,
  usePlannedItemsPreview,
  useSetPlannedItemActive,
  useUnmatchPlannedItemOccurrence,
  useUpdatePlannedItem,
} from '../hooks';
import type { PlannedItemDirection, PlannedItemDraft, PlannedItemOccurrence, PlannedItemWithDestinations } from '../types';
import { emptyPlannedItemDraft, plannedItemToDraft } from '../utils';
import { PlannedItemCard } from './planned-item-card';

export type PlannedItemsSectionProps = {
  direction: PlannedItemDirection;
  /** "YYYY-MM" */
  month: string;
  accounts: BudgetAccountLike[];
  members: BudgetMemberLike[];
  categories: CategoryPickerCategory[];
  householdId: string;
  createdBy: string;
  /** Generic read-only override for callers that need it (e.g. a future archived/shared view). NOT wired to the month lock -- planned items are recurring templates, independent of any one month's confirmed occurrence, so budget.tsx always passes false here. */
  disabled?: boolean;
};

function pickDefaultAccountId(accounts: BudgetAccountLike[], allowedTypes: string[]) {
  const owned = accounts.find((account) => allowedTypes.includes(account.type));
  return owned?.id ?? '';
}

export function PlannedItemsSection({
  direction,
  month,
  accounts,
  members,
  categories,
  householdId,
  createdBy,
  disabled = false,
}: PlannedItemsSectionProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const isInflow = direction === 'inflow';

  const itemsQuery = usePlannedItems();
  const items = useMemo(
    () => (itemsQuery.data ?? []).filter((item) => item.direction === direction),
    [itemsQuery.data, direction],
  );

  // usePlannedItemsPreview both resolves AND materializes the month (see
  // its own doc comment in planned-items-confirm.service.ts) -- exactly
  // what this list needs so "due this month" / matching act on real,
  // persisted occurrence ids rather than the resolver's not-yet-created
  // sentinel.
  const previewQuery = usePlannedItemsPreview(month);
  const occurrenceByItemId = useMemo(() => {
    const map = new Map<string, PlannedItemOccurrence>();
    for (const resolved of previewQuery.data?.occurrences ?? []) {
      if (resolved.occurrence.id) map.set(resolved.occurrence.plannedItemId, resolved.occurrence);
    }
    return map;
  }, [previewQuery.data]);

  const relevantOccurrenceIds = useMemo(
    () => items.map((item) => occurrenceByItemId.get(item.id)?.id).filter((id): id is string => !!id),
    [items, occurrenceByItemId],
  );
  const { matchByOccurrenceId } = usePlannedItemMatches(relevantOccurrenceIds);
  const matchedTransactionIds = useMemo(
    () => [...matchByOccurrenceId.values()].map((match) => match.transactionId),
    [matchByOccurrenceId],
  );
  const { byId: transactionById } = usePlannedItemMatchedTransactionLabels(matchedTransactionIds);

  const createItem = useCreatePlannedItem();
  const updateItem = useUpdatePlannedItem();
  const setActive = useSetPlannedItemActive();
  const deleteItem = useDeletePlannedItem();
  const matchOccurrence = useMatchPlannedItemOccurrence();
  const unmatchOccurrence = useUnmatchPlannedItemOccurrence();

  const [newDraft, setNewDraft] = useState<PlannedItemDraft | null>(null);
  const [editsById, setEditsById] = useState<Record<string, Partial<PlannedItemDraft>>>({});
  // Tracking which ids are *expanded* (rather than which are collapsed)
  // means an empty set is the natural "everything collapsed" starting
  // state -- mirrors income-sources-section.tsx / recurring-expenses-
  // section.tsx's own expandedIds pattern exactly.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [matchPickerForOccurrenceId, setMatchPickerForOccurrenceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dueCount = relevantOccurrenceIds.length;
  const total = useMemo(
    () =>
      Math.round(
        items
          .filter((item) => occurrenceByItemId.has(item.id))
          .reduce((sum, item) => sum + item.amount, 0) * 100,
      ) / 100,
    [items, occurrenceByItemId],
  );

  function draftFor(item: PlannedItemWithDestinations): PlannedItemDraft {
    return { ...plannedItemToDraft(item), ...editsById[item.id] };
  }

  function updateDraft(id: string, patch: Partial<PlannedItemDraft>) {
    setEditsById((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function toggleCollapsed(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allExpanded = items.length > 0 && items.every((item) => expandedIds.has(item.id));
  function toggleAllCollapsed() {
    setExpandedIds(allExpanded ? new Set() : new Set(items.map((item) => item.id)));
  }

  function startNewDraft() {
    const sourceAccountId = isInflow ? '' : pickDefaultAccountId(accounts, ['cash', 'bank']);
    const destinationAccountId = isInflow ? (accounts[0]?.id ?? '') : '';
    setNewDraft(emptyPlannedItemDraft(direction, sourceAccountId, destinationAccountId));
  }

  async function handleSaveNew() {
    if (!newDraft) return;
    try {
      await createItem.mutateAsync(newDraft);
      setNewDraft(null);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSaveExisting(item: PlannedItemWithDestinations) {
    const draft = draftFor(item);
    try {
      await updateItem.mutateAsync(draft);
      setEditsById((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : String(error));
    }
  }

  const accountNameMap = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts]);
  const destinationAccountTypeLabels = useMemo(
    () => ({
      bank: t('budget.destinationGroups.bank'),
      cash: t('budget.destinationGroups.cash'),
      savings: t('budget.destinationGroups.savings'),
      credit_card: t('budget.destinationGroups.credit_card'),
      investment: t('budget.destinationGroups.investment'),
      ppr: t('budget.destinationGroups.ppr'),
    }),
    [t],
  );

  const sectionTitle = t(isInflow ? 'budget.incomeSources.title' : 'budget.plannedItems.outflowTitle');
  const summaryText = t(isInflow ? 'budget.incomeSources.summary' : 'budget.plannedItems.summary', {
    count: dueCount,
    amount: displayCurrency(formatCurrency(total), hideValues),
  });
  const addLabel = t(isInflow ? 'budget.incomeSources.addAction' : 'budget.plannedItems.addAction');
  const emptyLabel = t(isInflow ? 'budget.incomeSources.empty' : 'budget.plannedItems.empty');

  return (
    <View style={{ gap: spacing(3) } as any}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) } as any}>
        <View style={{ gap: spacing(0.5) } as any}>
          <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize[16] } as any}>
            {sectionTitle}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[13] } as any}>{summaryText}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
          {items.length > 0 ? (
            <Button
              label={allExpanded ? t('budget.plannedItems.collapseAll') : t('budget.plannedItems.expandAll')}
              onPress={toggleAllCollapsed}
              variant="secondary"
            />
          ) : null}
          <Button label={addLabel} onPress={startNewDraft} variant="secondary" disabled={!!newDraft || disabled} />
        </View>
      </View>

      {feedback ? <Text style={{ color: colors.destructive, fontSize: typography.fontSize[13] } as any}>{feedback}</Text> : null}

      {newDraft ? (
        <PlannedItemCard
          draft={newDraft}
          isNew
          isCollapsed={false}
          isSaving={createItem.isPending}
          occurrence={null}
          matchedTransaction={null}
          month={month}
          accounts={accounts}
          members={members}
          categories={categories}
          accountNameMap={accountNameMap}
          destinationAccountTypeLabels={destinationAccountTypeLabels}
          onToggleCollapse={() => {}}
          onChange={(patch) => setNewDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
          onSave={() => void handleSaveNew()}
          onCancel={() => setNewDraft(null)}
          onDelete={() => {}}
          onToggleActive={() => {}}
          onMatchTransaction={() => {}}
          onUnmatchTransaction={() => {}}
          matchPickerOpen={false}
          onToggleMatchPicker={() => {}}
          disabled={disabled}
        />
      ) : null}

      {items.length === 0 && !newDraft ? <Text style={{ color: colors.textSecondary } as any}>{emptyLabel}</Text> : null}

      {items.length > 0 ? (
        <Table
          columns={
            isInflow
              ? [
                  { label: t('budget.tableColumns.name'), flex: 2.2 },
                  { label: t('budget.tableColumns.account'), flex: 1.5 },
                  { label: t('budget.tableColumns.amount'), flex: 1, align: 'right' },
                  { label: t('budget.tableColumns.recurrence'), flex: 1.5 },
                  { label: '', flex: 0.4 },
                ]
              : [
                  { label: t('budget.tableColumns.name'), flex: 2.2 },
                  { label: t('budget.sourceAccount'), flex: 1.5 },
                  { label: t('budget.tableColumns.amount'), flex: 1, align: 'right' },
                  { label: t('budget.tableColumns.destination'), flex: 1.5 },
                  { label: t('budget.tableColumns.recurrence'), flex: 1.5 },
                  { label: '', flex: 0.4 },
                ]
          }
        >
          {items.map((item) => {
            const draft = draftFor(item);
            const occurrence = occurrenceByItemId.get(item.id) ?? null;
            const match = occurrence ? matchByOccurrenceId.get(occurrence.id) : undefined;
            const matchedTransaction = match ? transactionById.get(match.transactionId) ?? null : null;
            const isCollapsed = !expandedIds.has(item.id);

            return (
              <PlannedItemCard
                key={item.id}
                draft={draft}
                isNew={false}
                isCollapsed={isCollapsed}
                isSaving={updateItem.isPending}
                occurrence={occurrence}
                matchedTransaction={matchedTransaction}
                month={month}
                accounts={accounts}
                members={members}
                categories={categories}
                accountNameMap={accountNameMap}
                destinationAccountTypeLabels={destinationAccountTypeLabels}
                onToggleCollapse={() => toggleCollapsed(item.id)}
                onChange={(patch) => updateDraft(item.id, patch)}
                onSave={() => void handleSaveExisting(item)}
                onCancel={() => {}}
                onDelete={() => void deleteItem.mutateAsync(item.id)}
                onToggleActive={() => void setActive.mutateAsync({ id: item.id, isActive: !draft.isActive })}
                onMatchTransaction={(transactionId) => {
                  if (!occurrence) return;
                  void matchOccurrence.mutateAsync({ occurrenceId: occurrence.id, transactionId });
                  setMatchPickerForOccurrenceId(null);
                }}
                onUnmatchTransaction={() => {
                  if (!occurrence) return;
                  void unmatchOccurrence.mutateAsync(occurrence.id);
                }}
                matchPickerOpen={!!occurrence && matchPickerForOccurrenceId === occurrence.id}
                onToggleMatchPicker={() =>
                  setMatchPickerForOccurrenceId((prev) => (occurrence && prev === occurrence.id ? null : (occurrence?.id ?? null)))
                }
                disabled={disabled}
              />
            );
          })}
        </Table>
      ) : null}
    </View>
  );
}
