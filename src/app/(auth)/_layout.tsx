import { Stack } from 'expo-router';
import { Guest } from '../../navigation/Guest';
import { useTheme } from '@/theme/ThemeProvider';

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Guest>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </Guest>
  );
}
