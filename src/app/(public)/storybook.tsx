import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

const samples = [
  { title: 'Primary Button', body: 'A simple call to action for the default design system.' },
  { title: 'Card', body: 'Useful for grouping related information in dashboards and forms.' },
  { title: 'Form Field', body: 'Basic input treatment for login, search, and data entry.' },
  { title: 'Empty State', body: 'A pattern for when there is no data yet.' },
];

export default function StorybookPreviewScreen() {
  const { colors } = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1, padding: spacing(6), gap: spacing(4) }}>
      <View style={{ flex: 1, gap: spacing(4) }}>
        <View style={{ gap: spacing(2) }}>
          <Text style={{ fontSize: typography.fontSize[28], fontWeight: typography.fontWeight.bold }}>UI Preview</Text>
          <Text style={{ color: colors.textSecondary }}>
            Quick visual entry point for checking the generated interface.
          </Text>
        </View>

        {samples.map((sample) => (
          <View
            key={sample.title}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.base,
              padding: spacing(4),
              backgroundColor: colors.background,
              gap: spacing(2),
            }}
          >
            <Text style={{ fontSize: typography.fontSize[18], fontWeight: typography.fontWeight.semibold }}>{sample.title}</Text>
            <Text style={{ color: colors.textSecondary }}>{sample.body}</Text>
          </View>
        ))}

        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.base,
            padding: spacing(4),
            backgroundColor: colors.surface,
            gap: spacing(3),
          }}
        >
          <Text style={{ fontSize: typography.fontSize[18], fontWeight: typography.fontWeight.semibold }}>Actions</Text>
          <Text
            onPress={() => router.push('/(auth)/login')}
            style={{ fontWeight: typography.fontWeight.semibold, color: colors.primary }}
          >
            Go to login
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
