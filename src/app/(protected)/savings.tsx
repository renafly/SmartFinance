import { useState } from 'react';
import { Text, View } from 'react-native';

import { Page, Card, Section, Field, Button, formatCurrency } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { useCreateSavingPot, useDeleteSavingPot, useSavingPotBalances, useSavingPots } from '../../features/saving-pots/hooks';

export default function SavingsScreen() {
  const { householdId, profile } = useAuth();
  const savingPotsQuery = useSavingPots();
  const balancesQuery = useSavingPotBalances();
  const createSavingPot = useCreateSavingPot();
  const deleteSavingPot = useDeleteSavingPot();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const parsedTargetAmount = targetAmount.trim() ? Number(targetAmount) : null;
  const canCreateSavingPot =
    !createSavingPot.isPending &&
    name.trim().length > 0 &&
    (parsedTargetAmount === null || Number.isFinite(parsedTargetAmount));

  async function handleCreate() {
    if (!householdId || !profile?.id || !name.trim() || (parsedTargetAmount !== null && !Number.isFinite(parsedTargetAmount))) return;

    await createSavingPot.mutateAsync({
      household_id: householdId,
      created_by: profile.id,
      name: name.trim(),
      target_amount: parsedTargetAmount,
    } as any);

    setName('');
    setTargetAmount('');
  }

  return (
    <Page title="Savings" subtitle="Track saving pots and their balances.">
      <Card>
        <Section title="Create saving pot">
          <Field label="Name" value={name} onChangeText={setName} placeholder="Emergency fund" />
          <Field label="Target amount" value={targetAmount} onChangeText={setTargetAmount} keyboardType="numeric" placeholder="1000" />
          <Button label={createSavingPot.isPending ? 'Creating...' : 'Create saving pot'} onPress={() => void handleCreate()} disabled={!canCreateSavingPot} />
        </Section>
      </Card>

      <Section title="Balances" subtitle="The current balance view from the existing saving pot balances query.">
        <View style={{ gap: 10 }}>
          {(balancesQuery.data ?? []).map((pot: any) => (
            <Card key={pot.id}>
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{pot.name}</Text>
              <Text style={{ color: '#94A3B8' }}>Saved {formatCurrency(pot.saved)} · Spent {formatCurrency(pot.spent)}</Text>
              <Text style={{ color: '#7DD3FC', fontWeight: '800' }}>Balance {formatCurrency(pot.balance)}</Text>
            </Card>
          ))}
        </View>
      </Section>

      <Section title="Saving pots" subtitle="Delete pots using the existing mutation.">
        <View style={{ gap: 10 }}>
          {(savingPotsQuery.data ?? []).map((pot: any) => (
            <Card key={pot.id}>
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{pot.name}</Text>
              <Text style={{ color: '#94A3B8' }}>{pot.target_amount ? formatCurrency(pot.target_amount) : 'No target'}</Text>
              <Button label="Delete" variant="danger" onPress={() => void deleteSavingPot.mutateAsync(pot.id)} />
            </Card>
          ))}
        </View>
      </Section>
    </Page>
  );
}
