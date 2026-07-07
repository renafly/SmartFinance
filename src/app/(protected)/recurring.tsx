import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, Field, Button, Pill, formatCurrency, formatDate } from '@/components/migrated-page';
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
  accountId: string;
  categoryId: string | null;
  createdById: string;
};

const frequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;

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
      next_run: nextRun,
      created_by: createdById || profile.id,
    } as any);

    setTitle('');
    setAmount('');
  }

  function openEditRecurring(item: any) {
    setEditRecurring({
      id: item.id,
      title: item.title ?? '',
      amount: String(item.amount ?? ''),
      nextRun: item.next_run?.slice?.(0, 10) ?? new Date().toISOString().slice(0, 10),
      type: item.type ?? 'expense',
      frequency: item.frequency ?? 'monthly',
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
      account_id: editRecurring.accountId,
      category_id: editRecurring.categoryId,
      created_by: editRecurring.createdById || profile?.id || editRecurring.createdById,
    } as any);

    setEditRecurring(null);
  }

  return (
    <Page title={t('recurring.title')} subtitle={t('recurring.subtitle')}>
      <Card>
        <Section title={t('recurring.createTitle')}>
          <Field label={t('recurring.titleLabel')} value={title} onChangeText={setTitle} />
          <Field label={t('recurring.amount')} value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <Field label={t('recurring.nextRun')} value={nextRun} onChangeText={setNextRun} />
          <HouseholdMemberSelect
            label={t('recurring.createdBy')}
            members={(membersQuery.data ?? []).filter((member) => member.status === 'accepted')}
            value={createdById || profile?.id || ''}
            placeholder={t('recurring.createdByPlaceholder')}
            hint={t('recurring.createdByPlaceholder')}
            onChange={setCreatedById}
          />
          <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold }}>{t('recurring.type')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing(2) }}>
            {(['income', 'expense'] as const).map((item) => (
              <Pill key={item} label={t(`recurring.types.${item}`)} active={type === item} onPress={() => setType(item)} />
            ))}
          </View>
          <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold }}>{t('recurring.frequency')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
            {frequencies.map((item) => (
              <Pill key={item} label={t(`recurring.frequencies.${item}`)} active={frequency === item} onPress={() => setFrequency(item)} />
            ))}
          </View>
          <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold }}>{t('recurring.account')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
            {(accountsQuery.data ?? []).map((account: any) => (
              <Pill key={account.id} label={account.name} active={accountId === account.id} onPress={() => setAccountId(account.id)} />
            ))}
          </View>
          <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold }}>{t('recurring.category')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
            <Pill label={t('none')} active={!categoryId} onPress={() => setCategoryId(null)} />
            {(categoriesQuery.data ?? []).map((category: any) => (
              <Pill key={category.id} label={category.name} active={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
            ))}
          </View>
          <Button label={createRecurring.isPending ? t('creating') : t('recurring.create')} onPress={() => void handleCreate()} disabled={!canCreateRecurring} />
        </Section>
      </Card>

      <Section title={t('recurring.rulesTitle')} subtitle={t('recurring.rulesSubtitle', { count: (recurringQuery.data ?? []).length })}>
        <View style={{ gap: spacing(2.5) }}>
          {(recurringQuery.data ?? []).map((item: any) => (
            <Card key={item.id}>
              <View style={styles.ruleHeader}>
                <View style={{ flex: 1, gap: spacing(1) }}>
                  <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>{item.title}</Text>
                  <Text style={{ color: colors.textSecondary }}>{t(`recurring.frequencies.${item.frequency}`)} · {t('recurring.nextRunLabel', { value: formatDate(item.next_run) })}</Text>
                </View>
                <Pressable
                  onPress={() => setMenuRecurring(item)}
                  style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
                >
                  <Text style={styles.menuButtonText}>⋮</Text>
                </Pressable>
              </View>
              <Text style={{ color: colors.textSecondary }}>
                {t('recurring.createdBy')}: {
                  item.created_by === profile?.id
                    ? currentUserLabel
                    : memberLabelMap.get(item.created_by) ?? t('settings.unnamedUser')
                }
              </Text>
              <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.extraBold }}>{formatCurrency(item.amount)}</Text>
              <Text style={{ color: item.is_active ? colors.success : colors.destructive, fontWeight: typography.fontWeight.semibold }}>{item.is_active ? t('active') : t('inactive')}</Text>
            </Card>
          ))}
        </View>
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
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
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
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
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
              style={({ pressed }) => [styles.menuItemDanger, pressed && styles.pressed]}
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
                <Field
                  label={t('recurring.nextRun')}
                  value={editRecurring.nextRun}
                  onChangeText={(value) => setEditRecurring((current) => (current ? { ...current, nextRun: value } : current))}
                />
                <HouseholdMemberSelect
                  label={t('recurring.createdBy')}
                  members={(membersQuery.data ?? []).filter((member) => member.status === 'accepted')}
                  value={editRecurring.createdById || profile?.id || ''}
                  placeholder={t('recurring.createdByPlaceholder')}
                  hint={t('recurring.createdByPlaceholder')}
                  onChange={(value) => setEditRecurring((current) => (current ? { ...current, createdById: value } : current))}
                />
                <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold }}>{t('recurring.frequency')}</Text>
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
                <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold }}>{t('recurring.account')}</Text>
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
                <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold }}>{t('recurring.category')}</Text>
                <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
                  <Pill
                    label={t('none')}
                    active={!editRecurring.categoryId}
                    onPress={() => setEditRecurring((current) => (current ? { ...current, categoryId: null } : current))}
                  />
                  {(categoriesQuery.data ?? []).map((category: any) => (
                    <Pill
                      key={category.id}
                      label={category.name}
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
    fontWeight: typography.fontWeight.extraBold,
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
    fontWeight: typography.fontWeight.extraBold,
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
    fontWeight: typography.fontWeight.bold,
  },
  menuItemTextDanger: {
    color: colors.destructive,
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold,
  },
  pressed: {
    opacity: 0.85,
  },
  } as const);
}
