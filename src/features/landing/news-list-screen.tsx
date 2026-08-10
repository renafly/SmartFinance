import { Redirect } from "expo-router";

// Public marketing pages are web-only; native builds keep the existing
// login-first experience (see public-overview-screen.tsx).
export default function NewsListScreen() {
  return <Redirect href="/login" />;
}
