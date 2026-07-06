import { Pressable, Text } from 'react-native';
import { AuthService } from '@/services/AuthService';

export default function SignOutButton() {
  return (
    <Pressable onPress={() => AuthService.signOut()}>
      <Text>Sign out</Text>
    </Pressable>
  );
}
