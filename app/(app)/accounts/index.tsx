import { View, Text, ActivityIndicator, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useAccounts } from '@/features/accounts/hooks'
import { AccountCard } from '@/features/accounts/components/account-card'

export default function AccountsScreen() {
  const router = useRouter()
  const { data: accounts, isPending, error } = useAccounts()

  if (isPending) return <ActivityIndicator />
  if (error) return <Text>{String(error)}</Text>

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>
        Accounts
      </Text>

      <Pressable
        onPress={() => router.push('/accounts/new')}
        style={{
          marginVertical: 12,
          padding: 12,
          backgroundColor: '#000',
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#fff' }}>+ New Account</Text>
      </Pressable>

      {accounts?.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onPress={() => router.push(`/accounts/${account.id}`)}
        />
      ))}
    </View>
  )
}