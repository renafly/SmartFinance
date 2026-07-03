import { Stack } from 'expo-router'

export default function MembersLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Members',
        }}
      />

      <Stack.Screen
        name="[id]"
        options={{
          title: 'Member Details',
        }}
      />
    </Stack>
  )
}
