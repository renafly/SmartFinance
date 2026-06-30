import { Stack } from 'expo-router'

export default function TransactionsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Transactions',
        }}
      />

      <Stack.Screen
        name="new"
        options={{
          presentation: 'modal',
          title: 'New Transaction',
        }}
      />

      <Stack.Screen
        name="[id]"
        options={{
          title: 'Edit Transaction',
        }}
      />
    </Stack>
  )
}