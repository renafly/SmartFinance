import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type TextInputProps,
} from 'react-native';

import { usePreferencesStore } from '@/stores/preferencesStore';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { useResponsiveMetrics } from '@/theme/responsive';

type PageProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  overlay?: ReactNode;
  scrollViewProps?: ScrollViewProps;
};

export function Page({ title, subtitle, children, actions, overlay, scrollViewProps }: PageProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const responsive = useResponsiveMetrics();

  return (
    <View style={styles.pageShell}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        {...scrollViewProps}
        contentContainerStyle={[
          styles.page,
          {
            backgroundColor: colors.background,
            padding: responsive.pagePadding,
            gap: responsive.pageGap,
          },
        ]}
      >
        <View style={[styles.pageInner, { gap: responsive.pageGap }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              padding: responsive.headerPadding,
              gap: responsive.headerGap,
              flexDirection: responsive.isPhone ? 'column' : 'row',
            },
          ]}
        >
          <View style={{ flex: 1, gap: spacing(2) }}>
            <Text style={[styles.kicker, { color: colors.primary }]}>{t('drawer.brand')}</Text>
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontSize: responsive.titleFontSize,
                  lineHeight: responsive.titleLineHeight,
                },
              ]}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: colors.textSecondary,
                    fontSize: responsive.bodyFontSize,
                    lineHeight: responsive.bodyLineHeight,
                  },
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {actions ? (
            <View style={[styles.headerActions, responsive.isPhone && styles.headerActionsCompact]}>
              {actions}
            </View>
          ) : null}
        </View>

        <View style={[styles.pageBody, { gap: responsive.pageGap }]}>{children}</View>
        </View>
      </ScrollView>
      {overlay}
    </View>
  );
}

type CardProps = {
  children: ReactNode;
};

export function Card({ children }: CardProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: responsive.cardPadding,
          gap: responsive.cardGap,
        },
      ]}
    >
      {children}
    </View>
  );
}

type SectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

export function Section({ title, subtitle, children, action, collapsible = false, defaultCollapsed = false }: SectionProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const isExpanded = !isCollapsed;

  return (
    <View style={[styles.section, { gap: responsive.cardGap }]}>
      <View style={[styles.sectionHeader, responsive.isPhone && styles.sectionHeaderCompact]}>
        <Pressable
          disabled={!collapsible}
          accessibilityRole={collapsible ? 'button' : undefined}
          accessibilityState={collapsible ? { expanded: isExpanded } : undefined}
          onPress={() => setIsCollapsed((current) => !current)}
          style={({ pressed }) => [styles.sectionHeading, pressed && collapsible && styles.pressed]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
                fontSize: responsive.sectionTitleFontSize,
              },
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color: colors.textSecondary,
                  fontSize: responsive.bodyFontSize,
                  lineHeight: responsive.bodyLineHeight,
                },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </Pressable>
        {collapsible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${title}`}
            accessibilityState={{ expanded: isExpanded }}
            onPress={() => setIsCollapsed((current) => !current)}
            style={[styles.sectionToggle, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
          >
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
        {action ? <View>{action}</View> : null}
      </View>
      {isExpanded ? children : null}
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
  const responsive = useResponsiveMetrics();
  const content = <Text style={[styles.pillText, { color: active ? colors.primaryForeground : colors.textSecondary }]}>{label}</Text>;
  const responsiveStyle = {
    paddingHorizontal: responsive.isPhone ? spacing(2.25) : spacing(3),
    paddingVertical: responsive.isPhone ? spacing(1.5) : spacing(2),
  };

  if (!onPress) {
    return <View style={[styles.pill, responsiveStyle, { backgroundColor: active ? colors.primary : colors.surfaceMuted, borderColor: active ? colors.primary : colors.border }]}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, responsiveStyle, { backgroundColor: active ? colors.primary : colors.surfaceMuted, borderColor: active ? colors.primary : colors.border }, pressed && styles.pressed]}>
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
  const responsive = useResponsiveMetrics();

  return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          {
            paddingHorizontal: responsive.buttonPaddingHorizontal,
            paddingVertical: responsive.buttonPaddingVertical,
            minHeight: responsive.isPhone ? 40 : 0,
          },
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
  const responsive = useResponsiveMetrics();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            color: colors.text,
            paddingHorizontal: responsive.fieldPaddingHorizontal,
            paddingVertical: responsive.fieldPaddingVertical,
            fontSize: responsive.bodyFontSize,
            lineHeight: responsive.bodyLineHeight,
          },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
      />
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
  pageShell: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  page: {
    flexGrow: 1,
    width: '100%',
  },
  pageInner: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  header: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.xl,
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  headerActions: {
    gap: spacing(2),
  },
  headerActionsCompact: {
    width: '100%',
    alignItems: 'stretch',
  },
  pageBody: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
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
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: radius.xxl,
    borderWidth: 1,
  },
  section: {
    width: '100%',
    alignSelf: 'stretch',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(3),
  },
  sectionHeaderCompact: {
    flexDirection: 'column',
  },
  sectionHeading: {
    flex: 1,
  },
  sectionToggle: {
    width: spacing(9),
    height: spacing(9),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
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
  },
});
