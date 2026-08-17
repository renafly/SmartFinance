import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePreferencesStore } from '@/stores/preferencesStore';
import { usePrivacyStore } from '@/stores/privacyStore';
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

type PrivacyToggleProps = {
  /**
   * Whether this mount point sits under something that already reserves
   * the top safe-area inset (e.g. `Page`'s content area, which renders
   * below the Drawer/Stack header - headers already pad themselves for
   * the status bar / notch / Dynamic Island). RN's `Modal` renders in its
   * own full-screen native layer with no header, so every mount inside a
   * `Modal` needs the real top inset added on top of the design offset or
   * the button ends up under the status bar/notch. Defaults to true
   * (safe area applied) since most mount points are inside Modals; `Page`
   * is the one call site that opts out to avoid double-padding.
   */
  topInset?: boolean;
};

/**
 * The global "hide values" toggle, factored out so it can be dropped into
 * any full-screen overlay — not just `Page`. React Native's `Modal`
 * component presents in its own native layer above everything else in the
 * JS view tree, so a toggle rendered only inside `Page` becomes unreachable
 * behind any `<Modal>` (create/edit forms, `SelectionShell` pickers, etc.).
 * Every screen that opens a `Modal` over money-bearing content should
 * render this again inside that Modal — see SelectionShell.tsx and the
 * create/edit modals in transactions.tsx, transfers.tsx, savings.tsx, and
 * accounts.tsx for the other mount points.
 */
export function PrivacyToggle({ topInset = true }: PrivacyToggleProps = {}) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const toggleHideValues = usePrivacyStore((state) => state.toggleHideValues);
  const top = spacing(6) + (topInset ? insets.top : 0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: hideValues }}
      accessibilityLabel={hideValues ? t('dashboard.showValues') : t('dashboard.hideValues')}
      onPress={toggleHideValues}
      style={({ pressed }) => [
        styles.privacyToggle,
        { top, borderColor: colors.primary, backgroundColor: colors.primary },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={hideValues ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.primaryForeground} />
    </Pressable>
  );
}

export function Page({ title, subtitle, children, actions, overlay, scrollViewProps }: PageProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const responsive = useResponsiveMetrics();
  // Page's content area already renders below the Drawer/Stack header on
  // native (headerShown is only ever false for the web permanent-drawer
  // layout, where insets are ~0 anyway), so only the bottom inset needs
  // adding here - the header already accounts for the top one. Bottom
  // still needs it: this is a plain ScrollView, and nothing else in the
  // tree reserves room for the iOS home indicator or the Android system
  // nav bar, so the last card would otherwise render underneath it.
  const insets = useSafeAreaInsets();

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
            paddingBottom: responsive.pagePadding + insets.bottom,
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
      {/* Global "hide values" toggle, rendered on every screen that uses
          Page. Fixed at top-right (not bottom-right) deliberately — several
          screens already use `overlay` for a bottom-right FAB or a
          full-width bottom action bar, so top-right is the one corner that
          never collides with a per-screen overlay. Masks every currency
          figure app-wide via the shared privacy store; state always starts
          hidden on login (see src/stores/privacyStore.ts). Note this only
          covers the base page — any screen that opens a native `Modal` over
          this content must render <PrivacyToggle /> again inside that
          Modal, since Modals present in their own layer above this one. */}
      <PrivacyToggle topInset={false} />
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [styles.pill, responsiveStyle, { backgroundColor: active ? colors.primary : colors.surfaceMuted, borderColor: active ? colors.primary : colors.border }, pressed && styles.pressed]}
    >
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
  const { colors, mode } = useTheme();
  const responsive = useResponsiveMetrics();

  // In the Ultra theme, the primary action gets a violet-to-cyan gradient
  // and a soft colored glow instead of a flat fill, to match that theme's
  // more premium, high-contrast look. Every other theme keeps the plain
  // flat-fill button used across the rest of the app.
  const isUltraPrimary = mode === 'ultra' && variant === 'primary';

  const button = (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        {
          paddingHorizontal: responsive.buttonPaddingHorizontal,
          paddingVertical: responsive.buttonPaddingVertical,
          minHeight: responsive.isPhone ? 40 : 0,
        },
        isUltraPrimary
          ? [styles.ultraButton, { borderColor: 'transparent' }]
          : [
              { backgroundColor: variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.surfaceMuted : colors.destructive },
              { borderColor: variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.border : colors.destructive },
            ],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {isUltraPrimary ? (
        <LinearGradient
          colors={[colors.gradientFrom, colors.gradientTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text style={[styles.buttonText, { color: variant === 'primary' ? colors.primaryForeground : variant === 'secondary' ? colors.text : colors.destructiveForeground }]}>
        {label}
      </Text>
    </Pressable>
  );

  // The gradient button clips its own content (overflow: hidden, so the
  // gradient respects the rounded corners), which would also clip its own
  // shadow if the shadow lived on that same view. Wrapping it in an
  // unclipped View lets the glow spread outside the rounded corners instead
  // of being cut off at the edge.
  if (isUltraPrimary) {
    return <View style={[styles.ultraGlowWrap, { shadowColor: colors.glow }]}>{button}</View>;
  }

  return button;
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
  privacyToggle: {
    position: 'absolute',
    right: spacing(6),
    // top is applied inline (see PrivacyToggle component) so it can
    // include the safe-area top inset when rendered inside a Modal.
    zIndex: 10,
    width: spacing(12),
    height: spacing(12),
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  button: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  ultraButton: {
    overflow: 'hidden',
  },
  ultraGlowWrap: {
    borderRadius: radius.md,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
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
