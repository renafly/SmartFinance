import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import AuthProvider from '../src/shared/providers/auth-provider'
import { useAuthContext } from '../src/shared/hooks/use-auth-context'
import { SplashScreenController } from '../src/shared/providers/SplashScreenController'

function RouteGuard() {
  const { isLoggedIn, isLoading } = useAuthContext();

  const segments = useSegments();

  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isLoggedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (isLoggedIn && inAuthGroup) {
      router.replace({
        pathname: "/",
      });
    }
  }, [isLoggedIn, isLoading, segments]);

    return <Slot />;
  }

export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashScreenController />
      <RouteGuard />
    </AuthProvider>
  )
}