import { useState } from 'react';
import { Text, View } from 'react-native';

import { Page, Card, Section, Field, Button, Pill, formatCurrency } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { useAccounts, useCreateAccount, useArchiveAccount, useDeleteAccount, useUpdateAccount } from '../../features/accounts/hooks';

const accountTypes = ['cash', 'checking', 'savings', 'credit', 'investment'];

export default function AccountsScreen() {
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccounts();
  const createAccount = useCreateAccount();
  const archiveAccount = useArchiveAccount();
  const deleteAccount = useDeleteAccount();
  const updateAccount = useUpdateAccount();

  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState('0');

  const accounts = accountsQuery.data ?? [];
  const selectedAccountCount = accounts.filter((item: any) => item.is_archived).length;
  const parsedInitialBalance = Number(initialBalance);
  const canCreateAccount =
    !createAccount.isPending &&
    name.trim().length > 0 &&
    Number.isFinite(parsedInitialBalance);

  async function handleCreate() {
    if (!householdId || !profile?.id || !name.trim() || !Number.isFinite(parsedInitialBalance)) return;

    await createAccount.mutateAsync({
      household_id: householdId,
      owner_profile_id: profile.id,
      name: name.trim(),
      type: type as any,
      currency: currency.trim().toUpperCase() || 'USD',
      initial_balance: parsedInitialBalance,
    });

    setName('');
    setInitialBalance('0');
  }

  return (
    <Page title="Accounts" subtitle="Manage household accounts using the existing account hooks and service layer.">
      <Card>
        <Section title="Create account" subtitle="This uses the current account creation mutation.">
          <Field label="Name" value={name} onChangeText={setName} placeholder="Main checking" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {accountTypes.map((item) => (
              <Pill key={item} label={item} active={type === item} onPress={() => setType(item)} />
            ))}
          </View>
          <Field label="Currency" value={currency} onChangeText={setCurrency} placeholder="USD" />
          <Field label="Initial balance" value={initialBalance} onChangeText={setInitialBalance} placeholder="0" keyboardType="numeric" />
          <Button label={createAccount.isPending ? 'Creating...' : 'Create account'} onPress={() => void handleCreate()} disabled={!canCreateAccount} />
        </Section>
      </Card>

      <Section title="Household accounts" subtitle={`${accounts.length} accounts loaded, ${selectedAccountCount} archived.`}>
        <View style={{ gap: 12 }}>
          {accounts.map((account: any) => (
            <Card key={account.id}>
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{account.name}</Text>
              <Text style={{ color: '#94A3B8' }}>{account.type} · {account.currency}</Text>
              <Text style={{ color: '#7DD3FC', fontWeight: '800' }}>{formatCurrency(account.current_balance ?? account.balance ?? 0)}</Text>
              <Text style={{ color: account.is_archived ? '#FCA5A5' : '#86EFAC', fontWeight: '600' }}>
                {account.is_archived ? 'Archived' : 'Active'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button
                  label={account.is_archived ? 'Unarchive' : 'Archive'}
                  onPress={() => void archiveAccount.mutateAsync({ id: account.id })}
                  variant="secondary"
                />
                <Button
                  label="Rename"
                  onPress={() => void updateAccount.mutateAsync({ id: account.id, data: { name: `${account.name} (updated)` } as any })}
                  variant="secondary"
                />
                <Button
                  label="Delete"
                  onPress={() => void deleteAccount.mutateAsync(account.id)}
                  variant="danger"
                />
              </View>
            </Card>
          ))}
        </View>
      </Section>
    </Page>
  );
}
