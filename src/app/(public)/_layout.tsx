import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

// (public) route group layout. Guarding logic (if this is the
// (protected) group) lives in navigation/Protected.tsx (item 35), which
// wraps screens here rather than this file reimplementing it.
export default function PublicLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
