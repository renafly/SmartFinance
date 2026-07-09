import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, Field, Button, Pill, formatCurrency, formatDate } from '@/components/migrated-page';
import { Badge, EmptyState, Table, TableCell, TableRow } from '@/components/data-surface';
import { HouseholdMemberSelect } from '@/components/household-member-select';
import { DropdownMenu } from '@/components/selection-shell';
import { useAuth } from '../../providers/AuthProvider';
import { useAccounts } from '../../features/accounts/hooks';
import { useTopLevelCategories } from '../../features/categories/hooks';
import { useHouseholdMemberDetails } from '../../features/households/hooks';
import { useTransactions } from '../../features/transactions/hooks/useTransactions';
import { useCreateTransaction } from '../../features/transactions/hooks/useCreateTransaction';
import { useDeleteTransaction } from '../../features/transactions/hooks/useDeleteTransaction';
import { useUpdateTransaction } from '../../features/transactions/hooks/useUpdateTransaction';

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

type AttachmentDraft = {
  file: Blob | ArrayBuffer | File;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation('common');
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccounts();
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
  const [menuTransaction, setMenuTransaction] = useState<any | null>(null);
  const [editTransaction, setEditTransaction] = useState<TransactionEditDraft | null>(null);

  const transactionsQuery = useTransactions(filtersType === 'all' ? {} : { type: filtersType });
  const activeCategoryType = editTransaction?.type ?? type;
  const categoriesQuery = useTopLevelCategories(activeCategoryType);

  const accounts = accountsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const memberLabelMap = new Map(
    (membersQuery.data ?? [])
      .filter((member) => member.status === 'accepted')
      .map((member) => [
        member.userId,
        member.fullName?.trim() || member.email || member.userId,
      ]),
  );
  const currentUserLabel = profile?.full_name?.trim() || profile?.email?.trim() || t('settings.you');
  const firstAccount = accounts[0]?.id ?? '';
  const parsedAmount = Number(amount);
  const effectiveAccountId = accountId || firstAccount;
  const canCreateTransaction =
    !createTransaction.isPending &&
    Boolean(householdId) &&
    Boolean(profile?.id) &&
    Boolean(effectiveAccountId) &&
    title.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date);

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

    setAttachment({
      file,
      fileName: asset.name ?? `invoice-${Date.now()}`,
      fileSize: asset.size ?? ('size' in file ? file.size : 0),
      mimeType: asset.mimeType ?? 'application/octet-stream',
    });
  }

  async function handleCreate() {
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
    <Page title={t('transactions.title')} subtitle={t('transactions.subtitle')}>
      <Card>
        <Section title={t('transactions.filtersTitle')} subtitle={t('transactions.filtersSubtitle')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), flexWrap: 'wrap' }}>
            <Ionicons name="funnel-outline" size={16} color={colors.textSecondary} />
            {(['all', 'income', 'expense'] as const).map((item) => (
              <Pill key={item} label={t(`transactions.filters.${item}`)} active={filtersType === item} onPress={() => setFiltersType(item)} />
            ))}
          </View>
        </Section>
      </Card>

      <Card>
        <Section title={t('transactions.createTitle')} subtitle={t('transactions.createSubtitle')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
            <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
            {(['income', 'expense'] as const).map((item) => (
              <Pill key={item} label={t(`transactions.types.${item}`)} active={type === item} onPress={() => setType(item)} />
            ))}
          </View>
          <Field label={t('transactions.titleLabel')} value={title} onChangeText={setTitle} placeholder={t('transactions.titlePlaceholder')} />
          <Field label={t('transactions.amountLabel')} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />
          <Field label={t('transactions.dateLabel')} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Field label={t('transactions.notesLabel')} value={notes} onChangeText={setNotes} placeholder={t('transactions.notesPlaceholder')} />
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
          <HouseholdMemberSelect
            label={t('transactions.createdBy')}
            members={(membersQuery.data ?? []).filter((member) => member.status === 'accepted')}
            value={createdById || profile?.id || ''}
            placeholder={t('transactions.createdByPlaceholder')}
            hint={t('transactions.createdByPlaceholder')}
            onChange={setCreatedById}
          />
          <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold as any } as any}>{t('transactions.accounts')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
            {accounts.map((account: any) => (
              <Pill key={account.id} label={account.name} active={accountId === account.id} onPress={() => setAccountId(account.id)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) } as any}>
            <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold as any } as any}>{t('transactions.categories')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
            <Pill label={t('none')} active={!categoryId} onPress={() => setCategoryId(null)} />
            {categories.map((category: any) => (
              <Pill key={category.id} label={category.name} active={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
            ))}
          </View>
          <Button label={createTransaction.isPending ? t('saving') : t('transactions.create')} onPress={() => void handleCreate()} disabled={!canCreateTransaction} />
        </Section>
      </Card>

      <Section title={t('transactions.latestTitle')} subtitle={t('transactions.latestSubtitle', { count: transactions.length })}>
        {transactions.length ? (
          <Table
            columns={[
              { label: t('transactions.titleLabel'), flex: 2 },
              { label: t('transactions.account'), flex: 1.2 },
              { label: t('transactions.categories'), flex: 1.2 },
              { label: t('transactions.createdBy'), flex: 1.2 },
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
                  <Text style={{ color: colors.textSecondary } as any}>{item.account?.name ?? t('transactions.account')}</Text>
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
        ) : (
          <EmptyState title={t('transactions.emptyTitle', { defaultValue: t('transactions.latestTitle') })} description={t('transactions.latestSubtitle', { count: 0 })} icon="receipt-outline" />
        )}
      </Section>

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
                <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold as any } as any}>{t('transactions.accounts')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) } as any}>
                  {accounts.map((account: any) => (
                    <Pill
                      key={account.id}
                      label={account.name}
                      active={editTransaction.accountId === account.id}
                      onPress={() => setEditTransaction((current) => (current ? { ...current, accountId: account.id } : current))}
                    />
                  ))}
                </View>
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
