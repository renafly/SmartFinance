import { Redirect } from 'expo-router';

// Native builds retain the existing login-first experience.
export default function LandingEntryScreen() {
  return <Redirect href="/login" />;
}
