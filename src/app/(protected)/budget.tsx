import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Page, Card, Section, Button, formatCurrency } from '@/components/migrated-page';
import { MonthPickerField } from '@/components/date-picker-field';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsiveMetrics } from '@/theme/responsive';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';
import { useToast } from '@/providers/ToastProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useAccounts, useAccountsWithBalances } from '../../features/accounts/hooks';
import { useCategories } from '../../features/categories/hooks';
import { useHouseholdMemberDetails } from '../../features/households/hooks';
import {
  useConfirmPlannedItemMonth,
  useCreatePlannedItem,
  useDeletePlannedItem,
  useMonthlyBudgetBatch,
  useMonthlyBudgetPeriod,
  usePlannedItems,
  usePlannedItemsPreview,
  useRevertMonthlyBudgetMonth,
  useUndoMonthlyBudgetBatch,
  useUpdatePlannedItem,
} from '../../features/planned-items/hooks';
import type { PlannedItemDraft } from '../../features/planned-items/types';
import type { BudgetAccountLike, BudgetMemberLike } from '../../features/monthly-budget/types';
import { getMemberLabel } from '../../features/monthly-budget/ui-utils';
import {
  buildSavePlan,
  isRowDirty,
  newIncomeRow,
  newMovementRow,
  rowAmount,
  rowToAccountId,
  rowsFromPlannedItems,
  rowsFromPostedMonth,
  summarizeMonthlyPlan,
  toPersistableDraft,
  validateRow,
  type PlanRow,
} from '../../features/monthly-budget/monthly-plan';
import { IncomeColumnsHeader, IncomeLineRow } from '../../features/monthly-budget/components/plan-line-row';
import { MovementCard, MovementEditor } from '../../features/monthly-budget/components/movement-card';
import { BalanceAfter } from '../../features/monthly-budget/components/balance-after';
import { MovedBreakdown } from '../../features/monthly-budget/components/moved-breakdown';
import { BatchStatus } from '../../features/monthly-budget/components/batch-status';

function monthKey(value: string) {
  return value.slice(0, 7);
}

function errorMessage(err: unknown): string | null {
  return err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
    ? (err as { message: string }).message
    : null;
}

// react-native-web's Alert.alert() is a no-op stub -- fall back to the
// browser's window.confirm on web so a confirmation still happens there.
function confirmAction(title: string, message: string, confirmLabel: string, cancelLabel: string, onConfirm: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

type CategoryLike = { id: string; name: string; parent_id?: string | null };

function pickCategory(categories: CategoryLike[], patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = categories.find((category) => pattern.test(category.name));
    if (match) return match.id;
  }
  return categories.find((category) => !category.parent_id)?.id ?? categories[0]?.id ?? '';
}

const NEW_MOVEMENT = '__new__';

/**
 * Monthly Budget -- a simple monthly allocation tool:
 *
 *   1. Income (left)              -- which account the money lands in, and how much.
 *   2. Expected movements (right) -- compact cards. A movement goes from ONE
 *      source account to one or more destinations, each with its own amount
 *      ("Investing: Account A -> XTB 300, Trading212 200, TR 100 = 600").
 *   3. Monthly preview            -- what happens to each account.
 *   4. Save                       -- posts the income transaction(s) first,
 *                                    then one real transfer per destination.
 *
 * Storage: everything is `planned_items`. A movement is ONE outflow item
 * with N destinations (allocation 'single' or 'custom_amount'); the
 * existing resolver + confirm_planned_item_month already turn that into one
 * transfer_source/transfer_destination pair per destination, so grouping
 * changes nothing about the accounting -- it's the same multi-destination
 * mechanism earlier versions of this screen used.
 *
 * Editing: each movement is saved on its own (the editor's Save persists
 * that one planned item immediately); income lines are held locally until
 * "Save plan only" / "Save {month}". Everything repeats monthly by default.
 *
 * Save ordering: plannedItemsConfirmService.confirmMonth sends every income
 * leg before any transfer leg, and confirm_planned_item_month inserts them
 * in that order inside ONE database transaction -- the income transaction
 * always exists before any transfer out of it, and a failure part-way keeps
 * nothing. Recurring expenses (Category Budgets) are never posted here.
 */
