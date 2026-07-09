import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, Field, Button, Pill, formatCurrency, formatDate } from '@/components/migrated-page';
import { Badge, EmptyState, Table, TableCell, TableRow } from '@/components/data-surface';
import { HouseholdMemberSelect } from '@/components/household-member-select';
import { useAuth } from '../../providers/AuthProvider';
import { useAccounts } from '../../features/accounts/hooks';
import { useTopLevelCategories } from '../../features/categories/hooks';
import { useHouseholdMemberDetails } from '../../features/households/hooks';
import { useCreateRecurringTransaction, useDeleteRecurringTransaction, useRecurringTransactions, useToggleRecurringTransaction, useUpdateRecurringTransaction } from '../../features/recurring-transactions/hooks';

type RecurringEditDraft = {
  id: string;
  title: string;
  amount: string;
  nextRun: string;
  type: 'income' | 'expense';
  frequency: (typeof frequencies)[number];
  excludedMonths: number[];
  accountId: string;
  categoryId: string | null;
  createdById: string;
};

const frequencies = ['daily', 'weekly', 'monthly', 'yearly', 'custom'] as const;
const months = [
  { value: 1, key: 'jan' },
  { value: 2, key: 'feb' },
  { value: 3, key: 'mar' },
  { value: 4, key: 'apr' },
  { value: 5, key: 'may' },
  { value: 6, key: 'jun' },
  { value: 7, key: 'jul' },
  { value: 8, key: 'aug' },
  { value: 9, key: 'sep' },
  { value: 10, key: 'oct' },
  { value: 11, key: 'nov' },
  { value: 12, key: 'dec' },
] as const;

