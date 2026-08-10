import { useLocalSearchParams } from 'expo-router';

import NewsArticleScreen from '@/features/landing/news-article-screen';

export default function NewsArticlePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <NewsArticleScreen slug={slug} />;
}