export default function BudgetScreen() {
  const { t, i18n } = useTranslation('common');
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const { householdId, profile } = useAuth();
  const { show: showToast } = useToast();

  const accountsQuery = useAccounts();
  const accountBalancesQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const incomeCategoriesQuery = useCategories('income');
  const expenseCategoriesQuery = useCategories('expense');
  const accountCategoriesQuery = useCategories('account');

  const accounts = useMemo<BudgetAccountLike[]>(() => {
    const balancesById = new Map((accountBalancesQuery.data ?? []).map((account) => [account.id, Number(account.current_balance ?? 0)]));
    return (accountsQuery.data ?? []).map((account) => ({ ...account, current_balance: balancesById.get(account.id) ?? 0 }));
  }, [accountBalancesQuery.data, accountsQuery.data]);
  const members = useMemo(() => ((membersQuery.data ?? []) as BudgetMemberLike[]).filter((member) => member.status === 'accepted'), [membersQuery.data]);
  const accountNameMap = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts]);
  // accountId -> owner's name ("Shared" for household accounts) -- same
  // account-ownership data (accounts.owner_profile_id) used everywhere else.
  const accountOwnerMap = useMemo(
    () =>
      new Map(
        accounts.map((account) => [
          account.id,
          account.owner_profile_id
            ? getMemberLabel(members.find((member) => member.userId === account.owner_profile_id), t('budget.shared'))
            : t('budget.shared'),
        ]),
      ),
    [accounts, members, t],
  );
  const accountsById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const ownerLabel = (ownerProfileId: string | null) =>
    ownerProfileId ? getMemberLabel(members.find((member) => member.userId === ownerProfileId), t('budget.shared')) : t('budget.shared');
  const accountWithOwner = (accountId: string) => {
    const name = accountNameMap.get(accountId) ?? '';
    const owner = accountOwnerMap.get(accountId);
    return owner ? `${name} (${owner})` : name;
  };

  const incomeCategories = incomeCategoriesQuery.data ?? [];
  const movementCategories = useMemo(
    () => [...(accountCategoriesQuery.data ?? []), ...(expenseCategoriesQuery.data ?? [])],
    [accountCategoriesQuery.data, expenseCategoriesQuery.data],
  );
  const defaultIncomeCategoryId = useMemo(() => pickCategory(incomeCategories, [/sal[aá]r/i, /ordenado|vencimento|wage|income|rendimento/i]), [incomeCategories]);
  const defaultMovementCategoryId = useMemo(() => {
    const accountCategories = accountCategoriesQuery.data ?? [];
    if (accountCategories.length > 0) return pickCategory(accountCategories, [/transfer/i]);
    return pickCategory(expenseCategoriesQuery.data ?? [], [/transfer/i, /poupan|saving/i]);
  }, [accountCategoriesQuery.data, expenseCategoriesQuery.data]);

  // ---- Month ----
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const normalizedMonth = monthKey(month);
  const monthLabel = useMemo(() => {
    const [year, monthNumber] = normalizedMonth.split('-').map(Number);
    if (!year || !monthNumber) return normalizedMonth;
    return new Date(year, monthNumber - 1, 1).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
  }, [normalizedMonth, i18n.language]);

  const periodQuery = useMonthlyBudgetPeriod(normalizedMonth);
  const batchQuery = useMonthlyBudgetBatch(normalizedMonth);
  const activeBatch = batchQuery.data ?? null;
  // "Created" = this month's income + transfers exist: a live batch, or a
  // month committed before batches existed (legacy -- undone via revert).
  const isMonthSaved = !!activeBatch || periodQuery.data?.status === 'committed' || periodQuery.data?.status === 'closed';
  const previewQuery = usePlannedItemsPreview(normalizedMonth);

  // ---- Plan state ----
  // Incomes: edited locally until Save. Movements: always mirror the saved
  // planned items (each movement is saved from its own editor).
  const itemsQuery = usePlannedItems();
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [removedRows, setRemovedRows] = useState<PlanRow[]>([]);
  const [showIssues, setShowIssues] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newMovement, setNewMovement] = useState<PlanRow | null>(null);
  const [movementSaving, setMovementSaving] = useState(false);
  const hydratedFromRef = useRef<unknown>(null);

  const hasUnsavedChanges = removedRows.length > 0 || rows.some(isRowDirty);

  const hydrate = useCallback((items: Parameters<typeof rowsFromPlannedItems>[0]) => {
    hydratedFromRef.current = items;
    setRows(rowsFromPlannedItems(items));
    setRemovedRows([]);
    setShowIssues(false);
  }, []);

  // Load from the saved templates -- and pick up changes made elsewhere,
  // but never over the top of unsaved income edits or mid-save.
  useEffect(() => {
    const data = itemsQuery.data;
    if (!data || isSaving || movementSaving || data === hydratedFromRef.current) return;
    if (hydratedFromRef.current !== null && hasUnsavedChanges) return;
    hydrate(data);
  }, [itemsQuery.data, isSaving, movementSaving, hasUnsavedChanges, hydrate]);

  const incomeRows = rows.filter((row) => row.kind === 'income');
  const movementRows = rows.filter((row) => row.kind === 'movement');

  function updateIncome(key: string, patch: Partial<PlannedItemDraft>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, draft: { ...row.draft, ...patch } } : row)));
  }

  function removeIncome(key: string) {
    const target = rows.find((row) => row.key === key);
    if (target?.sourceItemId) setRemovedRows((current) => [...current, target]);
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function discardChanges() {
    if (itemsQuery.data) hydrate(itemsQuery.data);
  }

  const defaultIncomeAccountId = useMemo(() => {
    const usable = accounts.filter((account) => !account.is_archived && (account.type === 'bank' || account.type === 'cash'));
    return (usable.find((account) => account.owner_profile_id === profile?.id) ?? usable[0])?.id ?? '';
  }, [accounts, profile?.id]);
  const primaryIncomeAccountId = (incomeRows[0] ? rowToAccountId(incomeRows[0]) : '') || defaultIncomeAccountId;

  function addIncome() {
    setRows((current) => {
      const next = newIncomeRow(defaultIncomeAccountId, defaultIncomeCategoryId);
      const lastIncomeIndex = current.map((row) => row.kind).lastIndexOf('income');
      const copy = [...current];
      copy.splice(lastIncomeIndex + 1, 0, next);
      return copy;
    });
  }

  const incomeIssues = useMemo(() => new Map(incomeRows.map((row) => [row.key, validateRow(row)])), [incomeRows]);
  const hasIssues = [...incomeIssues.values()].some((issues) => issues.length > 0);

  // ---- Summary / preview ----
  const itemNameById = useMemo(() => new Map((itemsQuery.data ?? []).map((item) => [item.id, item.name])), [itemsQuery.data]);
  const postedRows = useMemo(
    () => (isMonthSaved && previewQuery.data ? rowsFromPostedMonth(previewQuery.data, itemNameById) : []),
    [isMonthSaved, previewQuery.data, itemNameById],
  );
  const planAccounts = useMemo(() => accounts.map((account) => ({ id: account.id, currentBalance: Number(account.current_balance ?? 0) })), [accounts]);
  const summary = useMemo(
    () => summarizeMonthlyPlan({ rows: isMonthSaved ? postedRows : rows, month: normalizedMonth, accounts: planAccounts }),
    [isMonthSaved, postedRows, rows, normalizedMonth, planAccounts],
  );

  const money = (amount: number) => displayCurrency(formatCurrency(amount), hideValues);

  // ---- Mutations ----
  const createItem = useCreatePlannedItem();
  const updateItem = useUpdatePlannedItem();
  const deleteItem = useDeletePlannedItem();
  const confirmMonth = useConfirmPlannedItemMonth();
  const revertMonth = useRevertMonthlyBudgetMonth();

  /** Refreshes the movement cards from the server without touching unsaved income edits. */
  async function syncMovementsFromServer() {
    const fresh = await itemsQuery.refetch();
    if (!fresh.data) return;
    hydratedFromRef.current = fresh.data;
    const freshMovements = rowsFromPlannedItems(fresh.data).filter((row) => row.kind === 'movement');
    setRows((current) => [...current.filter((row) => row.kind === 'income'), ...freshMovements]);
  }

  // ---- Movements: create / edit / delete (each saved immediately) ----
  function startNewMovement() {
    setEditingKey(NEW_MOVEMENT);
    setNewMovement(newMovementRow(primaryIncomeAccountId, defaultMovementCategoryId));
  }

  function closeEditor() {
    setEditingKey(null);
    setNewMovement(null);
  }

  async function saveMovement(row: PlanRow) {
    if (movementSaving) return;
    setMovementSaving(true);
    try {
      const draft = toPersistableDraft(row, row.draft.name.trim());
      if (row.sourceItemId) await updateItem.mutateAsync({ ...draft, id: row.sourceItemId });
      else await createItem.mutateAsync(draft);
      await syncMovementsFromServer();
      closeEditor();
      showToast(t('budget.plan.movementSavedToast'));
    } catch (err) {
      showToast(errorMessage(err) ?? t('budget.plan.saveErrorToast'));
    } finally {
      setMovementSaving(false);
    }
  }

  function deleteMovement(row: PlanRow) {
    if (!row.sourceItemId || movementSaving) return;
    const itemId = row.sourceItemId;
    confirmAction(
      t('budget.plan.deleteMovementTitle', { name: row.draft.name || t('budget.plan.unnamedMovement') }),
      t('budget.plan.deleteMovementMessage'),
      t('budget.plan.deleteMovement'),
      t('cancel'),
      () => {
        setMovementSaving(true);
        void deleteItem
          .mutateAsync(itemId)
          .then(async () => {
            await syncMovementsFromServer();
            closeEditor();
          })
          .catch((err: unknown) => showToast(errorMessage(err) ?? t('budget.plan.saveErrorToast')))
          .finally(() => setMovementSaving(false));
      },
      true,
    );
  }

  // ---- Save (incomes, then post the month) ----
  function defaultNameFor(row: PlanRow): string {
    return t('budget.plan.defaultIncomeName', { account: accountNameMap.get(rowToAccountId(row)) ?? '' });
  }

  async function persistIncomes(): Promise<boolean> {
    if (hasIssues) {
      setShowIssues(true);
      showToast(t('budget.plan.fixIssuesToast'));
      return false;
    }
    const plan = buildSavePlan(incomeRows, removedRows, defaultNameFor);
    // Creates and updates before deletes: if something fails part-way,
    // the worst case is a duplicate line you can remove -- never a lost one.
    for (const entry of plan.creates) await createItem.mutateAsync(entry.draft);
    for (const entry of plan.updates) await updateItem.mutateAsync(entry.draft);
    for (const id of plan.deletes) await deleteItem.mutateAsync(id);
    return true;
  }

  async function runSave(postTransactions: boolean) {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const ok = await persistIncomes();
      if (!ok) return;
      if (postTransactions) {
        await confirmMonth.mutateAsync(normalizedMonth);
        showToast(t('budget.plan.createdToast', { month: monthLabel }));
      } else {
        showToast(t('budget.plan.incomeSavedToast'));
      }
      const fresh = await itemsQuery.refetch();
      if (fresh.data) hydrate(fresh.data);
    } catch (err) {
      showToast(errorMessage(err) ?? t('budget.plan.saveErrorToast'));
    } finally {
      setIsSaving(false);
    }
  }

  const isEditingMovement = editingKey !== null;
  const nothingToCreate = summary.incomes.length === 0 && summary.movements.length === 0;
  const canCreate = Boolean(householdId && profile?.id && !isMonthSaved && !nothingToCreate && !isSaving && !isEditingMovement);

  /** "Create all transfers": saves pending income edits, then ONE atomic call creates income first, then every transfer, as one batch. */
  function handleCreateAll() {
    if (!canCreate) return;
    if (hasIssues) {
      setShowIssues(true);
      showToast(t('budget.plan.fixIssuesToast'));
      return;
    }
    const incomeText = summary.incomes.length > 0
      ? t('budget.plan.createConfirmIncome', { count: summary.incomes.length, amount: money(summary.totalIncome) })
      : '';
    confirmAction(
      t('budget.plan.createConfirmTitle'),
      `${incomeText}${t('budget.plan.createConfirmMessage', { count: summary.movements.length, month: monthLabel })}\n\n${t('budget.plan.totalMovedValue', { amount: money(summary.totalMoved) })}`,
      t('budget.plan.createTransfers'),
      t('cancel'),
      () => void runSave(true),
    );
  }

  const undoBatch = useUndoMonthlyBudgetBatch();
  const isUndoing = undoBatch.isPending || revertMonth.isPending;

  /** Undo exactly this month's batch (by batch id); legacy months fall back to the scoped month revert. */
  function handleUndo() {
    if (!householdId || isUndoing) return;
    const batchId = activeBatch?.id ?? null;
    confirmAction(
      t('budget.plan.undoConfirmTitle', { month: monthLabel }),
      batchId
        ? t('budget.plan.undoConfirmMessage', { count: activeBatch?.transfer_count ?? 0 })
        : t('budget.plan.resetMessage'),
      batchId ? t('budget.plan.undoBatch') : t('budget.revertMonthConfirm'),
      t('cancel'),
      () => {
        const action = batchId ? undoBatch.mutateAsync(batchId) : revertMonth.mutateAsync(normalizedMonth);
        void Promise.resolve(action)
          .then(() => showToast(t('budget.plan.undoneToast', { month: monthLabel })))
          .catch((err: unknown) => showToast(errorMessage(err) ?? t('budget.revertMonthError', { month: monthLabel })));
      },
      true,
    );
  }

  // ---- Render helpers ----
  const totalLine = (label: string, value: string, emphasis = false, tone?: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing(3), paddingHorizontal: spacing(1) } as any}>
      <Text style={{ flex: 1, color: emphasis ? colors.text : colors.textSecondary, fontWeight: String(emphasis ? typography.fontWeight.bold : typography.fontWeight.semibold) } as any}>{label}</Text>
      <Text style={{ color: tone ?? colors.text, fontWeight: String(typography.fontWeight.extraBold), fontSize: emphasis ? typography.fontSize[18] : typography.fontSize[15] } as any}>{value}</Text>
    </View>
  );

  const addButton = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1.5), padding: spacing(3), borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name="add" size={18} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: String(typography.fontWeight.bold) } as any}>{label}</Text>
    </Pressable>
  );

  const readOnlyLine = (key: string, left: string, right: string) => (
    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(3), height: 44, paddingHorizontal: spacing(3), borderRadius: radius.lg, backgroundColor: colors.surfaceMuted } as any}>
      <Text style={{ flex: 1, color: colors.text } as any} numberOfLines={1}>{left}</Text>
      <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{right}</Text>
    </View>
  );


  const shared = { month: normalizedMonth, monthLabel, accounts, members, accountNameMap, accountOwnerMap };

  return (
    <Page
      title={t('budget.title')}
      subtitle={t('budget.plan.screenSubtitle')}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(420)}>
        <Card>
          <View style={{ flexDirection: responsive.isPhone ? 'column' : 'row', gap: spacing(3), alignItems: responsive.isPhone ? 'stretch' : 'flex-end', justifyContent: 'space-between' } as any}>
            <View style={!responsive.isPhone ? { width: 280 } : undefined}>
              <MonthPickerField label={t('budget.month')} value={month} onChange={setMonth} placeholder="MM-YYYY" />
            </View>
            {isMonthSaved ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radius.full, backgroundColor: colors.successSoft } as any}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={{ color: colors.success, fontWeight: String(typography.fontWeight.bold) } as any}>{t('budget.plan.savedBadge')}</Text>
              </View>
            ) : hasUnsavedChanges ? (
              <Pressable onPress={discardChanges} accessibilityRole="button">
                <Text style={{ color: colors.primary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('budget.plan.discardChanges')}</Text>
              </Pressable>
            ) : null}
          </View>
        </Card>
      </Animated.View>

      <View style={!responsive.isPhone ? { flexDirection: 'row', gap: spacing(3), alignItems: 'flex-start' } : { gap: spacing(3) }}>
        {/* ---- 1. Income (left) ---- */}
        <View style={!responsive.isPhone ? { flex: 1, minWidth: 0 } : undefined}>
          <Animated.View entering={FadeInDown.delay(80).duration(420)}>
            <Card>
              <Section title={t('budget.plan.incomeTitle')} subtitle={isMonthSaved ? t('budget.plan.savedSubtitle') : t('budget.plan.incomeSubtitle')}>
                <View style={{ gap: spacing(2) } as any}>
                  {isMonthSaved ? (
                    <>
                      {postedRows
                        .filter((row) => row.kind === 'income')
                        .map((row) => readOnlyLine(row.key, `${row.draft.name || t('budget.plan.incomeTitle')} · ${accountWithOwner(rowToAccountId(row))}`, `+${money(rowAmount(row))}`))}
                      {postedRows.length === 0 ? <Text style={{ color: colors.textSecondary } as any}>{t('budget.plan.savedNothing')}</Text> : null}
                    </>
                  ) : (
                    <>
                      {incomeRows.length > 0 ? <IncomeColumnsHeader /> : null}
                      {incomeRows.map((row) => (
                        <IncomeLineRow
                          key={row.key}
                          row={row}
                          month={normalizedMonth}
                          monthLabel={monthLabel}
                          accounts={accounts}
                          members={members}
                          categories={incomeCategories}
                          issues={incomeIssues.get(row.key) ?? []}
                          showIssues={showIssues}
                          onChange={(patch) => updateIncome(row.key, patch)}
                          onRemove={() => removeIncome(row.key)}
                        />
                      ))}
                      {addButton(incomeRows.length === 0 ? t('budget.plan.addIncome') : t('budget.plan.addAnotherIncome'), addIncome)}
                      {hasUnsavedChanges ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                          <View style={{ flexGrow: 1, minWidth: 120 } as any}>
                            <Button label={t('budget.plan.discardChanges')} variant="secondary" onPress={discardChanges} disabled={isSaving} />
                          </View>
                          <View style={{ flexGrow: 1, minWidth: 120 } as any}>
                            <Button label={isSaving ? t('budget.plan.saving') : t('budget.plan.saveIncome')} onPress={() => void runSave(false)} disabled={isSaving} />
                          </View>
                        </View>
                      ) : null}
                    </>
                  )}
                  {totalLine(t('budget.plan.totalIncome'), money(summary.totalIncome), true)}
                </View>
              </Section>
            </Card>
          </Animated.View>
        </View>

        {/* ---- 2. Expected movements (right) ---- */}
        <View style={!responsive.isPhone ? { flex: 1.2, minWidth: 0 } : undefined}>
          <Animated.View entering={FadeInDown.delay(160).duration(420)}>
            <Card>
              <Section title={t('budget.plan.movementsTitle')} subtitle={t('budget.plan.movementsSubtitle')}>
                <View style={{ gap: spacing(2) } as any}>
                  {isMonthSaved ? (
                    <BatchStatus
                      monthLabel={monthLabel}
                      batchId={activeBatch?.id ?? null}
                      transferCount={activeBatch ? activeBatch.transfer_count : summary.movements.length}
                      transferTotal={activeBatch ? Number(activeBatch.transfer_total) : summary.totalMoved}
                      incomeCount={activeBatch ? activeBatch.income_count : summary.incomes.length}
                      incomeTotal={activeBatch ? Number(activeBatch.income_total) : summary.totalIncome}
                      accountLabel={accountWithOwner}
                      isUndoing={isUndoing}
                      onUndo={handleUndo}
                    />
                  ) : (
                    <>
                      {movementRows.map((row) =>
                        editingKey === row.key ? (
                          <MovementEditor
                            key={row.key}
                            {...shared}
                            row={row}
                            isNew={false}
                            categories={movementCategories}
                            isSaving={movementSaving}
                            onSave={(edited) => void saveMovement(edited)}
                            onCancel={closeEditor}
                            onDelete={() => deleteMovement(row)}
                          />
                        ) : (
                          <MovementCard
                            key={row.key}
                            {...shared}
                            row={row}
                            onEdit={() => {
                              setNewMovement(null);
                              setEditingKey(row.key);
                            }}
                          />
                        ),
                      )}

                      {editingKey === NEW_MOVEMENT && newMovement ? (
                        <MovementEditor
                          {...shared}
                          row={newMovement}
                          isNew
                          categories={movementCategories}
                          isSaving={movementSaving}
                          onSave={(edited) => void saveMovement(edited)}
                          onCancel={closeEditor}
                        />
                      ) : null}

                      {editingKey !== NEW_MOVEMENT ? addButton(t('budget.plan.addMovement'), startNewMovement) : null}

                      <View style={{ gap: spacing(2), paddingTop: spacing(2), marginTop: spacing(1), borderTopWidth: 1, borderTopColor: colors.border } as any}>
                        <MovedBreakdown movements={summary.movements} total={summary.totalMoved} accountsById={accountsById} ownerLabel={ownerLabel} />
                        <BalanceAfter summary={summary} accountLabel={accountWithOwner} />
                        {isEditingMovement ? (
                          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{t('budget.plan.finishMovementFirst')}</Text>
                        ) : hasUnsavedChanges ? (
                          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{t('budget.plan.createSavesIncome')}</Text>
                        ) : null}
                        <Button
                          label={isSaving ? t('budget.plan.creating') : t('budget.plan.createAllTransfers')}
                          onPress={handleCreateAll}
                          disabled={!canCreate}
                        />
                      </View>
                    </>
                  )}
                </View>
              </Section>
            </Card>
          </Animated.View>
        </View>
      </View>

      <View style={{ height: spacing(6) + insets.bottom } as any} />
    </Page>
  );
}
