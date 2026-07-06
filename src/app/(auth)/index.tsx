import { Redirect } from 'expo-router';

export default function AuthPlaceholder() {
  return <Redirect href="/(auth)/login" />;
}
