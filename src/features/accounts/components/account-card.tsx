import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Account } from '../types'

type Props = {
  account: Account
  onPress: () => void
}

export function AccountCard({ account, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View>
        <Text>{account.name}</Text>
        <Text>{account.type}</Text>
      </View>

      <Text>{account.initial_balance}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
})