import { supabase } from '@/lib/supabase'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { colors, spacing, typography, radius } from '@/theme'

async function onSignOutButtonPress() {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Error signing out:', error)
}

export default function SignOutButton() {
  return (
    <TouchableOpacity style={styles.button} onPress={onSignOutButtonPress}>
      <Text style={styles.text}>Terminar sessão</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  text: {
    ...typography.label,
    color: colors.danger,
  },
})