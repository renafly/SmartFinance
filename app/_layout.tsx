import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { LogBox, Platform } from 'react-native'
import { useAuthContext } from '../src/shared/hooks/use-auth-context'
import { SplashScreenController } from '../src/shared/providers/SplashScreenController'
import { AppProviders } from '@/shared/providers/app-providers'

function RouteGuard() {
  const { isLoggedIn, isLoading } = useAuthContext()

  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inInviteRoute = segments[0] === 'invite'

    if (!isLoggedIn && !inAuthGroup && !inInviteRoute) {
      router.replace('/(auth)/login')
      return
    }

    if (isLoggedIn && inAuthGroup) {
      router.replace('/')
    }
  }, [isLoggedIn, isLoading, segments, router])

  return <Slot />
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      LogBox.ignoreLogs(['props.pointerEvents is deprecated. Use style.pointerEvents'])
    }
  }, [])

  return (
    <AppProviders>
      <SplashScreenController />
      <RouteGuard />
    </AppProviders>
  )
}