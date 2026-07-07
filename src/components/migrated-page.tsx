import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { usePreferencesStore } from '@/stores/preferencesStore';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type PageProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function Page({ title, subtitle, children, actions }: PageProps) {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]} contentContainerStyle={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.pageInner}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flex: 1, gap: spacing(2) }}>
            <Text style={[styles.kicker, { color: colors.primary }]}>SmartFinance</Text>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          </View>
          {actions ? <View style={styles.headerActions}>{actions}</View> : null}
        </View>

        <View style={styles.pageBody}>{children}</View>
      </View>
    </ScrollView>
  );
}

type CardProps = {
  children: ReactNode;
};

export function Card({ children }: CardProps) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>;
}

type SectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
};

export function Section({ title, subtitle, children, action }: SectionProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
        </View>
        {action ? <View>{action}</View> : null}
      </View>
      {children}
    </View>
  );
}

type PillProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function Pill({ label, active, onPress }: PillProps) {
  const { colors } = useTheme();
  const content = <Text style={[styles.pillText, { color: active ? colors.primaryForeground : colors.textSecondary }]}>{label}</Text>;

  if (!onPress) {
    return <View style={[styles.pill, { backgroundColor: active ? colors.primary : colors.surfaceMuted, borderColor: active ? colors.primary : colors.border }]}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, { backgroundColor: active ? colors.primary : colors.surfaceMuted, borderColor: active ? colors.primary : colors.border }, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled }: ButtonProps) {
  const { colors } = useTheme();
  return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.surfaceMuted : colors.destructive },
          { borderColor: variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.border : colors.destructive },
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
      <Text style={[styles.buttonText, { color: variant === 'primary' ? colors.primaryForeground : variant === 'secondary' ? colors.text : colors.destructiveForeground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label: string;
};

export function Field({ label, style, ...props }: FieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput {...props} style={[styles.input, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }, style]} placeholderTextColor={colors.textSecondary} />
    </View>
  );
}

export function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  const currency = usePreferencesStore.getState().currency;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number.isFinite(num) ? num : 0);
}

export function formatDate(value?: string | null) {
  if (!value) return 'n/a';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  page: {
    flexGrow: 1,
    padding: spacing(5),
    gap: spacing(5),
  },
  pageInner: {
    flex: 1,
    gap: spacing(5),
  },
  header: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing(5),
    flexDirection: 'row',
    gap: spacing(3),
    alignItems: 'flex-start',
  },
  headerActions: {
    gap: spacing(2),
  },
  pageBody: {
    flex: 1,
    gap: spacing(5),
  },
  kicker: {
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing[16],
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.bold,
  },
  title: {
    fontSize: typography.fontSize[34],
    lineHeight: typography.lineHeight[38],
    fontWeight: typography.fontWeight.extraBold,
  },
  subtitle: {
    fontSize: typography.fontSize[14],
    lineHeight: typography.lineHeight[20],
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing(4),
    gap: spacing(3),
    borderWidth: 1,
  },
  section: {
    gap: spacing(3),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(3),
  },
  sectionTitle: {
    fontSize: typography.fontSize[18],
    fontWeight: typography.fontWeight.bold,
  },
  sectionSubtitle: {
    marginTop: spacing(1),
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  pill: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillText: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.85,
  },
  button: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.bold,
  },
  disabled: {
    opacity: 0.5,
  },
  field: {
    gap: spacing(1.5),
  },
  fieldLabel: {
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.semibold,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
  },
});
