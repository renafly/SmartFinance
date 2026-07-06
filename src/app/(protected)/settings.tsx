import { useState } from 'react';
import { Text, View } from 'react-native';

import { Page, Card, Section, Field, Button } from '@/components/migrated-page';
import { useAuth } from '../../providers/AuthProvider';
import { useCreateHousehold, useDefaultHousehold, useMyHouseholds } from '../../features/households/hooks';

export default function SettingsScreen() {
  const { profile, householdId, logout } = useAuth();
  const householdsQuery = useMyHouseholds();
  const createHousehold = useCreateHousehold();
  const defaultHousehold = useDefaultHousehold();
  const [householdName, setHouseholdName] = useState('');
  const canCreateHousehold = !createHousehold.isPending && householdName.trim().length > 0;

  async function handleCreateHousehold() {
    if (!householdName.trim()) return;

    await createHousehold.mutateAsync(householdName.trim());
    setHouseholdName('');
  }

  return (
    <Page title="Settings" subtitle="Household preferences and account controls.">
      <Card>
        <Section title="Profile">
          <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{profile?.full_name ?? 'Unnamed user'}</Text>
          <Text style={{ color: '#94A3B8' }}>{profile?.email ?? 'No email'}</Text>
          <Text style={{ color: '#94A3B8' }}>Current household: {householdId ?? 'none'}</Text>
        </Section>
      </Card>

      <Card>
        <Section title="Create household">
          <Field label="Household name" value={householdName} onChangeText={setHouseholdName} placeholder="My household" />
          <Button label={createHousehold.isPending ? 'Creating...' : 'Create household'} onPress={() => void handleCreateHousehold()} disabled={!canCreateHousehold} />
        </Section>
      </Card>

      <Section title="My households">
        <View style={{ gap: 10 }}>
          {(householdsQuery.data ?? []).map((item: any) => (
            <Card key={item.id}>
              <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{item.name}</Text>
              <Text style={{ color: '#94A3B8' }}>{item.id}</Text>
              <Button
                label="Set default"
                onPress={() => void defaultHousehold.mutateAsync(item.id)}
                variant="secondary"
                disabled={defaultHousehold.isPending}
              />
            </Card>
          ))}
        </View>
      </Section>

      <Button label="Sign out" onPress={() => void logout()} variant="danger" />
    </Page>
  );
}
