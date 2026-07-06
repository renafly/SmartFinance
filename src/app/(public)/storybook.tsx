import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

const samples = [
  { title: 'Primary Button', body: 'A simple call to action for the default design system.' },
  { title: 'Card', body: 'Useful for grouping related information in dashboards and forms.' },
  { title: 'Form Field', body: 'Basic input treatment for login, search, and data entry.' },
  { title: 'Empty State', body: 'A pattern for when there is no data yet.' },
];

export default function StorybookPreviewScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: '700' }}>UI Preview</Text>
        <Text style={{ color: '#6B7280' }}>
          Quick visual entry point for checking the generated interface.
        </Text>
      </View>

      {samples.map((sample) => (
        <View
          key={sample.title}
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 12,
            padding: 16,
            backgroundColor: '#FFFFFF',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600' }}>{sample.title}</Text>
          <Text style={{ color: '#4B5563' }}>{sample.body}</Text>
        </View>
      ))}

      <View
        style={{
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 12,
          padding: 16,
          backgroundColor: '#F9FAFB',
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600' }}>Actions</Text>
        <Text
          onPress={() => router.push('/(auth)/login')}
          style={{ fontWeight: '600', color: '#2563EB' }}
        >
          Go to login
        </Text>
      </View>
    </ScrollView>
  );
}
