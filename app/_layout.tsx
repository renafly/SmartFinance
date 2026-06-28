import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import AuthProvider from '../src/providers/auth-provider'
import { useAuthContext } from '../src/hooks/use-auth-context'
import { SplashScreenController } from '../src/screens/SplashScreenController'

function RouteGuard() {
  const { isLoggedIn, isLoading } = useAuthContext()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuthScreen = segments[0] === 'login'

    if (!isLoggedIn && !inAuthScreen) {
      router.replace('/login')
    } else if (isLoggedIn && inAuthScreen) {
      router.replace('/')
    }
  }, [isLoggedIn, isLoading])

  return <Slot />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashScreenController />
      <RouteGuard />
    </AuthProvider>
  )
}