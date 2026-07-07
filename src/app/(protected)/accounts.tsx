import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import { Page, Card, Section, Field, Button, Pill, formatCurrency } from '@/components/migrated-page';
import { HouseholdMemberSelect } from '@/components/household-member-select';
import { useAuth } from '../../providers/AuthProvider';
import {
  useAccountsWithBalances,
  useCreateAccount,
  useArchiveAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '../../features/accounts/hooks';
import { useHouseholdMemberDetails } from '../../features/households/hooks';
import { usePreferencesStore, type AppCurrency } from '@/stores/preferencesStore';
import { typography } from '@/theme/typography';

const accountTypes = ['bank', 'cash', 'savings', 'credit_card', 'investment'] as const;
const currencyOptions: AppCurrency[] = ['EUR', 'USD', 'GBP'];

type EditMode = {
  id: string;
  name: string;
};

export default function AccountsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation('common');
  const { householdId, profile } = useAuth();
  const preferredCurrency = usePreferencesStore((state) => state.currency);
  const accountsQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
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

  const accounts = accountsQuery.data ?? [];
  const members = (membersQuery.data ?? []).filter((member) => member.status === 'accepted');
  const currentUserLabel = profile?.full_name?.trim() || profile?.email?.trim() || t('settings.you');
  const memberLabelMap = new Map(
    members.map((member) => [
      member.userId,
      member.fullName?.trim() || member.email || member.userId,
    ]),
  );
  const archivedCount = accounts.filter((item: any) => item.is_archived).length;
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
      currency: currency.trim().toUpperCase() || 'EUR',
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

  function openEditAccount(account: any) {
    setEditAccount({
      id: account.id,
      name: account.name ?? '',
      type: account.type ?? 'bank',
      currency: (account.currency ?? preferredCurrency) as AppCurrency,
      initialBalance: String(account.initial_balance ?? 0),
      ownerProfileId: account.owner_profile_id ?? profile?.id ?? '',
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
      <Section title={t('accounts.currentTitle')} subtitle={t('accounts.currentSubtitle', { count: accounts.length, archived: archivedCount })}>
        <View style={{ gap: spacing(3) }}>
          {accounts.map((account: any) => {
            const balance = account.current_balance ?? account.balance ?? 0;

            return (
              <Card key={account.id}>
                <View style={styles.accountHeader}>
                  <View style={{ flex: 1, gap: spacing(1.5) }}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountMeta}>
                      {t(`accounts.types.${account.type}`, { defaultValue: account.type })} · {account.currency}
                    </Text>
                    <Text style={styles.accountMeta}>
                      {t('accounts.owner')}: {account.owner_profile_id === profile?.id
                        ? currentUserLabel
                        : (memberLabelMap.get(account.owner_profile_id ?? '') ?? t('settings.unnamedUser'))}
                    </Text>
                    <Text style={styles.accountTotal}>{formatCurrency(balance)}</Text>
                    <Text style={styles.accountMeta}>
                      {t('accounts.initialBalance')} {formatCurrency(account.initial_balance ?? 0)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setMenuAccount({ id: account.id, name: account.name })}
                    style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.menuButtonText}>⋮</Text>
                  </Pressable>
                </View>

                <Text style={{ color: account.is_archived ? colors.destructive : colors.success, fontWeight: typography.fontWeight.semibold }}>
                  {account.is_archived ? t('accounts.archived') : t('accounts.active')}
                </Text>
              </Card>
            );
          })}
        </View>
      </Section>

      <Modal visible={createDialogOpen} transparent animationType="fade" onRequestClose={() => setCreateDialogOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressable} onPress={() => setCreateDialogOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('accounts.createTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('accounts.createSubtitle')}</Text>
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
              value={ownerProfileId || profile?.id || ''}
              placeholder={t('accounts.ownerPlaceholder')}
              hint={t('accounts.ownerPlaceholder')}
              onChange={setOwnerProfileId}
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
            <Text style={styles.modalTitle}>{menuAccount?.name ?? t('accounts.title')}</Text>
            <Pressable
              onPress={() => {
                if (!menuAccount) return;
                const account = accounts.find((item: any) => item.id === menuAccount.id);
                if (account) openEditAccount(account);
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            >
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
            <Text style={styles.modalSubtitle}>{t('settings.selectedAccountsHint', { defaultValue: t('accounts.subtitle') })}</Text>
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
                  value={editAccount.ownerProfileId || profile?.id || ''}
                  placeholder={t('accounts.ownerPlaceholder')}
                  hint={t('accounts.ownerPlaceholder')}
                  onChange={(value) => setEditAccount((current) => (current ? { ...current, ownerProfileId: value } : current))}
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
    fontWeight: typography.fontWeight.bold as const,
    fontSize: typography.fontSize[16],
  },
  accountMeta: {
    color: colors.textSecondary,
  },
  accountTotal: {
    color: colors.primary,
    fontWeight: typography.fontWeight.extraBold as const,
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
    fontWeight: typography.fontWeight.extraBold as const,
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
    fontWeight: typography.fontWeight.extraBold as const,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold as const,
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
    fontWeight: typography.fontWeight.bold as const,
  },
  menuItemTextDanger: {
    color: colors.destructive,
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold as const,
  },
  pressed: {
    opacity: 0.85,
  },
  } as const);
}
