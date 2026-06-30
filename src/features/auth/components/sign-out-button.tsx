import { supabase } from '@/shared/lib/supabase/client'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { colors, spacing, typography, radius } from '@/shared/theme'

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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  text: {
    ...typography.body,
    color: colors.danger,
  },
})