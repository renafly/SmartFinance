import { Stack } from 'expo-router';
import { RootProvider } from '../providers/RootProvider';

// NOTE: Provider composition (Theme, Query, Auth, Localization, Feature
// Flags, Modal, Toast - see item 31) is wired in providers/RootProvider.tsx
// once that item has run. If it hasn't, this layout still renders fine
// unwrapped.
export default function RootLayout() {
  return (
    <RootProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(protected)" />
      </Stack>
    </RootProvider>
  );
}
