import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Ionicons } from '@expo/vector-icons';

import { Badge, EmptyState, Table, TableCell, TableRow } from '@/components/data-surface';
import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { GroupedDestinationSelect, type DestinationSelection } from '@/components/grouped-destination-select';
import { DatePickerField as SharedDatePickerField } from '@/components/date-picker-field';
import { HouseholdMemberSelect } from '@/components/household-member-select';
import { Button, Card, Field, Page, Pill, Section, formatCurrency, formatDate } from '@/components/migrated-page';
import { useAccountsWithBalances } from '@/features/accounts/hooks';
import { useTopLevelCategories } from '@/features/categories/hooks';
import { useHouseholdMemberDetails } from '@/features/households/hooks';
import { useCreateRecurringTransaction, useDeleteRecurringTransaction, useRecurringExecutionHistory, useRecurringTransactions, useToggleRecurringTransaction, useUpdateRecurringTransaction } from '@/features/recurring-transactions/hooks';
import { useSavingPotAccountAssignments, useSavingPots } from '@/features/saving-pots/hooks';
import { useCreateTransfer } from '@/features/transfers/hooks';
import { useAuth } from '@/providers/AuthProvider';
import { radius } from '@/theme/radius';
import { useResponsiveMetrics } from '@/theme/responsive';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';

type MovementKind = 'one-off' | 'recurring-transfer' | 'recurring-transaction';
type RuleKind = Exclude<MovementKind, 'one-off'>;
type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
type TransactionType = 'income' | 'expense';

type MovementDraft = {
  id?: string;
  kind: MovementKind;
  title: string;
  amount: string;
  notes: string;
  sourceAccountId: string;
  destination: DestinationSelection | null;
  categoryId: string | null;
  transactionType: TransactionType;
  frequency: Frequency;
  excludedMonths: number[];
  nextRun: string;
  createdById: string;
};

const frequencies: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];
const months = [
  { value: 1, key: 'jan' }, { value: 2, key: 'feb' }, { value: 3, key: 'mar' },
  { value: 4, key: 'apr' }, { value: 5, key: 'may' }, { value: 6, key: 'jun' },
  { value: 7, key: 'jul' }, { value: 8, key: 'aug' }, { value: 9, key: 'sep' },
  { value: 10, key: 'oct' }, { value: 11, key: 'nov' }, { value: 12, key: 'dec' },
] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeMonths(values: unknown) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(Number)
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12))]
    .sort((left, right) => left - right);
}

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function emptyDraft(kind: MovementKind, currentUserId?: string) : MovementDraft {
  return {
    kind,
    title: kind === 'one-off' ? '' : '',
    amount: '',
    notes: '',
    sourceAccountId: '',
    destination: null,
    categoryId: null,
    transactionType: 'expense',
    frequency: 'monthly',
    excludedMonths: [],
    nextRun: today(),
    createdById: currentUserId ?? '',
  };
}

function ruleKindOf(item: any): RuleKind {
  return item.rule_kind === 'transfer' ? 'recurring-transfer' : 'recurring-transaction';
}

