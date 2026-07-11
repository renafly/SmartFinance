import { useCallback, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, Field, Button, Pill, formatCurrency, formatDate } from '@/components/migrated-page';
import { Badge, EmptyState, Table, TableCell, TableRow } from '@/components/data-surface';
import { HouseholdMemberSelect } from '@/components/household-member-select';
import { DropdownMenu, SelectionOptionRow, SelectionShell, SelectionTrigger } from '@/components/selection-shell';
import { GroupedAccountSelect } from '@/components/grouped-account-select';
import { useAuth } from '../../providers/AuthProvider';
import { useAccountsWithBalances } from '../../features/accounts/hooks';
import { useTopLevelCategories } from '../../features/categories/hooks';
import { useHouseholdMemberDetails } from '../../features/households/hooks';
import { useTransactionsInfinite } from '../../features/transactions/hooks/useTransactions';
import { useCreateTransaction } from '../../features/transactions/hooks/useCreateTransaction';
import { useDeleteTransaction } from '../../features/transactions/hooks/useDeleteTransaction';
import { useUpdateTransaction } from '../../features/transactions/hooks/useUpdateTransaction';
import { validateTransactionAttachment } from '../../features/transactions/services/transaction.service';

function getTransactionTypeIcon(type: 'income' | 'expense') {
  return type === 'expense' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline';
}

type TransactionEditDraft = {
  id: string;
  title: string;
  amount: string;
  date: string;
  notes: string;
  type: 'income' | 'expense';
  accountId: string;
  categoryId: string | null;
  createdById: string;
};

type DropdownFieldProps = {
  label: string;
  valueLabel: string;
  placeholder: string;
  hint?: string;
  selectedKey?: string;
  options: Array<{
    key: string;
    label: string;
    subtitle?: string;
    iconName?: keyof typeof Ionicons.glyphMap;
  }>;
  onChange: (key: string) => void;
};

function DropdownField({ label, valueLabel, placeholder, hint, selectedKey, options, onChange }: DropdownFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: spacing(2) }}>
      <SelectionTrigger
        label={label}
        valueLabel={valueLabel}
        hint={hint}
        placeholder={placeholder}
        iconName="chevron-down-outline"
        onPress={() => setOpen(true)}
      />
      <SelectionShell
        visible={open}
        title={label}
        subtitle={hint ?? placeholder}
        closeLabel={placeholder}
        onClose={() => setOpen(false)}
      >
        <View style={{ gap: spacing(2) }}>
          {options.map((option) => (
            <SelectionOptionRow
              key={option.key}
              title={option.label}
              subtitle={option.subtitle}
              iconName={option.iconName ?? 'ellipse-outline'}
              active={selectedKey ? option.key === selectedKey : option.label === valueLabel}
              onPress={() => {
                onChange(option.key);
                setOpen(false);
              }}
            />
          ))}
        </View>
      </SelectionShell>
    </View>
  );
}

function parseDateInputValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const nextDate = new Date(year, month, day);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function DatePickerField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseDateInputValue(value) ?? new Date());

  useMemo(() => {
    if (!open) {
      setDraftDate(parseDateInputValue(value) ?? new Date());
    }
  }, [open, value]);

  if (Platform.OS === 'web') {
    return <Field label={label} value={value} onChangeText={onChange} placeholder={placeholder} {...({ type: 'date' } as any)} />;
  }

  return (
    <View style={{ gap: spacing(2) }}>
      <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold as any } as any}>{label}</Text>
      <Pressable
        onPress={() => setOpen((current) => !current)}
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
        }}
      >
        <Text style={{ color: value.trim().length > 0 ? colors.text : colors.textSecondary, fontWeight: typography.fontWeight.bold as any } as any}>
          {value.trim().length > 0 ? value : placeholder}
        </Text>
        <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.bold as any } as any}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? (
        <View style={{ gap: spacing(2), padding: spacing(3), borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border }}>
          <DateTimePicker
            value={draftDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            presentation={Platform.OS === 'android' ? 'dialog' : 'inline'}
            onValueChange={(_, date) => {
              if (!date) return;
              setDraftDate(date);
              if (Platform.OS === 'android') {
                onChange(formatDateInputValue(date));
                setOpen(false);
              }
            }}
            onDismiss={() => setOpen(false)}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing(2) }}>
            <Button label={t('cancel')} variant="secondary" onPress={() => setOpen(false)} />
            <Button label={t('done')} onPress={() => { onChange(formatDateInputValue(draftDate)); setOpen(false); }} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function DateFilterField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing(1.5) }}>
      <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold as any } as any}>{label}</Text>
      <DatePickerField label={label} value={value} onChange={onChange} placeholder={placeholder} />
      {value ? (
        <Pressable
          onPress={() => onChange('')}
          style={({ pressed }) => [
            {
              alignSelf: 'flex-start',
              paddingHorizontal: spacing(2.5),
              paddingVertical: spacing(1.5),
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceMuted,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold as any } as any}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type AttachmentDraft = {
  file: Blob | ArrayBuffer | File;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

type TransactionSortKey = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';
const TRANSACTIONS_PAGE_SIZE = 25;

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation('common');
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [createdById, setCreatedById] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [filtersType, setFiltersType] = useState<'all' | 'income' | 'expense'>('all');
  const [accountFilter, setAccountFilter] = useState<'all' | string>('all');
  const [createdByFilter, setCreatedByFilter] = useState<'all' | string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<TransactionSortKey>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [menuTransaction, setMenuTransaction] = useState<any | null>(null);
  const [editTransaction, setEditTransaction] = useState<TransactionEditDraft | null>(null);

  const transactionsQuery = useTransactionsInfinite({
    type: filtersType === 'all' ? undefined : filtersType,
    accountId: accountFilter === 'all' ? undefined : accountFilter,
    createdBy: createdByFilter === 'all' ? undefined : createdByFilter,
    from: dateFrom || undefined,
    to: dateTo || undefined,
  }, TRANSACTIONS_PAGE_SIZE);
  const activeCategoryType = editTransaction?.type ?? type;
  const categoriesQuery = useTopLevelCategories(activeCategoryType);

  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const accountMemberOptions = useMemo(
    () =>
      (membersQuery.data ?? [])
        .filter((member) => member.status === 'accepted')
        .map((member) => ({
          id: member.userId,
          label: member.fullName?.trim() || member.email || member.userId,
        })),
    [membersQuery.data],
  );
  const transactions = useMemo(() => {
    const rowsById = new Map<string, any>();
    for (const page of transactionsQuery.data?.pages ?? []) {
      for (const item of page ?? []) {
        if (item?.id) {
          rowsById.set(item.id, item);
        }
      }
    }

    const rows = [...rowsById.values()];

    rows.sort((a: any, b: any) => {
      const dateA = new Date(a.transaction_date ?? 0).getTime();
      const dateB = new Date(b.transaction_date ?? 0).getTime();
      const amountA = Number(a.amount ?? 0);
      const amountB = Number(b.amount ?? 0);
      const idA = String(a.id ?? '');
      const idB = String(b.id ?? '');

      switch (sortBy) {
        case 'oldest':
          return dateA - dateB || a.title.localeCompare(b.title) || idA.localeCompare(idB);
        case 'amount_desc':
          return amountB - amountA || dateB - dateA || a.title.localeCompare(b.title) || idA.localeCompare(idB);
        case 'amount_asc':
          return amountA - amountB || dateB - dateA || a.title.localeCompare(b.title) || idA.localeCompare(idB);
        case 'newest':
        default:
          return dateB - dateA || a.title.localeCompare(b.title) || idB.localeCompare(idA);
      }
    });

    return rows;
  }, [sortBy, transactionsQuery.data]);
  const memberLabelMap = new Map(
    (membersQuery.data ?? [])
      .filter((member) => member.status === 'accepted')
      .map((member) => [
        member.userId,
        member.fullName?.trim() || member.email || member.userId,
      ]),
  );
  const accountLabelMap = new Map(
    (accounts as any[]).map((account) => [
      account.id,
      account.owner_profile_id ? (memberLabelMap.get(account.owner_profile_id) ?? t('dashboard.shared')) : t('dashboard.shared'),
    ]),
  );
  const currentUserLabel = profile?.full_name?.trim() || profile?.email?.trim() || t('settings.you');
  const currentUserId = profile?.id ?? '';
  const firstAccount = accounts[0]?.id ?? '';
  const parsedAmount = Number(amount);
  const effectiveAccountId = accountId || firstAccount;
  const getAccountOwnerLabel = (account: any) =>
    account.owner_profile_id ? (memberLabelMap.get(account.owner_profile_id) ?? t('dashboard.shared')) : t('dashboard.shared');
  const getAccountOptionSubtitle = (account: any) =>
    `${getAccountOwnerLabel(account)} · ${t(`accounts.types.${account.type}`, { defaultValue: account.type })} · ${formatCurrency(account.current_balance ?? account.balance ?? 0)}`;
  const selectedAccount = accounts.find((account: any) => account.id === effectiveAccountId);
  const selectedAccountLabel = selectedAccount
    ? `${selectedAccount.name} · ${t(`accounts.types.${selectedAccount.type}`, { defaultValue: selectedAccount.type })} · ${selectedAccount.owner_profile_id ? (memberLabelMap.get(selectedAccount.owner_profile_id) ?? t('dashboard.shared')) : t('dashboard.shared')}`
    : t('transactions.selectAccount');
  const selectedCreatorLabel =
    createdByFilter === 'all'
      ? t('all', { defaultValue: 'All' })
      : createdByFilter === currentUserId || createdByFilter === ''
        ? currentUserLabel
        : memberLabelMap.get(createdByFilter) ?? t('settings.unnamedUser');
  const effectiveCreatedById = createdById || currentUserId;
  const selectedCreateCreatorLabel =
    effectiveCreatedById === currentUserId
      ? currentUserLabel
      : memberLabelMap.get(effectiveCreatedById) ?? t('settings.unnamedUser');
  const canCreateTransaction =
    !createTransaction.isPending &&
    Boolean(householdId) &&
    Boolean(profile?.id) &&
    Boolean(effectiveAccountId) &&
    title.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date);
  const getTransactionAccountLabel = (item: any) => {
    const account = (accounts as any[]).find((entry) => entry.id === item.account_id) ?? item.account;
    if (!account) return t('transactions.account');

    const ownerLabel = account.owner_profile_id
      ? (memberLabelMap.get(account.owner_profile_id) ?? t('dashboard.shared'))
      : t('dashboard.shared');

    return `${account.name} · ${ownerLabel}`;
  };
  const handleTransactionsScroll = useCallback(
    (event: any) => {
      if (!transactionsQuery.hasNextPage || transactionsQuery.isFetchingNextPage) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);

      if (distanceFromBottom < 240) {
        void transactionsQuery.fetchNextPage();
      }
    },
    [transactionsQuery],
  );

  async function handlePickAttachment() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
      base64: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const file = asset.file ?? await (await fetch(asset.uri)).blob();
    const draft = {
      file,
      fileName: asset.name ?? `invoice-${Date.now()}`,
      fileSize: asset.size ?? ('size' in file ? file.size : 0),
      mimeType: asset.mimeType ?? ('type' in file ? file.type : 'application/octet-stream'),
    };

    validateTransactionAttachment(draft);
    setAttachment(draft);
  }

  async function handleCreate(keepOpen = false) {
    if (!householdId || !profile?.id || !effectiveAccountId || !title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    await createTransaction.mutateAsync({
      household_id: householdId,
      created_by: createdById || profile.id,
      account_id: effectiveAccountId,
      category_id: categoryId,
      type,
      title: title.trim(),
      amount: parsedAmount,
      notes: notes || null,
      transaction_date: date,
      attachment,
    } as any);

    setTitle('');
    setAmount('');
    setNotes('');
    setCategoryId(null);
    setAttachment(null);
    setDate(new Date().toISOString().slice(0, 10));
    setType('expense');
    if (!keepOpen) setCreateModalOpen(false);
  }

  function openEditTransaction(item: any) {
    setEditTransaction({
      id: item.id,
      title: item.title ?? '',
      amount: String(item.amount ?? ''),
      date: item.transaction_date?.slice?.(0, 10) ?? new Date().toISOString().slice(0, 10),
      notes: item.notes ?? '',
      type: item.type ?? 'expense',
      accountId: item.account_id ?? '',
      categoryId: item.category_id ?? null,
      createdById: item.created_by_profile?.id ?? item.created_by ?? profile?.id ?? '',
    });
    setMenuTransaction(null);
  }

  async function handleSaveTransaction() {
    if (!editTransaction || !householdId) return;

    const nextAmount = Number(editTransaction.amount);
    if (
      !editTransaction.title.trim() ||
      !editTransaction.accountId ||
      !Number.isFinite(nextAmount) ||
      nextAmount <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(editTransaction.date)
    ) {
      return;
    }

    await updateTransaction.mutateAsync({
      id: editTransaction.id,
      data: {
        title: editTransaction.title.trim(),
        amount: nextAmount,
        transaction_date: editTransaction.date,
        notes: editTransaction.notes || null,
        type: editTransaction.type,
        account_id: editTransaction.accountId,
        category_id: editTransaction.categoryId,
        created_by: editTransaction.createdById || profile?.id || editTransaction.createdById,
      } as any,
    });

    setEditTransaction(null);
  }

  return (
    <Page
      title={t('transactions.title')}
      subtitle={t('transactions.subtitle')}
      scrollViewProps={{
        onScroll: handleTransactionsScroll,
        scrollEventThrottle: 16,
      }}
      overlay={
        <Pressable
          accessibilityRole="button"
          onPress={() => setCreateModalOpen(true)}
          style={({ pressed }) => [styles.floatingCreateButton, pressed && styles.pressed] as any}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primaryForeground} />
          <Text style={styles.floatingCreateButtonText}>{t('transactions.addTransaction')}</Text>
        </Pressable>
      }
    >
      <Card>
        <Section
          title={t('transactions.filtersTitle')}
          subtitle={filtersOpen ? t('transactions.filtersSubtitle') : t('transactions.filtersCollapsed')}
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => setFiltersOpen((current) => !current)}
              style={[styles.filterToggle, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
            >
              <Ionicons name={filtersOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={colors.text} />
              <Text style={[styles.filterToggleLabel, { color: colors.text }]}>{filtersOpen ? t('transactions.hideFilters') : t('transactions.showFilters')}</Text>
            </Pressable>
          }
        >
          {filtersOpen ? (
          <View style={{ gap: spacing(3) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), flexWrap: 'wrap' }}>
            <Ionicons name="funnel-outline" size={16} color={colors.textSecondary} />
            {(['all', 'income', 'expense'] as const).map((item) => (
                <Pill key={item} label={t(`transactions.filters.${item}`)} active={filtersType === item} onPress={() => setFiltersType(item)} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), flexWrap: 'wrap' }}>
              <Ionicons name="swap-vertical-outline" size={16} color={colors.textSecondary} />
              {(['newest', 'oldest', 'amount_desc', 'amount_asc'] as const).map((item) => (
                <Pill key={item} label={t(`transactions.sorts.${item}`, { defaultValue: item })} active={sortBy === item} onPress={() => setSortBy(item)} />
              ))}
            </View>
            <View style={{ gap: spacing(2) }}>
              <DropdownField
                label={t('transactions.account')}
                valueLabel={accountFilter === 'all' ? t('all', { defaultValue: 'All' }) : (accounts.find((account: any) => account.id === accountFilter)?.name ?? t('transactions.account'))}
                placeholder={t('transactions.account')}
                hint={t('transactions.account')}
                selectedKey={accountFilter}
                onChange={setAccountFilter}
                options={[
                  { key: 'all', label: t('all', { defaultValue: 'All' }) },
                  ...accounts.map((account: any) => ({
                    key: account.id,
                    label: account.name,
                    subtitle: getAccountOptionSubtitle(account),
                    iconName: 'wallet-outline' as const,
                  })),
                ]}
              />
            </View>
            <View style={{ gap: spacing(2) }}>
              <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold as any } as any}>{t('transactions.dateLabel')}</Text>
              <View style={{ gap: spacing(2) }}>
                <DateFilterField
                  label={t('transactions.dateFrom', { defaultValue: 'From date' })}
                  value={dateFrom}
                  onChange={setDateFrom}
                  placeholder={t('transactions.dateFromPlaceholder', { defaultValue: 'YYYY-MM-DD' })}
                />
                <DateFilterField
                  label={t('transactions.dateTo', { defaultValue: 'To date' })}
                  value={dateTo}
                  onChange={setDateTo}
                  placeholder={t('transactions.dateToPlaceholder', { defaultValue: 'YYYY-MM-DD' })}
                />
                {(dateFrom || dateTo) ? (
                  <Button
                    label={t('clear', { defaultValue: 'Clear dates' })}
                    variant="secondary"
                    onPress={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                  />
                ) : null}
              </View>
            </View>
            <View style={{ gap: spacing(2) }}>
              <DropdownField
                label={t('transactions.createdBy')}
                valueLabel={selectedCreatorLabel}
                placeholder={t('transactions.createdBy')}
                hint={t('transactions.createdBy')}
                selectedKey={createdByFilter}
                onChange={setCreatedByFilter}
                options={[
                  { key: 'all', label: t('all', { defaultValue: 'All' }) },
                  { key: currentUserId, label: currentUserLabel, subtitle: t('settings.you') },
                  ...accountMemberOptions
                    .filter((item) => item.id !== currentUserId)
                    .map((item) => ({ key: item.id, label: item.label })),
                ]}
              />
            </View>
          </View>
          ) : null}
        </Section>
      </Card>

      <Modal visible={createModalOpen} transparent animationType="fade" onRequestClose={() => setCreateModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCreateModalOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('transactions.createTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('transactions.createSubtitle')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
              <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
              {(['income', 'expense'] as const).map((item) => (
                <Pill key={item} label={t(`transactions.types.${item}`)} active={type === item} onPress={() => setType(item)} />
              ))}
            </View>
            <Field label={t('transactions.titleLabel')} value={title} onChangeText={setTitle} placeholder={t('transactions.titlePlaceholder')} />
            <Field label={t('transactions.amountLabel')} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />
            <DatePickerField
              label={t('transactions.dateLabel')}
              value={date}
              onChange={setDate}
              placeholder={t('transactions.datePlaceholder', { defaultValue: 'YYYY-MM-DD' })}
            />
            <Field label={t('transactions.notesLabel')} value={notes} onChangeText={setNotes} placeholder={t('transactions.notesPlaceholder')} />
            <DropdownField
              label={t('transactions.createdBy')}
              valueLabel={selectedCreateCreatorLabel}
              placeholder={t('transactions.createdByPlaceholder')}
              hint={t('transactions.createdByPlaceholder')}
              selectedKey={effectiveCreatedById}
              onChange={setCreatedById}
              options={[
                { key: currentUserId, label: currentUserLabel, subtitle: t('settings.you') },
                ...accountMemberOptions
                  .filter((member) => member.id !== currentUserId)
                  .map((member) => ({ key: member.id, label: member.label })),
              ]}
            />
            <GroupedAccountSelect
              label={t('transactions.account')}
              accounts={accounts as any}
              members={(membersQuery.data ?? []).filter((member) => member.status === 'accepted') as any}
              value={effectiveAccountId}
              placeholder={t('transactions.selectAccount')}
              hint={t('transactions.selectAccountHint', { defaultValue: t('transactions.account') })}
              onChange={setAccountId}
              closeLabel={t('close', { defaultValue: 'Close' })}
              sharedLabel={t('dashboard.shared')}
              unassignedLabel={t('settings.unnamedUser')}
              typeLabels={{
                bank: t('accounts.types.bank'),
                cash: t('accounts.types.cash'),
                savings: t('accounts.types.savings'),
                credit_card: t('accounts.types.credit_card'),
                investment: t('accounts.types.investment'),
                ppr: t('accounts.types.ppr'),
              }}
            />
            <DropdownField
              label={t('transactions.categories')}
              valueLabel={categoryId ? (categories.find((item: any) => item.id === categoryId)?.name ?? t('transactions.uncategorized')) : t('none')}
              placeholder={t('transactions.categories')}
              hint={t('transactions.categories')}
              selectedKey={categoryId ?? ''}
              onChange={(value) => setCategoryId(value || null)}
              options={[{ key: '', label: t('none') }, ...categories.map((category: any) => ({ key: category.id, label: category.name, iconName: category.icon } as any))]}
            />
            <View style={{ gap: spacing(2) } as any}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                <Ionicons name="attach-outline" size={16} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold as any } as any}>
                  {t('transactions.attachInvoice')}
                </Text>
              </View>
              <Button
                label={attachment ? t('transactions.changeAttachment') : t('transactions.attachInvoice')}
                onPress={() => void handlePickAttachment()}
                variant="secondary"
              />
              {attachment ? (
                <View style={{ gap: spacing(1) }}>
                  <Text style={{ color: colors.text, fontWeight: typography.fontWeight.semibold as any } as any}>
                    {t('transactions.attachmentSelected')}
                  </Text>
                  <Text style={{ color: colors.textSecondary } as any}>
                    {attachment.fileName} · {(attachment.fileSize / 1024).toFixed(1)} KB
                  </Text>
                  <Button
                    label={t('transactions.removeAttachment')}
                    onPress={() => setAttachment(null)}
                    variant="secondary"
                  />
                </View>
              ) : null}
            </View>
            <View style={styles.modalActions}>
              <Button label={t('cancel')} variant="secondary" onPress={() => setCreateModalOpen(false)} />
              <Button
                label={createTransaction.isPending ? t('saving') : t('transactions.createAndNew')}
                variant="secondary"
                onPress={() => void handleCreate(true)}
                disabled={!canCreateTransaction}
              />
              <Button label={createTransaction.isPending ? t('saving') : t('transactions.create')} onPress={() => void handleCreate()} disabled={!canCreateTransaction} />
            </View>
          </View>
        </View>
      </Modal>

      <Section title={t('transactions.latestTitle')} subtitle={t('transactions.latestSubtitle', { count: transactions.length })}>
        {transactions.length ? (
          <>
            <Table
              columns={[
                { label: t('transactions.titleLabel'), flex: 2 },
                { label: t('transactions.account'), flex: 1.2 },
                { label: t('transactions.categories'), flex: 1.2 },
                { label: t('transactions.createdBy'), flex: 1.2 },
                { label: t('transactions.dateLabel'), flex: 1 },
                { label: t('transactions.amountLabel'), align: 'right' },
                { label: '', flex: 0.35, align: 'right' },
              ]}
            >
              {transactions.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell flex={2}>
                    <View style={{ gap: spacing(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
                        <Ionicons name={getTransactionTypeIcon(item.type)} size={18} color={item.type === 'expense' ? colors.destructive : colors.success} />
                        <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any } as any}>{item.title}</Text>
                      </View>
                      <Badge label={t(`transactions.types.${item.type}`)} tone={item.type === 'expense' ? 'destructive' : 'success'} />
                    </View>
                  </TableCell>
                  <TableCell flex={1.2}>
                    <Text style={{ color: colors.textSecondary } as any}>
                      {getTransactionAccountLabel(item)}
                    </Text>
                  </TableCell>
                  <TableCell flex={1.2}>
                    <Text style={{ color: colors.textSecondary } as any}>{item.category?.name ?? t('transactions.uncategorized')}</Text>
                  </TableCell>
                  <TableCell flex={1.2}>
                    <Text style={{ color: colors.textSecondary } as any}>
                      {
                        item.created_by_profile?.id === profile?.id
                          ? currentUserLabel
                          : memberLabelMap.get(item.created_by_profile?.id ?? item.created_by) ?? t('settings.unnamedUser')
                      }
                    </Text>
                  </TableCell>
                  <TableCell flex={1}>
                    <Text style={{ color: colors.textSecondary } as any}>{formatDate(item.transaction_date)}</Text>
                  </TableCell>
                  <TableCell align="right">
                    <Text style={{ color: item.type === 'expense' ? colors.destructive : colors.success, fontWeight: typography.fontWeight.extraBold as any } as any}>
                      {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                    </Text>
                  </TableCell>
                  <TableCell flex={0.35} align="right" mobilePinned>
                    <Pressable
                      onPress={() => setMenuTransaction(item)}
                      style={({ pressed }) => [styles.menuButton, pressed && styles.pressed] as any}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
                    </Pressable>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
            {transactionsQuery.isFetchingNextPage ? (
              <Text style={{ color: colors.textSecondary, marginTop: spacing(2) } as any}>{t('loading', { defaultValue: 'Loading more...' })}</Text>
            ) : transactionsQuery.hasNextPage ? (
              <Button
                label={t('loadMore', { defaultValue: 'Load more' })}
                variant="secondary"
                onPress={() => void transactionsQuery.fetchNextPage()}
              />
            ) : null}
          </>
        ) : (
          <EmptyState title={t('transactions.emptyTitle', { defaultValue: t('transactions.latestTitle') })} description={t('transactions.latestSubtitle', { count: 0 })} icon="receipt-outline" />
        )}
      </Section>

      <View style={styles.floatingCreateSpacer} />

      <DropdownMenu
        visible={menuTransaction !== null}
        title={menuTransaction?.title ?? t('transactions.title')}
        closeLabel={t('cancel')}
        onClose={() => setMenuTransaction(null)}
        items={[
          {
            key: 'edit',
            label: t('transactions.editTitle'),
            iconName: 'create-outline',
            onPress: () => {
              if (menuTransaction) {
                openEditTransaction(menuTransaction);
              }
            },
          },
          {
            key: 'delete',
            label: t('delete'),
            iconName: 'trash-outline',
            danger: true,
            onPress: () => {
              if (menuTransaction) {
                void deleteTransaction.mutateAsync(menuTransaction.id);
              }
              setMenuTransaction(null);
            },
          },
        ]}
      />

      <Modal visible={editTransaction !== null} transparent animationType="fade" onRequestClose={() => setEditTransaction(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditTransaction(null)} />
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) } as any}>
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              <Text style={styles.modalTitle}>{t('transactions.editTitle')}</Text>
            </View>
            <Text style={styles.modalSubtitle}>{t('settings.editDetails')}</Text>
            {editTransaction ? (
              <>
                <View style={{ flexDirection: 'row', gap: spacing(2) } as any}>
                  {(['income', 'expense'] as const).map((item) => (
                    <Pill
                      key={item}
                      label={t(`transactions.types.${item}`)}
                      active={editTransaction.type === item}
                      onPress={() => setEditTransaction((current) => (current ? { ...current, type: item, categoryId: null } : current))}
                    />
                  ))}
                </View>
                <Field
                  label={t('transactions.titleLabel')}
                  value={editTransaction.title}
                  onChangeText={(value) => setEditTransaction((current) => (current ? { ...current, title: value } : current))}
                />
                <Field
                  label={t('transactions.amountLabel')}
                  value={editTransaction.amount}
                  onChangeText={(value) => setEditTransaction((current) => (current ? { ...current, amount: value } : current))}
                  keyboardType="numeric"
                />
                <Field
                  label={t('transactions.dateLabel')}
                  value={editTransaction.date}
                  onChangeText={(value) => setEditTransaction((current) => (current ? { ...current, date: value } : current))}
                />
                <Field
                  label={t('transactions.notesLabel')}
                  value={editTransaction.notes}
                  onChangeText={(value) => setEditTransaction((current) => (current ? { ...current, notes: value } : current))}
                  placeholder={t('transactions.notesPlaceholder')}
                />
                <HouseholdMemberSelect
                  label={t('transactions.createdBy')}
                  members={(membersQuery.data ?? []).filter((member) => member.status === 'accepted')}
                  value={editTransaction.createdById || profile?.id || ''}
                  placeholder={t('transactions.createdByPlaceholder')}
                  hint={t('transactions.createdByPlaceholder')}
                  onChange={(value) => setEditTransaction((current) => (current ? { ...current, createdById: value } : current))}
                />
                <GroupedAccountSelect
                  label={t('transactions.account')}
                  accounts={accounts as any}
                  members={(membersQuery.data ?? []).filter((member) => member.status === 'accepted') as any}
                  value={editTransaction.accountId}
                  placeholder={t('transactions.selectAccount')}
                  hint={t('transactions.selectAccountHint', { defaultValue: t('transactions.account') })}
                  onChange={(value) => setEditTransaction((current) => (current ? { ...current, accountId: value } : current))}
                  closeLabel={t('close', { defaultValue: 'Close' })}
                  sharedLabel={t('dashboard.shared')}
                  unassignedLabel={t('settings.unnamedUser')}
                  typeLabels={{
                    bank: t('accounts.types.bank'),
                    cash: t('accounts.types.cash'),
                    savings: t('accounts.types.savings'),
                    credit_card: t('accounts.types.credit_card'),
                    investment: t('accounts.types.investment'),
                    ppr: t('accounts.types.ppr'),
                  }}
                />
                <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold as any } as any}>{t('transactions.categories')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                  <Pill
                    label={t('none')}
                    active={!editTransaction.categoryId}
                    onPress={() => setEditTransaction((current) => (current ? { ...current, categoryId: null } : current))}
                  />
                  {categories.map((category: any) => (
                    <Pill
                      key={category.id}
                      label={category.name}
                      active={editTransaction.categoryId === category.id}
                      onPress={() => setEditTransaction((current) => (current ? { ...current, categoryId: category.id } : current))}
                    />
                  ))}
                </View>
                <View style={styles.modalActions}>
                  <Button label={t('cancel')} variant="secondary" onPress={() => setEditTransaction(null)} />
                  <Button label={updateTransaction.isPending ? t('saving') : t('transactions.saveChanges', { defaultValue: t('settings.saveChanges') })} onPress={() => void handleSaveTransaction()} disabled={updateTransaction.isPending} />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </Page>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing(3),
  },
  menuButton: {
    width: spacing(10.5),
    height: spacing(10.5),
    borderRadius: radius.mdPlus,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    color: colors.text,
    fontSize: typography.fontSize[22],
    fontWeight: String(typography.fontWeight.extraBold),
    lineHeight: typography.lineHeight[22],
  },
  floatingCreateButton: {
    position: 'absolute',
    right: spacing(6),
    bottom: spacing(6),
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  floatingCreateButtonText: {
    color: colors.primaryForeground,
    fontSize: typography.fontSize[14],
    fontWeight: String(typography.fontWeight.extraBold),
  },
  floatingCreateSpacer: {
    height: spacing(16),
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  filterToggleLabel: {
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.semibold as any,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing(5),
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
  },
  modalCard: {
    width: '100%',
    maxWidth: spacing(160),
    alignSelf: 'center',
    gap: spacing(3.5),
    padding: spacing(4.5),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  menuCard: {
    width: '100%',
    maxWidth: spacing(96),
    alignSelf: 'center',
    gap: spacing(3),
    padding: spacing(4.5),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.fontSize[20],
    fontWeight: String(typography.fontWeight.extraBold),
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2.5),
    justifyContent: 'flex-end',
  },
  menuItem: {
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  menuItemDanger: {
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.destructiveBorder,
    backgroundColor: colors.destructiveSoft,
  },
  menuItemText: {
    color: colors.text,
    fontSize: typography.fontSize[14],
    fontWeight: String(typography.fontWeight.bold),
  },
  menuItemTextDanger: {
    color: colors.destructive,
    fontSize: typography.fontSize[14],
    fontWeight: String(typography.fontWeight.bold),
  },
  pressed: {
    opacity: 0.85,
  },
  } as any);
}
