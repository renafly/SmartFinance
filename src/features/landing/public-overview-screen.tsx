import { Redirect } from 'expo-router';

export type PublicPageKey = 'features' | 'howItWorks' | 'about';

export default function PublicOverviewScreen(_props: { page: PublicPageKey }) {
  return <Redirect href="/login" />;
}
