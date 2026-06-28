import { View, Text, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import GoogleSignInButton from '@/components/social-auth-buttons/google/google-sign-in-button'
import { colors, spacing, typography, radius, globalStyles } from '@/theme'

export default function LoginScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[globalStyles.screen, globalStyles.centered]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>💰</Text>
          </View>
          <Text style={globalStyles.screenTitle}>SmartFinance</Text>
          <Text style={globalStyles.screenSubtitle}>
            Controla as tuas finanças com inteligência
          </Text>
        </View>

        {/* Card */}
        <View style={[globalStyles.card, styles.authCard]}>
          <Text style={globalStyles.sectionTitle}>Entrar na conta</Text>
          <Text style={globalStyles.screenSubtitle}>
            Usa a tua conta Google para continuar
          </Text>
          <GoogleSignInButton />
        </View>

        {/* Footer */}
        <Text style={[globalStyles.caption, styles.footer]}>
          Ao entrar, aceitas os nossos Termos de Serviço e Política de Privacidade.
        </Text>

      </View>
    </>
  )
}

// Apenas estilos específicos desta screen
const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoIcon: {
    fontSize: 36,
  },
  authCard: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
})