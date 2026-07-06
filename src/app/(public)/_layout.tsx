import { Stack } from 'expo-router';

// (public) route group layout. Guarding logic (if this is the
// (protected) group) lives in navigation/Protected.tsx (item 35), which
// wraps screens here rather than this file reimplementing it.
export default function PublicLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
