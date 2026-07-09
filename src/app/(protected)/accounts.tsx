import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, Field, Button, Pill, formatCurrency } from '@/components/migrated-page';
import { Badge, EmptyState, MetricCard, Table, TableCell, TableRow } from '@/components/data-surface';
import { HouseholdMemberSelect } from '@/components/household-member-select';
import { useAuth } from '../../providers/AuthProvider';
import {
  useAccountsWithBalances,
  useCreateAccount,
  useArchiveAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '../../features/accounts/hooks';
import { useHouseholdMemberDetails, useMyHouseholds } from '../../features/households/hooks';
import { usePreferencesStore, type AppCurrency } from '@/stores/preferencesStore';
import { typography } from '@/theme/typography';

const accountTypes = ['bank', 'cash', 'savings', 'credit_card', 'investment', 'ppr'] as const;
const currencyOptions: AppCurrency[] = ['EUR', 'USD', 'GBP'];

type EditMode = {
  id: string;
  name: string;
};

export default function AccountsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]) as any;
  const { t } = useTranslation('common');
  const { householdId, profile } = useAuth();
  const preferredCurrency = usePreferencesStore((state) => state.currency) as AppCurrency;
  const accountsQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const householdsQuery = useMyHouseholds();
  const createAccount = useCreateAccount();
  const archiveAccount = useArchiveAccount();
  const deleteAccount = useDeleteAccount();
  const updateAccount = useUpdateAccount();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [menuAccount, setMenuAccount] = useState<EditMode | null>(null);
  const [editAccount, setEditAccount] = useState<{
    id: string;
    name: string;
    type: (typeof accountTypes)[number];
    currency: AppCurrency;
    initialBalance: string;
    ownerProfileId: string;
  } | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof accountTypes)[number]>('bank');
  const [currency, setCurrency] = useState<AppCurrency>(preferredCurrency);
  const [initialBalance, setInitialBalance] = useState('0');
  const [ownerProfileId, setOwnerProfileId] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'shared' | string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | (typeof accountTypes)[number]>('all');

  const accounts = (accountsQuery.data ?? []) as any[];
  const members = (membersQuery.data ?? []).filter((member) => member.status === 'accepted');
  const currentUserLabel = profile?.full_name?.trim() || profile?.email?.trim() || t('settings.you');
  const memberLabelMap = new Map(
    members.map((member) => [
      member.userId,
      member.fullName?.trim() || member.email || member.userId,
    ]),
  );
  const householdName =
    (householdsQuery.data ?? []).find((item: any) => item.id === householdId)?.name?.trim() ||
    t('settings.currentHouseholdLabel');
  const getOwnerLabel = (ownerProfileId?: string | null) =>
    ownerProfileId === profile?.id
      ? currentUserLabel
      : (memberLabelMap.get(ownerProfileId ?? '') ?? t('dashboard.shared', { defaultValue: householdName }));
  const getAccountTypeIcon = (accountType: (typeof accountTypes)[number]) => {
    switch (accountType) {
      case 'bank':
        return 'business-outline';
      case 'cash':
        return 'cash-outline';
      case 'savings':
        return 'file-tray-full-outline';
      case 'credit_card':
        return 'card-outline';
      case 'investment':
        return 'trending-up-outline';
      case 'ppr':
        return 'shield-checkmark-outline';
      default:
        return 'layers-outline';
    }
  };
  const getAccountTypeTone = (accountType: (typeof accountTypes)[number]) => {
    switch (accountType) {
      case 'savings':
        return 'success';
      case 'credit_card':
        return 'warning';
      case 'investment':
      case 'ppr':
        return 'primary';
      default:
        return 'neutral';
    }
  };
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account: any) => {
      const matchesOwner =
        ownerFilter === 'all'
          ? true
          : ownerFilter === 'shared'
            ? !account.owner_profile_id
            : account.owner_profile_id === ownerFilter;
      const matchesType = typeFilter === 'all' ? true : account.type === typeFilter;
      return matchesOwner && matchesType;
    });
  }, [accounts, ownerFilter, typeFilter]);
  const archivedCount = accounts.filter((item: any) => item.is_archived).length;
  const activeFilterCount = Number(ownerFilter !== 'all') + Number(typeFilter !== 'all');
  const parsedInitialBalance = Number(initialBalance);
  const canCreateAccount =
    !createAccount.isPending &&
    name.trim().length > 0 &&
    Number.isFinite(parsedInitialBalance);

  async function handleCreate() {
    if (!householdId || !profile?.id || !name.trim() || !Number.isFinite(parsedInitialBalance)) return;

    await createAccount.mutateAsync({
      household_id: householdId,
      owner_profile_id: ownerProfileId || profile.id,
      name: name.trim(),
      type,
      currency: currency,
      initial_balance: parsedInitialBalance,
    });

    setName('');
    setType('bank');
    setCurrency(preferredCurrency);
    setInitialBalance('0');
    setOwnerProfileId(profile?.id ?? '');
    setCreateDialogOpen(false);
  }

  function openCreateDialog() {
    setName('');
    setType('bank');
    setCurrency(preferredCurrency);
    setInitialBalance('0');
    setOwnerProfileId(profile?.id ?? '');
    setCreateDialogOpen(true);
  }

  function resetFilters() {
    setOwnerFilter('all');
    setTypeFilter('all');
  }

  function openEditAccount(account: any) {
    setEditAccount({
      id: account.id,
      name: account.name ?? '',
      type: account.type ?? 'bank',
      currency: (account.currency ?? preferredCurrency) as AppCurrency,
      initialBalance: String(account.initial_balance ?? 0),
      ownerProfileId: account.owner_profile_id ?? '',
    });
    setMenuAccount(null);
  }

  async function handleSaveAccount() {
    if (!editAccount) return;

    const nextInitialBalance = Number(editAccount.initialBalance);
    if (!editAccount.name.trim() || !Number.isFinite(nextInitialBalance) || nextInitialBalance < 0) return;

    await updateAccount.mutateAsync({
      id: editAccount.id,
      data: {
        name: editAccount.name.trim(),
        type: editAccount.type,
        currency: editAccount.currency,
        initial_balance: nextInitialBalance,
        owner_profile_id: editAccount.ownerProfileId || null,
      } as any,
    });

    setEditAccount(null);
  }

  return (
    <Page title={t('accounts.title')} subtitle={t('accounts.subtitle')} actions={<Button label={t('accounts.create')} onPress={openCreateDialog} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
        <MetricCard
          label={t('accounts.currentTitle')}
          value={String(filteredAccounts.length)}
          icon="wallet-outline"
          hint={t('accounts.currentSubtitle', { count: filteredAccounts.length, archived: archivedCount })}
        />
        <MetricCard label={t('accounts.allTypes')} value={String(accounts.length)} icon="layers-outline" hint={t('accounts.filtersByType')} />
      </View>

      <Section title={t('accounts.currentTitle')} subtitle={t('accounts.currentSubtitle', { count: filteredAccounts.length, archived: archivedCount })}>
        <View style={{ gap: spacing(3), marginBottom: spacing(3) }}>
          <View style={{ gap: spacing(2) }}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.sectionLabel}>{t('accounts.filtersByUser')}</Text>
            </View>
            <View style={styles.pillWrap}>
              <Pill label={t('accounts.allUsers')} active={ownerFilter === 'all'} onPress={() => setOwnerFilter('all')} />
              <Pill label={t('dashboard.shared')} active={ownerFilter === 'shared'} onPress={() => setOwnerFilter('shared')} />
              {members.map((member) => (
                <Pill
                  key={member.userId}
                  label={memberLabelMap.get(member.userId) ?? member.userId}
                  active={ownerFilter === member.userId}
                  onPress={() => setOwnerFilter(member.userId)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: spacing(2) }}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="funnel-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.sectionLabel}>{t('accounts.filtersByType')}</Text>
            </View>
            <View style={styles.pillWrap}>
              <Pill label={t('accounts.allTypes')} active={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
              {accountTypes.map((item) => (
                <Pill
                  key={item}
                  label={t(`accounts.types.${item}`)}
                  active={typeFilter === item}
                  onPress={() => setTypeFilter(item)}
                />
              ))}
            </View>
          </View>

          {activeFilterCount > 0 ? (
            <Button label={t('accounts.clearFilters')} variant="secondary" onPress={resetFilters} />
          ) : null}
        </View>

        {filteredAccounts.length ? (
          <Table
            columns={[
              { label: t('accounts.name'), flex: 2 },
              { label: t('accounts.owner'), flex: 1.4 },
              { label: t('accounts.typeLabel'), flex: 1 },
              { label: t('accounts.currency'), flex: 0.8, align: 'center' },
              { label: t('accounts.initialBalance'), align: 'right' },
              { label: t('dashboard.total'), align: 'right' },
              { label: '', flex: 0.35, align: 'right' },
            ]}
          >
            {filteredAccounts.map((account: any) => {
              const balance = account.current_balance ?? account.balance ?? 0;
              const isArchived = Boolean(account.is_archived);

              return (
                <TableRow key={account.id}>
                  <TableCell flex={2}>
                    <View style={{ gap: spacing(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                        <Ionicons name={getAccountTypeIcon(account.type)} size={18} color={colors.primary} />
                        <Text style={styles.accountName}>{account.name}</Text>
                      </View>
                      <Badge label={isArchived ? t('accounts.archived') : t('accounts.active')} tone={isArchived ? 'destructive' : 'success'} />
                    </View>
                  </TableCell>
                  <TableCell flex={1.4}>
                    <Text style={styles.accountMeta}>{getOwnerLabel(account.owner_profile_id)}</Text>
                  </TableCell>
                  <TableCell flex={1}>
                    <Badge label={t(`accounts.types.${account.type}`, { defaultValue: account.type })} tone={getAccountTypeTone(account.type)} />
                  </TableCell>
                  <TableCell flex={0.8} align="center">
                    <Text style={styles.accountMeta}>{account.currency}</Text>
                  </TableCell>
                  <TableCell align="right">
                    <Text style={styles.accountMeta}>{formatCurrency(account.initial_balance ?? 0)}</Text>
                  </TableCell>
                  <TableCell align="right">
                    <Text style={styles.accountTotal}>{formatCurrency(balance)}</Text>
                  </TableCell>
                  <TableCell flex={0.35} align="right" mobilePinned>
                    <Pressable
                      onPress={() => setMenuAccount({ id: account.id, name: account.name })}
                      style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
                    </Pressable>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        ) : (
          <EmptyState
            title={t('accounts.emptyTitle', { defaultValue: t('accounts.currentTitle') })}
            description={t('accounts.emptySubtitle', { defaultValue: t('accounts.subtitle') })}
            icon="wallet-outline"
            actionLabel={t('accounts.create')}
            onAction={openCreateDialog}
          />
        )}
      </Section>

      <Modal visible={createDialogOpen} transparent animationType="fade" onRequestClose={() => setCreateDialogOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressable} onPress={() => setCreateDialogOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('accounts.createTitle')}</Text>
            <View style={styles.modalTitleRow}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.modalSubtitle}>{t('accounts.createSubtitle')}</Text>
            </View>
            <Field label={t('accounts.name')} value={name} onChangeText={setName} placeholder={t('accounts.namePlaceholder')} />
            <Text style={styles.sectionLabel}>{t('accounts.typeLabel')}</Text>
            <View style={styles.pillWrap}>
              {accountTypes.map((item) => (
                <Pill key={item} label={t(`accounts.types.${item}`)} active={type === item} onPress={() => setType(item)} />
              ))}
            </View>
            <Text style={styles.sectionLabel}>{t('accounts.currency')}</Text>
            <View style={styles.pillWrap}>
              {currencyOptions.map((item) => (
                <Pill key={item} label={item} active={currency === item} onPress={() => setCurrency(item)} />
              ))}
            </View>
            <HouseholdMemberSelect
              label={t('accounts.owner')}
              members={members}
              value={ownerProfileId}
              placeholder={t('accounts.ownerPlaceholder')}
              hint={t('accounts.ownerPlaceholder')}
              onChange={setOwnerProfileId}
              showSharedOption
              sharedLabel={t('dashboard.shared')}
              sharedDescription={t('accounts.sharedOwnerDescription', { defaultValue: t('dashboard.shared') })}
            />
            <Field label={t('accounts.initialBalance')} value={initialBalance} onChangeText={setInitialBalance} placeholder="0" keyboardType="numeric" />
            <View style={styles.modalActions}>
              <Button label={t('cancel')} variant="secondary" onPress={() => setCreateDialogOpen(false)} />
              <Button label={createAccount.isPending ? t('creating') : t('accounts.create')} onPress={() => void handleCreate()} disabled={!canCreateAccount} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={menuAccount !== null} transparent animationType="fade" onRequestClose={() => setMenuAccount(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressable} onPress={() => setMenuAccount(null)} />
          <View style={styles.menuCard}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
              <Text style={styles.modalTitle}>{menuAccount?.name ?? t('accounts.title')}</Text>
            </View>
            <Pressable
              onPress={() => {
                if (!menuAccount) return;
                const account = accounts.find((item: any) => item.id === menuAccount.id);
                if (account) openEditAccount(account);
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            >
              <Ionicons name="create-outline" size={16} color={colors.text} />
              <Text style={styles.menuItemText}>{t('settings.editDetails')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!menuAccount) return;
                const account = accounts.find((item: any) => item.id === menuAccount.id);
                if (!account) return;
                void archiveAccount.mutateAsync({ id: account.id });
                setMenuAccount(null);
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            >
              <Ionicons name={accounts.find((item: any) => item.id === menuAccount?.id)?.is_archived ? 'refresh-outline' : 'archive-outline'} size={16} color={colors.text} />
              <Text style={styles.menuItemText}>
                {accounts.find((item: any) => item.id === menuAccount?.id)?.is_archived
                  ? t('accounts.unarchive')
                  : t('accounts.archive')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!menuAccount) return;
                void deleteAccount.mutateAsync(menuAccount.id);
                setMenuAccount(null);
              }}
              style={({ pressed }) => [styles.menuItemDanger, pressed && styles.pressed]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.destructive} />
              <Text style={styles.menuItemTextDanger}>{t('delete')}</Text>
            </Pressable>
            <Button label={t('cancel')} variant="secondary" onPress={() => setMenuAccount(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={editAccount !== null} transparent animationType="fade" onRequestClose={() => setEditAccount(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressable} onPress={() => setEditAccount(null)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.editDetails')}</Text>
            <View style={styles.modalTitleRow}>
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              <Text style={styles.modalSubtitle}>{t('settings.selectedAccountsHint', { defaultValue: t('accounts.subtitle') })}</Text>
            </View>
            {editAccount ? (
              <>
                <Field
                  label={t('accounts.name')}
                  value={editAccount.name}
                  onChangeText={(value) => setEditAccount((current) => (current ? { ...current, name: value } : current))}
                />
                <Text style={styles.sectionLabel}>{t('accounts.typeLabel')}</Text>
                <View style={styles.pillWrap}>
                  {accountTypes.map((item) => (
                    <Pill
                      key={item}
                      label={t(`accounts.types.${item}`)}
                      active={editAccount.type === item}
                      onPress={() => setEditAccount((current) => (current ? { ...current, type: item } : current))}
                    />
                  ))}
                </View>
                <Text style={styles.sectionLabel}>{t('accounts.currency')}</Text>
                <View style={styles.pillWrap}>
                  {currencyOptions.map((item) => (
                    <Pill
                      key={item}
                      label={item}
                      active={editAccount.currency === item}
                      onPress={() => setEditAccount((current) => (current ? { ...current, currency: item } : current))}
                    />
                  ))}
                </View>
                <HouseholdMemberSelect
                  label={t('accounts.owner')}
                  members={members}
                  value={editAccount.ownerProfileId}
                  placeholder={t('accounts.ownerPlaceholder')}
                  hint={t('accounts.ownerPlaceholder')}
                  onChange={(value) => setEditAccount((current) => (current ? { ...current, ownerProfileId: value } : current))}
                  showSharedOption
                  sharedLabel={t('dashboard.shared')}
                  sharedDescription={t('accounts.sharedOwnerDescription', { defaultValue: t('dashboard.shared') })}
                />
                <Field
                  label={t('accounts.initialBalance')}
                  value={editAccount.initialBalance}
                  onChangeText={(value) => setEditAccount((current) => (current ? { ...current, initialBalance: value } : current))}
                  keyboardType="numeric"
                />
                <View style={styles.modalActions}>
                  <Button label={t('cancel')} variant="secondary" onPress={() => setEditAccount(null)} />
                  <Button label={updateAccount.isPending ? t('saving') : t('accounts.saveChanges', { defaultValue: t('settings.saveChanges') })} onPress={() => void handleSaveAccount()} disabled={updateAccount.isPending} />
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
  accountHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: spacing(3),
  },
  accountName: {
    color: colors.text,
    fontWeight: String(typography.fontWeight.bold),
    fontSize: typography.fontSize[16],
  },
  accountMeta: {
    color: colors.textSecondary,
  },
  accountTotal: {
    color: colors.primary,
    fontWeight: String(typography.fontWeight.extraBold),
    fontSize: typography.fontSize[18],
  },
  menuButton: {
    width: spacing(10.5),
    height: spacing(10.5),
    borderRadius: radius.mdPlus,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  menuButtonText: {
    color: colors.text,
    fontSize: typography.fontSize[22],
    fontWeight: String(typography.fontWeight.extraBold),
    lineHeight: typography.lineHeight[22],
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center' as const,
    padding: spacing(5),
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
  },
  backdropPressable: StyleSheet.absoluteFill,
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
    fontWeight: String(typography.fontWeight.extraBold),
  },
  modalTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing(2),
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing(1.5),
  },
  accountLeading: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing(3),
    flex: 1,
  },
  accountIconBadge: {
    width: spacing(10.5),
    height: spacing(10.5),
    borderRadius: radius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing(1.25),
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontWeight: String(typography.fontWeight.semibold),
  },
  pillWrap: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing(2),
  },
  modalActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing(2.5),
    justifyContent: 'flex-end' as const,
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing(2),
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  menuItemDanger: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing(2),
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