function DatePickerField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseDate(value) ?? new Date());

  useEffect(() => {
    if (!open) setDraftDate(parseDate(value) ?? new Date());
  }, [open, value]);

  if (Platform.OS === 'web') {
    return <SharedDatePickerField label={label} value={value} onChange={onChange} placeholder={placeholder} />;
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
      >
        <Text style={{ color: value ? colors.text : colors.textSecondary }}>{value || placeholder}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <View style={[styles.datePicker, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <DateTimePicker
            value={draftDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            presentation={Platform.OS === 'android' ? 'dialog' : 'inline'}
            onValueChange={(_, nextDate) => {
              if (!nextDate) return;
              setDraftDate(nextDate);
              if (Platform.OS === 'android') {
                onChange(formatDateInput(nextDate));
                setOpen(false);
              }
            }}
            onDismiss={() => setOpen(false)}
          />
          {Platform.OS !== 'android' ? (
            <View style={styles.inlineActions}>
              <Button label={t('cancel')} variant="secondary" onPress={() => setOpen(false)} />
              <Button label={t('done')} onPress={() => { onChange(formatDateInput(draftDate)); setOpen(false); }} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function KindPills({ value, onChange }: { value: MovementKind; onChange: (kind: MovementKind) => void }) {
  const { t } = useTranslation('common');
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{t('transfers.movementType')}</Text>
      <View style={styles.pillRow}>
        {(['one-off', 'recurring-transfer', 'recurring-transaction'] as MovementKind[]).map((kind) => (
          <Pill
            key={kind}
            label={t(`transfers.types.${kind === 'one-off' ? 'oneOff' : kind === 'recurring-transfer' ? 'recurringTransfer' : 'recurringTransaction'}`)}
            active={value === kind}
            onPress={() => onChange(kind)}
          />
        ))}
      </View>
    </View>
  );
}

export default function TransfersScreen() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const savingPotsQuery = useSavingPots();
  const savingPotAssignmentsQuery = useSavingPotAccountAssignments();
  const recurringQuery = useRecurringTransactions();
  const createTransfer = useCreateTransfer();
  const createRecurring = useCreateRecurringTransaction();
  const updateRecurring = useUpdateRecurringTransaction();
  const toggleRecurring = useToggleRecurringTransaction();
  const deleteRecurring = useDeleteRecurringTransaction();

  const [draft, setDraft] = useState<MovementDraft>(() => emptyDraft('one-off', profile?.id));
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<'all' | RuleKind>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [selectedRule, setSelectedRule] = useState<any | null>(null);
  const [editing, setEditing] = useState<MovementDraft | null>(null);
  const [historyRule, setHistoryRule] = useState<any | null>(null);
  const executionHistoryQuery = useRecurringExecutionHistory(historyRule?.id);

  const accounts = accountsQuery.data ?? [];
  const members = (membersQuery.data ?? []).filter((member) => member.status === 'accepted');
  const categoriesQuery = useTopLevelCategories(draft.transactionType);
  const editCategoriesQuery = useTopLevelCategories(editing?.transactionType ?? 'expense');
  const potNameByAccountId = useMemo(() => {
    const potNames = new Map((savingPotsQuery.data ?? []).map((pot: any) => [pot.id, pot.name]));
    return (savingPotAssignmentsQuery.data ?? []).reduce<Record<string, string>>((result, assignment: any) => {
      const potName = potNames.get(assignment.pot_id);
      if (potName) result[assignment.account_id] = potName;
      return result;
    }, {});
  }, [savingPotAssignmentsQuery.data, savingPotsQuery.data]);
  const typeLabels = useMemo(() => ({
    bank: t('accounts.types.bank'), cash: t('accounts.types.cash'), savings: t('accounts.types.savings'),
    credit_card: t('accounts.types.credit_card'), investment: t('accounts.types.investment'), ppr: t('accounts.types.ppr'),
  }), [t]);
  const memberLabels = useMemo(() => new Map(members.map((member) => [member.userId, member.fullName?.trim() || member.email || member.userId])), [members]);
  const visibleRules = useMemo(() => (recurringQuery.data ?? []).filter((item: any) => {
    const ruleKind = ruleKindOf(item);
    if (kindFilter !== 'all' && ruleKind !== kindFilter) return false;
    if (statusFilter === 'active' && !item.is_active) return false;
    if (statusFilter === 'paused' && item.is_active) return false;
    return true;
  }), [kindFilter, recurringQuery.data, statusFilter]);

  const updateDraft = (patch: Partial<MovementDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const updateEditing = (patch: Partial<MovementDraft>) => setEditing((current) => current ? ({ ...current, ...patch }) : current);
  const currentTitle = draft.kind === 'one-off'
    ? t('transfers.createTitle')
    : draft.kind === 'recurring-transfer' ? t('transfers.recurringTransferTitle') : t('transfers.recurringTransactionTitle');

  function validMovement(value: MovementDraft) {
    const amount = Number(value.amount);
    const requiredDestination = value.kind === 'one-off' || value.kind === 'recurring-transfer';
    return Boolean(householdId && profile?.id && value.sourceAccountId && value.title.trim() && Number.isFinite(amount) && amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(value.nextRun) && (!requiredDestination || value.destination));
  }

  function recurringPayload(value: MovementDraft) {
    const isTransfer = value.kind === 'recurring-transfer';
    return {
      household_id: householdId,
      account_id: value.sourceAccountId,
      destination_account_id: isTransfer ? value.destination?.id ?? null : null,
      destination_pot_id: null,
      rule_kind: isTransfer ? 'transfer' : 'transaction',
      category_id: isTransfer ? null : value.categoryId,
      title: value.title.trim(),
      notes: value.notes.trim() || null,
      amount: Number(value.amount),
      type: isTransfer ? 'expense' : value.transactionType,
      frequency: value.frequency,
      excluded_months: value.frequency === 'custom' ? normalizeMonths(value.excludedMonths) : [],
      next_run: value.nextRun,
      created_by: value.createdById || profile?.id,
    };
  }

  async function saveDraft() {
    if (!validMovement(draft)) {
      setError(draft.kind === 'recurring-transfer' && !draft.destination ? t('transfers.requiresDestination') : t('transfers.invalidMovement'));
      return;
    }
    setError(null);
    if (draft.kind === 'one-off') {
      await createTransfer.mutateAsync({ householdId: householdId!, fromAccountId: draft.sourceAccountId, toAccountId: draft.destination!.id, amount: Number(draft.amount), title: draft.title.trim(), notes: draft.notes.trim(), transactionDate: draft.nextRun, createdBy: profile!.id });
    } else {
      await createRecurring.mutateAsync(recurringPayload(draft) as any);
    }
    setDraft(emptyDraft(draft.kind, profile?.id));
  }

  function openEdit(item: any) {
    const kind = ruleKindOf(item);
    const destination = item.destination_account_id ? { kind: 'account' as const, id: item.destination_account_id } : null;
    setEditing({ id: item.id, kind, title: item.title ?? '', amount: String(item.amount ?? ''), notes: item.notes ?? '', sourceAccountId: item.account_id ?? '', destination, categoryId: item.category_id ?? null, transactionType: item.type === 'income' ? 'income' : 'expense', frequency: item.frequency ?? 'monthly', excludedMonths: normalizeMonths(item.excluded_months), nextRun: item.next_run?.slice?.(0, 10) ?? today(), createdById: item.created_by ?? profile?.id ?? '' });
    setSelectedRule(null);
  }

  async function saveEdit() {
    if (!editing || !validMovement(editing)) return;
    const { household_id: _householdId, ...payload } = recurringPayload(editing);
    await updateRecurring.mutateAsync({ id: editing.id!, ...payload } as any);
    setEditing(null);
  }

  const selectedPending = createTransfer.isPending || createRecurring.isPending;

  return (
    <Page title={t('transfers.title')} subtitle={t('transfers.subtitle')}>
      <Card>
        <Section title={currentTitle}>
          {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}
          <KindPills value={draft.kind} onChange={(kind) => { setError(null); setDraft(emptyDraft(kind, profile?.id)); }} />
          <MovementFields
            value={draft}
            onChange={updateDraft}
            accounts={accounts as any}
            potNameByAccountId={potNameByAccountId}
            members={members as any}
            categories={categoriesQuery.data ?? []}
            typeLabels={typeLabels}
            t={t}
          />
          <Button label={selectedPending ? t('transfers.formCreating') : draft.kind === 'one-off' ? t('transfers.formCreate') : t('transfers.createRecurring')} onPress={() => void saveDraft()} disabled={!validMovement(draft) || selectedPending} />
        </Section>
      </Card>

      <Section title={t('transfers.scheduledTitle')} subtitle={t('transfers.scheduledSubtitle', { count: (recurringQuery.data ?? []).length })}>
        <View style={styles.filters}>
          <View style={styles.pillRow}>
            <Pill label={t('transfers.filterAll')} active={kindFilter === 'all'} onPress={() => setKindFilter('all')} />
            <Pill label={t('transfers.types.recurringTransfer')} active={kindFilter === 'recurring-transfer'} onPress={() => setKindFilter('recurring-transfer')} />
            <Pill label={t('transfers.types.recurringTransaction')} active={kindFilter === 'recurring-transaction'} onPress={() => setKindFilter('recurring-transaction')} />
          </View>
          <View style={styles.pillRow}>
            <Pill label={t('transfers.filterAll')} active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
            <Pill label={t('transfers.filterActive')} active={statusFilter === 'active'} onPress={() => setStatusFilter('active')} />
            <Pill label={t('transfers.filterPaused')} active={statusFilter === 'paused'} onPress={() => setStatusFilter('paused')} />
          </View>
        </View>
        {visibleRules.length ? (
          <Table columns={[
            { label: t('recurring.titleLabel'), flex: 2 }, { label: t('transfers.ruleKind'), flex: 1.2 },
            { label: t('transfers.route'), flex: 1.8 }, { label: t('transfers.frequency'), flex: 1 },
            { label: t('transfers.nextRun'), flex: 1 }, { label: t('recurring.amount'), align: 'right' }, { label: '', flex: 0.35, align: 'right' },
          ]}>
            {visibleRules.map((item: any) => {
              const kind = ruleKindOf(item);
              const destinationName = item.destination_account?.name ?? accounts.find((account: any) => account.id === item.destination_account_id)?.name;
              const route = kind === 'recurring-transfer'
                ? t('transfers.transferRoute', { from: item.account?.name ?? accounts.find((account: any) => account.id === item.account_id)?.name ?? t('transfers.sourceAccount'), to: destinationName ?? t('transfers.destination') })
                : item.account?.name ?? accounts.find((account: any) => account.id === item.account_id)?.name ?? t('recurring.account');
              return (
                <TableRow key={item.id}>
                  <TableCell flex={2}><View style={styles.ruleTitle}><Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any }}>{item.title}</Text><Badge label={item.is_active ? t('active') : t('inactive')} tone={item.is_active ? 'success' : 'neutral'} /></View></TableCell>
                  <TableCell flex={1.2}><Text style={{ color: colors.textSecondary }}>{t(kind === 'recurring-transfer' ? 'transfers.types.recurringTransfer' : 'transfers.types.recurringTransaction')}</Text></TableCell>
                  <TableCell flex={1.8}><Text style={{ color: colors.textSecondary }}>{route}</Text></TableCell>
                  <TableCell flex={1}><Text style={{ color: colors.textSecondary }}>{t(`recurring.frequencies.${item.frequency}`)}</Text></TableCell>
                  <TableCell flex={1}><Text style={{ color: colors.textSecondary }}>{formatDate(item.next_run)}</Text></TableCell>
                  <TableCell align="right"><Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold as any }}>{formatCurrency(item.amount)}</Text></TableCell>
                  <TableCell flex={0.35} align="right" mobilePinned><Pressable onPress={() => setSelectedRule(item)} style={[styles.menuButton, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}><Ionicons name="ellipsis-vertical" size={18} color={colors.text} /></Pressable></TableCell>
                </TableRow>
              );
            })}
          </Table>
        ) : <EmptyState title={t('transfers.emptyScheduled')} icon="repeat-outline" />}
      </Section>

      <RuleMenu
        item={selectedRule}
        onClose={() => setSelectedRule(null)}
        onEdit={() => selectedRule && openEdit(selectedRule)}
        onHistory={() => { setHistoryRule(selectedRule); setSelectedRule(null); }}
        onToggle={() => { if (selectedRule) void toggleRecurring.mutateAsync({ id: selectedRule.id, active: !selectedRule.is_active }); setSelectedRule(null); }}
        onDelete={() => { if (selectedRule) void deleteRecurring.mutateAsync(selectedRule.id); setSelectedRule(null); }}
        t={t}
        colors={colors}
        responsive={responsive}
      />

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} />
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalCard, { width: responsive.isPhone ? '100%' : spacing(150), borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('transfers.editScheduled')}</Text>
              {editing ? <MovementFields value={editing} onChange={updateEditing} accounts={accounts as any} potNameByAccountId={potNameByAccountId} members={members as any} categories={editCategoriesQuery.data ?? []} typeLabels={typeLabels} t={t} lockKind /> : null}
              <View style={styles.modalActions}><Button label={t('cancel')} variant="secondary" onPress={() => setEditing(null)} /><Button label={updateRecurring.isPending ? t('saving') : t('transfers.saveRecurring')} onPress={() => void saveEdit()} disabled={!editing || !validMovement(editing) || updateRecurring.isPending} /></View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={historyRule !== null} transparent animationType="fade" onRequestClose={() => setHistoryRule(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setHistoryRule(null)} />
          <View style={[styles.historyCard, { width: responsive.isPhone ? '100%' : spacing(110), borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('transfers.executionHistoryTitle')}</Text>
            {executionHistoryQuery.isLoading ? <Text style={{ color: colors.textSecondary }}>{t('loading')}</Text> : null}
            {executionHistoryQuery.data?.length ? executionHistoryQuery.data.map((execution: any) => (
              <View key={execution.id} style={[styles.historyRow, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any }}>{formatDate(execution.scheduled_for)}</Text>
                <Badge label={t(`transfers.executionStatuses.${execution.status}`)} tone={execution.status === 'completed' ? 'success' : execution.status === 'failed' ? 'destructive' : 'neutral'} />
                {execution.skip_reason || execution.error_message ? <Text style={{ color: colors.textSecondary }}>{execution.skip_reason ?? execution.error_message}</Text> : null}
              </View>
            )) : !executionHistoryQuery.isLoading ? <Text style={{ color: colors.textSecondary }}>{t('transfers.executionHistoryUnavailable')}</Text> : null}
            <Button label={t('close')} variant="secondary" onPress={() => setHistoryRule(null)} />
          </View>
        </View>
      </Modal>
    </Page>
  );
}

function MovementFields({ value, onChange, accounts, potNameByAccountId, members, categories, typeLabels, t, lockKind = false }: { value: MovementDraft; onChange: (patch: Partial<MovementDraft>) => void; accounts: any[]; potNameByAccountId: Record<string, string>; members: any[]; categories: any[]; typeLabels: Record<string, string>; t: any; lockKind?: boolean }) {
  const { colors } = useTheme();
  const isScheduled = value.kind !== 'one-off';
  const isTransfer = value.kind !== 'recurring-transaction';
  const allowedSourceIds = value.destination?.id ? accounts.filter((account) => account.id !== value.destination?.id).map((account) => account.id) : undefined;
  const allowedDestinationIds = value.sourceAccountId ? accounts.filter((account) => account.id !== value.sourceAccountId).map((account) => account.id) : undefined;
  const toggleMonth = (month: number) => onChange({ excludedMonths: value.excludedMonths.includes(month) ? value.excludedMonths.filter((entry) => entry !== month) : [...value.excludedMonths, month].sort((left, right) => left - right) });

  return (
    <View style={styles.formFields}>
      {!lockKind ? null : <Badge label={t(value.kind === 'recurring-transfer' ? 'transfers.types.recurringTransfer' : 'transfers.types.recurringTransaction')} tone="neutral" />}
      <Field label={t('recurring.titleLabel')} value={value.title} onChangeText={(title) => onChange({ title })} />
      <Field label={t('recurring.amount')} value={value.amount} onChangeText={(amount) => onChange({ amount })} keyboardType="numeric" />
      <Field label={t('transfers.notes')} value={value.notes} onChangeText={(notes) => onChange({ notes })} />
      {isScheduled ? <DatePickerField label={t('recurring.nextRun')} value={value.nextRun} onChange={(nextRun) => onChange({ nextRun })} placeholder={t('recurring.nextRunPlaceholder')} /> : <DatePickerField label={t('transfers.formDate')} value={value.nextRun} onChange={(nextRun) => onChange({ nextRun })} placeholder={t('recurring.nextRunPlaceholder')} />}
      {isScheduled ? <HouseholdMemberSelect label={t('recurring.createdBy')} members={members} value={value.createdById} placeholder={t('recurring.createdByPlaceholder')} hint={t('recurring.createdByPlaceholder')} onChange={(createdById) => onChange({ createdById })} /> : null}
      {isScheduled ? <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('transfers.frequency')}</Text><View style={styles.pillRow}>{frequencies.map((frequency) => <Pill key={frequency} label={t(`recurring.frequencies.${frequency}`)} active={value.frequency === frequency} onPress={() => onChange({ frequency })} />)}</View></View> : null}
      {isScheduled && value.frequency === 'custom' ? <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('transfers.excludeMonths')}</Text><Text style={{ color: colors.textSecondary }}>{t('transfers.excludeMonthsHint')}</Text><View style={styles.pillRow}>{months.map((month) => <Pill key={month.value} label={t(`transfers.months.${month.key}`)} active={value.excludedMonths.includes(month.value)} onPress={() => toggleMonth(month.value)} />)}</View></View> : null}
      <GroupedAccountSelect label={isTransfer ? t('transfers.sourceAccount') : t('recurring.account')} accounts={accounts} members={members} value={value.sourceAccountId} placeholder={isTransfer ? t('transfers.sourceAccount') : t('recurring.account')} hint={isTransfer ? t('transfers.sourceAccount') : t('recurring.account')} onChange={(sourceAccountId) => onChange({ sourceAccountId })} allowedAccountIds={allowedSourceIds} closeLabel={t('close')} sharedLabel={t('dashboard.shared')} unassignedLabel={t('settings.unnamedUser')} typeLabels={typeLabels} />
      {isTransfer ? <GroupedDestinationSelect label={t('transfers.destination')} accounts={accounts} members={members} value={value.destination} placeholder={t('transfers.destination')} hint={t('transfers.destination')} onChange={(destination) => onChange({ destination })} allowedAccountIds={allowedDestinationIds} closeLabel={t('close')} sharedLabel={t('dashboard.shared')} unassignedLabel={t('settings.unnamedUser')} typeLabels={typeLabels} potNameByAccountId={potNameByAccountId} potLabel={t('transfers.pigBank')} /> : null}
      {!isTransfer ? <><View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('transfers.transactionType')}</Text><View style={styles.pillRow}>{(['income', 'expense'] as TransactionType[]).map((transactionType) => <Pill key={transactionType} label={t(`recurring.types.${transactionType}`)} active={value.transactionType === transactionType} onPress={() => onChange({ transactionType, categoryId: null })} />)}</View></View><View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('recurring.category')}</Text><View style={styles.pillRow}><Pill label={t('none')} active={!value.categoryId} onPress={() => onChange({ categoryId: null })} />{categories.map((category) => <Pill key={category.id} label={category.name} active={value.categoryId === category.id} onPress={() => onChange({ categoryId: category.id })} />)}</View></View></> : null}
    </View>
  );
}

