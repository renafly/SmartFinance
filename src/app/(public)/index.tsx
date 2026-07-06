import { Redirect } from 'expo-router';

// Auth is configured, so the public route lands directly on login.
export default function WelcomeScreen() {
  return <Redirect href="/(auth)/login" />;
}