function normalizeMonthList(values: Array<number | string> | null | undefined) {
  return [...new Set((values ?? [])
    .map((month) => Number(month))
    .filter((month) => Number.isFinite(month) && month >= 1 && month <= 12))]
    .sort((a, b) => a - b);
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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

function CategoryChoice({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: string | null;
  active?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(1.5),
          paddingHorizontal: spacing(3),
          paddingVertical: spacing(2),
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primary : colors.surfaceMuted,
        },
        pressed && { opacity: 0.85 },
      ] as any}
    >
      <Ionicons
        name={(icon ?? 'pricetag-outline') as any}
        size={14}
        color={active ? colors.primaryForeground : colors.textSecondary}
      />
      <Text
        style={{
          color: active ? colors.primaryForeground : colors.textSecondary,
          fontSize: typography.fontSize[12],
          fontWeight: String(typography.fontWeight.semibold),
        } as any}
      >
        {label}
      </Text>
    </Pressable>
  );
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

  useEffect(() => {
    if (!open) {
      setDraftDate(parseDateInputValue(value) ?? new Date());
    }
  }, [open, value]);

  if (Platform.OS === 'web') {
    return <Field label={label} value={value} onChangeText={onChange} placeholder={placeholder} />;
  }

  const displayValue = value.trim().length > 0 ? formatDateInputValue(parseDateInputValue(value) ?? new Date()) : placeholder;

  return (
    <View style={{ gap: spacing(2) }}>
      <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{label}</Text>
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
        <Text style={{ color: value.trim().length > 0 ? colors.text : colors.textSecondary, fontWeight: String(typography.fontWeight.bold) } as any}>
          {displayValue}
        </Text>
        <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.bold) } as any}>{open ? '▴' : '▾'}</Text>
      </Pressable>

      {open ? (
        <View
          style={{
            gap: spacing(2),
            padding: spacing(3),
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
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

          {Platform.OS !== 'android' ? (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing(2) }}>
              <Button label={t('cancel')} variant="secondary" onPress={() => setOpen(false)} />
              <Button
                label={t('done')}
                onPress={() => {
                  onChange(formatDateInputValue(draftDate));
                  setOpen(false);
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function RecurringScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation('common');
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccounts();
  const membersQuery = useHouseholdMemberDetails();
  const recurringQuery = useRecurringTransactions();
  const categoriesQuery = useTopLevelCategories('expense');
  const createRecurring = useCreateRecurringTransaction();
  const toggleRecurring = useToggleRecurringTransaction();
  const deleteRecurring = useDeleteRecurringTransaction();
  const updateRecurring = useUpdateRecurringTransaction();

  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [createdById, setCreatedById] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [frequency, setFrequency] = useState<(typeof frequencies)[number]>('monthly');
  const [excludedMonths, setExcludedMonths] = useState<number[]>([]);
  const [nextRun, setNextRun] = useState(new Date().toISOString().slice(0, 10));
  const [menuRecurring, setMenuRecurring] = useState<any | null>(null);
  const [editRecurring, setEditRecurring] = useState<RecurringEditDraft | null>(null);
  const memberLabelMap = new Map(
    (membersQuery.data ?? [])
      .filter((member) => member.status === 'accepted')
      .map((member) => [
        member.userId,
        member.fullName?.trim() || member.email || member.userId,
      ]),
  );
  const currentUserLabel = profile?.full_name?.trim() || profile?.email?.trim() || t('settings.you');
  const parsedAmount = Number(amount);
  const canCreateRecurring =
    !createRecurring.isPending &&
    Boolean(householdId) &&
    Boolean(profile?.id) &&
    Boolean(accountId) &&
    title.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(nextRun);

  async function handleCreate() {
    if (!householdId || !profile?.id || !accountId || !title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    await createRecurring.mutateAsync({
      household_id: householdId,
      account_id: accountId,
      category_id: categoryId,
      title: title.trim(),
      amount: parsedAmount,
      type,
      frequency,
      excluded_months: frequency === 'custom' ? normalizeMonthList(excludedMonths) : [],
      next_run: nextRun,
      created_by: createdById || profile.id,
    } as any);

    setTitle('');
    setAmount('');
    setExcludedMonths([]);
  }

  function openEditRecurring(item: any) {
    setEditRecurring({
      id: item.id,
      title: item.title ?? '',
      amount: String(item.amount ?? ''),
      nextRun: item.next_run?.slice?.(0, 10) ?? new Date().toISOString().slice(0, 10),
      type: item.type ?? 'expense',
      frequency: item.frequency ?? 'monthly',
      excludedMonths: normalizeMonthList(item.excluded_months as Array<number | string> | null | undefined),
      accountId: item.account_id ?? '',
      categoryId: item.category_id ?? null,
      createdById: item.created_by ?? profile?.id ?? '',
    });
    setMenuRecurring(null);
  }

  async function handleSaveRecurring() {
    if (!editRecurring || !householdId) return;

    const nextAmount = Number(editRecurring.amount);
    if (
      !editRecurring.title.trim() ||
      !editRecurring.accountId ||
      !Number.isFinite(nextAmount) ||
      nextAmount <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(editRecurring.nextRun)
    ) {
      return;
    }

    await updateRecurring.mutateAsync({
      id: editRecurring.id,
      title: editRecurring.title.trim(),
      amount: nextAmount,
      next_run: editRecurring.nextRun,
      type: editRecurring.type,
      frequency: editRecurring.frequency,
      excluded_months: editRecurring.frequency === 'custom' ? normalizeMonthList(editRecurring.excludedMonths) : [],
      account_id: editRecurring.accountId,
      category_id: editRecurring.categoryId,
      created_by: editRecurring.createdById || profile?.id || editRecurring.createdById,
    } as any);

    setEditRecurring(null);
  }

  function toggleExcludedMonth(month: number) {
    setExcludedMonths((current) =>
      current.includes(month)
        ? current.filter((value) => value !== month)
        : [...current, month].sort((a, b) => a - b),
    );
  }

  function toggleEditExcludedMonth(month: number) {
    setEditRecurring((current) =>
      current
        ? {
            ...current,
            excludedMonths: current.excludedMonths.includes(month)
              ? current.excludedMonths.filter((value) => value !== month)
              : [...current.excludedMonths, month].sort((a, b) => a - b),
          }
        : current,
    );
  }

  function formatExcludedMonths(monthsList: number[]) {
    if (!monthsList.length) return t('recurring.customFrequencyAnyMonth');
    return monthsList
      .slice()
      .sort((a, b) => a - b)
      .map((month) => {
        const monthItem = months.find((item) => item.value === month);
        return monthItem ? t(`recurring.months.${monthItem.key}`) : String(month);
      })
      .join(', ');
  }

  return (
    <Page title={t('recurring.title')} subtitle={t('recurring.subtitle')}>
      <Card>
        <Section title={t('recurring.createTitle')}>
          <Field label={t('recurring.titleLabel')} value={title} onChangeText={setTitle} />
          <Field label={t('recurring.amount')} value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <DatePickerField
            label={t('recurring.nextRun')}
            value={nextRun}
            onChange={setNextRun}
            placeholder={t('recurring.nextRunPlaceholder')}
          />
          <HouseholdMemberSelect
            label={t('recurring.createdBy')}
            members={(membersQuery.data ?? []).filter((member) => member.status === 'accepted')}
            value={createdById || profile?.id || ''}
            placeholder={t('recurring.createdByPlaceholder')}
            hint={t('recurring.createdByPlaceholder')}
            onChange={setCreatedById}
          />
          <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('recurring.type')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing(2) }}>
            {(['income', 'expense'] as const).map((item) => (
              <Pill key={item} label={t(`recurring.types.${item}`)} active={type === item} onPress={() => setType(item)} />
            ))}
          </View>
          <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('recurring.frequency')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
            {frequencies.map((item) => (
              <Pill key={item} label={t(`recurring.frequencies.${item}`)} active={frequency === item} onPress={() => setFrequency(item)} />
            ))}
          </View>
          {frequency === 'custom' ? (
            <View style={{ gap: spacing(2) }}>
              <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('recurring.excludeMonths')}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{t('recurring.excludeMonthsHint')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                {months.map((month) => (
                  <Pill
                    key={month.value}
                    label={t(`recurring.months.${month.key}`)}
                    active={excludedMonths.includes(month.value)}
                    onPress={() => toggleExcludedMonth(month.value)}
                  />
                ))}
              </View>
            </View>
          ) : null}
          <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('recurring.account')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
            {(accountsQuery.data ?? []).map((account: any) => (
              <Pill key={account.id} label={account.name} active={accountId === account.id} onPress={() => setAccountId(account.id)} />
            ))}
          </View>
          <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('recurring.category')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
            <CategoryChoice label={t('none')} icon="close-circle-outline" active={!categoryId} onPress={() => setCategoryId(null)} />
            {(categoriesQuery.data ?? []).map((category: any) => (
              <CategoryChoice
                key={category.id}
                label={category.name}
                icon={category.icon}
                active={categoryId === category.id}
                onPress={() => setCategoryId(category.id)}
              />
            ))}
          </View>
          <Button label={createRecurring.isPending ? t('creating') : t('recurring.create')} onPress={() => void handleCreate()} disabled={!canCreateRecurring} />
        </Section>
      </Card>

      <Section title={t('recurring.rulesTitle')} subtitle={t('recurring.rulesSubtitle', { count: (recurringQuery.data ?? []).length })}>
        {(recurringQuery.data ?? []).length ? (
          <Table
            columns={[
              { label: t('recurring.titleLabel'), flex: 2 },
              { label: t('recurring.frequency'), flex: 1 },
              { label: t('recurring.account'), flex: 1 },
              { label: t('recurring.createdBy'), flex: 1.2 },
              { label: t('recurring.amount'), align: 'right' },
              { label: '', flex: 0.35, align: 'right' },
            ]}
          >
            {(recurringQuery.data ?? []).map((item: any) => (
              <TableRow key={item.id}>
                <TableCell flex={2}>
                  <View style={{ gap: spacing(1) }}>
                    <Text style={{ color: colors.text, fontWeight: String(typography.fontWeight.bold) } as any}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), flexWrap: 'wrap' }}>
                      <Badge label={item.is_active ? t('active') : t('inactive')} tone={item.is_active ? 'success' : 'destructive'} />
                      {item.category ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: spacing(1),
                            paddingHorizontal: spacing(2),
                            paddingVertical: spacing(0.75),
                            borderRadius: radius.full,
                            backgroundColor: colors.surfaceMuted,
                            borderWidth: 1,
                            borderColor: colors.border,
                          } as any}
                        >
                          <Ionicons name={(item.category.icon ?? 'pricetag-outline') as any} size={13} color={colors.primary} />
                          <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.semibold) } as any}>
                            {item.category.name}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </TableCell>
                <TableCell flex={1}>
                  <View style={{ gap: spacing(1) }}>
                    <Text style={{ color: colors.textSecondary } as any}>{t(`recurring.frequencies.${item.frequency}`)}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
                      {t('recurring.nextRunLabel', { value: formatDate(item.next_run) })}
                    </Text>
                    {item.frequency === 'custom' ? (
                      <Badge label={formatExcludedMonths((item as any).excluded_months ?? [])} tone="neutral" />
                    ) : null}
                  </View>
                </TableCell>
                <TableCell flex={1}>
                    <Text style={{ color: colors.textSecondary } as any}>{item.account?.name ?? t('recurring.account')}</Text>
                </TableCell>
                <TableCell flex={1.2}>
                  <Text style={{ color: colors.textSecondary } as any}>
                    {item.created_by === profile?.id ? currentUserLabel : memberLabelMap.get(item.created_by) ?? t('settings.unnamedUser')}
                  </Text>
                </TableCell>
                <TableCell align="right">
                  <Text style={{ color: colors.primary, fontWeight: String(typography.fontWeight.extraBold) } as any}>{formatCurrency(item.amount)}</Text>
                </TableCell>
                <TableCell flex={0.35} align="right" mobilePinned>
                  <Pressable
                    onPress={() => setMenuRecurring(item)}
                    style={({ pressed }) => [styles.menuButton, pressed && styles.pressed] as any}
                  >
                    <Text style={styles.menuButtonText}>...</Text>
                  </Pressable>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        ) : (
          <EmptyState title={t('recurring.emptyTitle', { defaultValue: t('recurring.rulesTitle') })} icon="repeat-outline" />
        )}
      </Section>

      <Modal visible={menuRecurring !== null} transparent animationType="fade" onRequestClose={() => setMenuRecurring(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuRecurring(null)} />
          <View style={styles.menuCard}>
            <Text style={styles.modalTitle}>{menuRecurring?.title ?? t('recurring.title')}</Text>
            <Pressable
              onPress={() => {
                if (menuRecurring) openEditRecurring(menuRecurring);
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed] as any}
            >
              <Text style={styles.menuItemText}>{t('transactions.editTitle')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (menuRecurring) {
                  void toggleRecurring.mutateAsync({ id: menuRecurring.id, active: !menuRecurring.is_active });
                }
                setMenuRecurring(null);
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed] as any}
            >
              <Text style={styles.menuItemText}>{menuRecurring?.is_active ? t('deactivate') : t('activate')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (menuRecurring) {
                  void deleteRecurring.mutateAsync(menuRecurring.id);
                }
                setMenuRecurring(null);
              }}
              style={({ pressed }) => [styles.menuItemDanger, pressed && styles.pressed] as any}
            >
              <Text style={styles.menuItemTextDanger}>{t('delete')}</Text>
            </Pressable>
            <Button label={t('cancel')} variant="secondary" onPress={() => setMenuRecurring(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={editRecurring !== null} transparent animationType="fade" onRequestClose={() => setEditRecurring(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditRecurring(null)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('transactions.editTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('settings.editDetails')}</Text>
            {editRecurring ? (
              <>
                <View style={{ flexDirection: 'row', gap: spacing(2) }}>
                  {(['income', 'expense'] as const).map((item) => (
                    <Pill
                      key={item}
                      label={t(`recurring.types.${item}`)}
                      active={editRecurring.type === item}
                      onPress={() => setEditRecurring((current) => (current ? { ...current, type: item } : current))}
                    />
                  ))}
                </View>
                <Field
                  label={t('recurring.titleLabel')}
                  value={editRecurring.title}
                  onChangeText={(value) => setEditRecurring((current) => (current ? { ...current, title: value } : current))}
                />
                <Field
                  label={t('recurring.amount')}
                  value={editRecurring.amount}
                  onChangeText={(value) => setEditRecurring((current) => (current ? { ...current, amount: value } : current))}
                  keyboardType="numeric"
                />
                <DatePickerField
                  label={t('recurring.nextRun')}
                  value={editRecurring.nextRun}
                  onChange={(value) => setEditRecurring((current) => (current ? { ...current, nextRun: value } : current))}
                  placeholder={t('recurring.nextRunPlaceholder')}
                />
                <HouseholdMemberSelect
                  label={t('recurring.createdBy')}
                  members={(membersQuery.data ?? []).filter((member) => member.status === 'accepted')}
                  value={editRecurring.createdById || profile?.id || ''}
                  placeholder={t('recurring.createdByPlaceholder')}
                  hint={t('recurring.createdByPlaceholder')}
                  onChange={(value) => setEditRecurring((current) => (current ? { ...current, createdById: value } : current))}
                />
                <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('recurring.frequency')}</Text>
                <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
                  {frequencies.map((item) => (
                    <Pill
                      key={item}
                      label={t(`recurring.frequencies.${item}`)}
                      active={editRecurring.frequency === item}
                      onPress={() => setEditRecurring((current) => (current ? { ...current, frequency: item } : current))}
                    />
                  ))}
                </View>
                {editRecurring.frequency === 'custom' ? (
                  <View style={{ gap: spacing(2) }}>
                    <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('recurring.excludeMonths')}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>{t('recurring.excludeMonthsHint')}</Text>
                    <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
                      {months.map((month) => (
                        <Pill
                          key={month.value}
                          label={t(`recurring.months.${month.key}`)}
                          active={editRecurring.excludedMonths.includes(month.value)}
                          onPress={() => toggleEditExcludedMonth(month.value)}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
                <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('recurring.account')}</Text>
                <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
                  {(accountsQuery.data ?? []).map((account: any) => (
                    <Pill
                      key={account.id}
                      label={account.name}
                      active={editRecurring.accountId === account.id}
                      onPress={() => setEditRecurring((current) => (current ? { ...current, accountId: account.id } : current))}
                    />
                  ))}
                </View>
                <Text style={{ color: colors.textSecondary, fontWeight: String(typography.fontWeight.semibold) } as any}>{t('recurring.category')}</Text>
                <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
                  <CategoryChoice
                    label={t('none')}
                    icon="close-circle-outline"
                    active={!editRecurring.categoryId}
                    onPress={() => setEditRecurring((current) => (current ? { ...current, categoryId: null } : current))}
                  />
                  {(categoriesQuery.data ?? []).map((category: any) => (
                    <CategoryChoice
                      key={category.id}
                      label={category.name}
                      icon={category.icon}
                      active={editRecurring.categoryId === category.id}
                      onPress={() => setEditRecurring((current) => (current ? { ...current, categoryId: category.id } : current))}
                    />
                  ))}
                </View>
                <View style={styles.modalActions}>
                  <Button label={t('cancel')} variant="secondary" onPress={() => setEditRecurring(null)} />
                  <Button label={updateRecurring.isPending ? t('saving') : t('settings.saveChanges')} onPress={() => void handleSaveRecurring()} disabled={updateRecurring.isPending} />
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
  ruleHeader: {
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
    fontWeight: typography.fontWeight.extraBold as any,
    lineHeight: typography.lineHeight[22],
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing(5),
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
  },
  modalCard: {
    gap: spacing(3.5),
    padding: spacing(4.5),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  menuCard: {
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
    fontWeight: typography.fontWeight.extraBold as any,
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
    fontWeight: typography.fontWeight.bold as any,
  },
  menuItemTextDanger: {
    color: colors.destructive,
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold as any,
  },
  pressed: {
    opacity: 0.85,
  },
  } as const);
}
