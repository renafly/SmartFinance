import { View, Text, StyleSheet } from 'react-native'
import SignOutButton from '../src/components/social-auth-buttons/sign-out-button'
import { useAuthContext } from '../src/hooks/use-auth-context'
import { colors, spacing, typography, radius, globalStyles, shadows } from '@/theme'

export default function HomeScreen() {
  const { profile, claims } = useAuthContext()

  return (
    <View style={[globalStyles.screen, globalStyles.centered]}>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {(profile?.username ?? claims?.email ?? '?')[0].toUpperCase()}
        </Text>
      </View>

      {/* Greeting */}
      <Text style={globalStyles.screenTitle}>
        Olá, {profile?.username ?? claims?.email?.split('@')[0]} 👋
      </Text>
      <Text style={[globalStyles.screenSubtitle, styles.subtitle]}>
        Bem-vindo de volta ao SmartFinance
      </Text>

      {/* Divider */}
      <View style={globalStyles.divider} />

      {/* Sign out */}
      <View style={styles.signOutContainer}>
        <SignOutButton />
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.avatar,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  avatarText: {
    ...typography.h1,
    color: colors.primary,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  signOutContainer: {
    marginTop: spacing.md,
    width: '100%',
  },
})