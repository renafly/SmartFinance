import { Stack } from 'expo-router';
import { VercelSpeedInsights } from '@/components/vercel-speed-insights';
import { RootProvider } from '../providers/RootProvider';
import { useTheme } from '@/theme/ThemeProvider';

// NOTE: Provider composition (Theme, Query, Auth, Localization, Feature
// Flags, Modal, Toast - see item 31) is wired in providers/RootProvider.tsx
// once that item has run. If it hasn't, this layout still renders fine
// unwrapped.
export default function RootLayout() {
  return (
    <RootProvider>
      <RootStack />
      <VercelSpeedInsights />
    </RootProvider>
  );
}

function RootStack() {
  const { colors } = useTheme();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(public)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(protected)" />
    </Stack>
  );
}
