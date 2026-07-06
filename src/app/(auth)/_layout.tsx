import { Stack } from 'expo-router';
import { Guest } from '../../navigation/Guest';

export default function AuthLayout() {
  return (
    <Guest>
      <Stack screenOptions={{ headerShown: false }} />
    </Guest>
  );
}