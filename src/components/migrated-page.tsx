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

type PageProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function Page({ title, subtitle, children, actions }: PageProps) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.kicker}>SmartFinance</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actions ? <View style={styles.headerActions}>{actions}</View> : null}
      </View>

      {children}
    </ScrollView>
  );
}

type CardProps = {
  children: ReactNode;
};

export function Card({ children }: CardProps) {
  return <View style={styles.card}>{children}</View>;
}

type SectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
};

export function Section({ title, subtitle, children, action }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
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
  const content = <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>;

  if (!onPress) {
    return <View style={[styles.pill, active && styles.pillActive]}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && styles.pressed]}>
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'danger' && styles.dangerButton,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.secondaryButtonText,
          variant === 'danger' && styles.dangerButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label: string;
};

export function Field({ label, style, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...props} style={[styles.input, style]} placeholderTextColor="#94A3B8" />
    </View>
  );
}

export function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number.isFinite(num) ? num : 0);
}

export function formatDate(value?: string | null) {
  if (!value) return 'n/a';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

const styles = StyleSheet.create({
  page: {
    padding: 20,
    gap: 20,
    backgroundColor: '#07111F',
  },
  header: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  headerActions: {
    gap: 8,
  },
  kicker: {
    color: '#7DD3FC',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#94A3B8',
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#111C31',
    borderWidth: 1,
    borderColor: '#243245',
  },
  pillActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#2563EB',
  },
  pillText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#F8FAFC',
  },
  pressed: {
    opacity: 0.85,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#7DD3FC',
  },
  secondaryButton: {
    backgroundColor: '#111C31',
    borderWidth: 1,
    borderColor: '#243245',
  },
  dangerButton: {
    backgroundColor: '#3A1218',
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  buttonText: {
    color: '#0B1220',
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#E2E8F0',
  },
  dangerButtonText: {
    color: '#FCA5A5',
  },
  disabled: {
    opacity: 0.5,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#111C31',
    borderWidth: 1,
    borderColor: '#243245',
    borderRadius: 14,
    color: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
