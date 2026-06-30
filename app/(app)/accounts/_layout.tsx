
import { Stack } from 'expo-router'

export default function AccountsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Accounts',
        }}
      />

      <Stack.Screen
        name="new"
        options={{
          presentation: 'modal',
          title: 'New Account',
        }}
      />

      <Stack.Screen
        name="[id]"
        options={{
          title: 'Edit Account',
        }}
      />
    </Stack>
  )
}