function RuleMenu({ item, onClose, onEdit, onHistory, onToggle, onDelete, t, colors, responsive }: any) {
  return <Modal visible={item !== null} transparent animationType="fade" onRequestClose={onClose}><View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={[styles.menuCard, { width: responsive.isPhone ? '100%' : spacing(88), borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.modalTitle, { color: colors.text }]}>{item?.title}</Text><MenuAction label={t('transfers.editScheduled')} icon="create-outline" onPress={onEdit} colors={colors} /><MenuAction label={t('transfers.executionHistory')} icon="time-outline" onPress={onHistory} colors={colors} /><MenuAction label={item?.is_active ? t('transfers.pause') : t('transfers.resume')} icon={item?.is_active ? 'pause-outline' : 'play-outline'} onPress={onToggle} colors={colors} /><MenuAction label={t('delete')} icon="trash-outline" onPress={onDelete} colors={colors} destructive /><Button label={t('cancel')} variant="secondary" onPress={onClose} /></View></View></Modal>;
}

function MenuAction({ label, icon, onPress, colors, destructive = false }: any) {
  return <Pressable onPress={onPress} style={[styles.menuAction, { borderColor: destructive ? colors.destructiveBorder : colors.border, backgroundColor: destructive ? colors.destructiveSoft : colors.surfaceMuted }]}><Ionicons name={icon} size={18} color={destructive ? colors.destructive : colors.text} /><Text style={{ color: destructive ? colors.destructive : colors.text, fontWeight: typography.fontWeight.bold as any }}>{label}</Text></Pressable>;
}

const styles: any = StyleSheet.create({
  formFields: { gap: spacing(3) }, fieldGroup: { gap: spacing(2) }, fieldLabel: { fontWeight: typography.fontWeight.semibold as any }, pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }, filters: { gap: spacing(2), marginBottom: spacing(4) }, ruleTitle: { gap: spacing(1.5), alignItems: 'flex-start' }, menuButton: { width: spacing(9), height: spacing(9), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radius.md }, dateButton: { minHeight: spacing(11), borderWidth: 1, borderRadius: radius.mdPlus, paddingHorizontal: spacing(3.5), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, datePicker: { gap: spacing(2), padding: spacing(3), borderWidth: 1, borderRadius: radius.lg }, inlineActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing(2) }, modalBackdrop: { flex: 1, justifyContent: 'center', padding: spacing(4) }, modalScroll: { flexGrow: 1, justifyContent: 'center' }, modalCard: { alignSelf: 'center', gap: spacing(3.5), borderWidth: 1, borderRadius: radius.xl, padding: spacing(4.5), maxWidth: '100%' }, historyCard: { alignSelf: 'center', gap: spacing(3.5), borderWidth: 1, borderRadius: radius.xl, padding: spacing(4.5), maxWidth: '100%' }, historyRow: { gap: spacing(1.5), borderTopWidth: 1, paddingTop: spacing(2) }, menuCard: { alignSelf: 'center', gap: spacing(2.5), borderWidth: 1, borderRadius: radius.xl, padding: spacing(4.5), maxWidth: '100%' }, modalTitle: { fontSize: typography.fontSize[20], fontWeight: typography.fontWeight.extraBold as any }, modalActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing(2) }, menuAction: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(3), borderRadius: radius.lg, borderWidth: 1 },
});
