import { Ionicons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, PrivacyToggle } from "@/components/migrated-page";
import { radius } from "@/theme/radius";
import { useResponsiveMetrics } from "@/theme/responsive";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

type SelectionTriggerProps = {
  label: string;
  valueLabel: string;
  hint?: string;
  placeholder: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  onPress: () => void;
};

export function SelectionTrigger({
  label,
  valueLabel,
  hint,
  placeholder,
  iconName = "chevron-down-outline",
  disabled,
  onPress,
}: SelectionTriggerProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const isEmpty = valueLabel === placeholder;

  return (
    <View style={styles.triggerWrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
            padding: responsive.isPhone ? spacing(3) : spacing(3.5),
            gap: responsive.isPhone ? spacing(2) : spacing(3),
          },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <View style={styles.triggerIcon}>
          <Ionicons name={iconName} size={16} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1, gap: spacing(1) }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.triggerValue,
              { color: isEmpty ? colors.textSecondary : colors.text },
            ]}
          >
            {valueLabel}
          </Text>
          {hint ? (
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              style={[styles.triggerHint, { color: colors.textSecondary }]}
            >
              {hint}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-down-outline" size={16} color={colors.link} />
      </Pressable>
    </View>
  );
}

type SelectionShellProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  closeLabel: string;
  onClose: () => void;
  bodyScrollable?: boolean;
  /** An optional confirm/save action rendered in the same fixed footer row
   * as the close button (outside the scrollable body), so the two sit next
   * to each other instead of the action scrolling away with the content. */
  primaryAction?: { label: string; onPress: () => void; disabled?: boolean };
  children: ReactNode;
};

export function SelectionShell({
  visible,
  title,
  subtitle,
  closeLabel,
  onClose,
  bodyScrollable = true,
  primaryAction,
  children,
}: SelectionShellProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  // On phone this backdrop docks the card to the bottom of the screen
  // (a bottom sheet), so its bottom padding needs the real safe-area
  // inset added or the close/confirm row ends up under the iOS home
  // indicator or the Android system nav bar. Centered (tablet/desktop)
  // layouts get the same treatment for consistency - harmless there since
  // insets are ~0 on those form factors anyway.
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalBackdrop,
          {
            backgroundColor: colors.overlay,
            padding: responsive.modalPadding,
            paddingTop: responsive.modalPadding + insets.top,
            paddingBottom: responsive.modalPadding + insets.bottom,
            justifyContent: responsive.isPhone ? "flex-end" : "center",
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {/* SelectionShell backs nearly every picker/dropdown in the app
            (account/category/member selects, etc.), and RN's Modal renders
            in its own layer above Page — so the global toggle has to be
            re-mounted here too, or it's unreachable while any picker is
            open. See PrivacyToggle's doc comment in migrated-page.tsx. */}
        <PrivacyToggle />
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              padding: responsive.isPhone ? spacing(3.5) : spacing(4.5),
              borderRadius: responsive.isPhone ? radius.lg : radius.xl,
              maxHeight: responsive.isPhone ? "86%" : "90%",
              width: "100%",
              maxWidth: responsive.isPhone ? undefined : spacing(160),
              alignSelf: "center",
              overflow: "hidden",
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {bodyScrollable ? (
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.modalBodyContent}>{children}</View>
          )}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: primaryAction ? "space-between" : "flex-end",
              gap: spacing(2),
            }}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close-outline" size={16} color={colors.text} />
              <Text style={[styles.closeButtonText, { color: colors.text }]}>
                {closeLabel}
              </Text>
            </Pressable>
            {primaryAction ? (
              <Button
                label={primaryAction.label}
                onPress={primaryAction.onPress}
                disabled={primaryAction.disabled}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

type OptionRowProps = {
  title: string;
  subtitle?: string;
  rightLabel?: string;
  active?: boolean;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
};

export function SelectionOptionRow({
  title,
  subtitle,
  rightLabel,
  active,
  onPress,
  iconName = "ellipse-outline",
  danger,
}: OptionRowProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        {
          backgroundColor: active ? colors.primary : colors.surfaceMuted,
          borderColor: danger
            ? colors.destructiveBorder
            : active
              ? colors.primary
              : colors.border,
          padding: responsive.isPhone ? spacing(3) : spacing(3.5),
          gap: responsive.isPhone ? spacing(2) : spacing(3),
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={iconName}
        size={18}
        color={
          active
            ? colors.primaryForeground
            : danger
              ? colors.destructive
              : colors.textSecondary
        }
      />
      <View style={{ flex: 1, gap: spacing(1) }}>
        <Text
          style={[
            styles.optionTitle,
            { color: active ? colors.primaryForeground : colors.text },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.optionSubtitle,
              {
                color: active ? colors.primaryForeground : colors.textSecondary,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.optionTrailing}>
        {rightLabel ? (
          <Text
            style={[
              styles.optionRightLabel,
              { color: active ? colors.primaryForeground : colors.text },
            ]}
          >
            {rightLabel}
          </Text>
        ) : null}
        <Text
          style={[
            styles.optionCheck,
            { color: active ? colors.primaryForeground : colors.textSecondary },
          ]}
        >
          {active ? "✓" : ""}
        </Text>
      </View>
    </Pressable>
  );
}

type DropdownItem = {
  key: string;
  label: string;
  subtitle?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  onPress: () => void;
};

type DropdownMenuProps = {
  visible: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  items: DropdownItem[];
};

export function DropdownMenu({
  visible,
  title,
  closeLabel,
  onClose,
  items,
}: DropdownMenuProps) {
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();

  return (
    <SelectionShell
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
    >
      <View style={{ gap: spacing(2.5) }}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.dropdownItem,
              {
                backgroundColor: item.danger
                  ? colors.destructiveSoft
                  : colors.surfaceMuted,
                borderColor: item.danger
                  ? colors.destructiveBorder
                  : colors.border,
                padding: responsive.isPhone ? spacing(3) : spacing(3.5),
                gap: responsive.isPhone ? spacing(2) : spacing(3),
              },
              pressed && styles.pressed,
            ]}
          >
            {item.iconName ? (
              <Ionicons
                name={item.iconName}
                size={16}
                color={item.danger ? colors.destructive : colors.text}
              />
            ) : null}
            <View style={{ flex: 1, gap: spacing(0.75) }}>
              <Text
                style={[
                  styles.dropdownLabel,
                  { color: item.danger ? colors.destructive : colors.text },
                ]}
              >
                {item.label}
              </Text>
              {item.subtitle ? (
                <Text
                  style={[
                    styles.dropdownSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </SelectionShell>
  );
}

type MultiSelectShellProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  closeLabel: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  children: ReactNode;
};

export function MultiSelectShell({
  visible,
  title,
  subtitle,
  closeLabel,
  confirmLabel,
  onClose,
  onConfirm,
  confirmDisabled,
  children,
}: MultiSelectShellProps) {
  // Close + Confirm live in SelectionShell's own fixed footer (via
  // primaryAction) instead of a second button row rendered here — this
  // used to render both: this component's own Close/Confirm row *and*
  // SelectionShell's default Close button underneath it, so every
  // multi-select picker in the app showed two Close buttons in two
  // different places (one scrolling with the content, one pinned below).
  return (
    <SelectionShell
      visible={visible}
      title={title}
      subtitle={subtitle}
      closeLabel={closeLabel}
      onClose={onClose}
      primaryAction={{ label: confirmLabel, onPress: onConfirm, disabled: confirmDisabled }}
    >
      {children}
    </SelectionShell>
  );
}

const styles = StyleSheet.create({
  triggerWrapper: {
    gap: spacing(2),
  },
  label: {
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize[13],
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  triggerIcon: {
    width: spacing(9),
    height: spacing(9),
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerValue: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold,
  },
  triggerHint: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[17],
  },
  modalBackdrop: {
    flex: 1,
  },
  modalCard: {
    gap: spacing(3.5),
    borderWidth: 1,
  },
  modalBody: {
    flexGrow: 1,
  },
  modalBodyContent: {
    gap: spacing(3),
  },
  modalHeader: {
    gap: spacing(1),
  },
  modalTitle: {
    fontSize: typography.fontSize[20],
    fontWeight: typography.fontWeight.extraBold,
  },
  modalSubtitle: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold,
  },
  optionSubtitle: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  optionCheck: {
    fontSize: typography.fontSize[18],
    fontWeight: typography.fontWeight.extraBold,
  },
  optionTrailing: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: spacing(0.5),
  },
  optionRightLabel: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.extraBold,
    fontVariant: ["tabular-nums"],
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  dropdownLabel: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold,
  },
  dropdownSubtitle: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  closeButton: {
    alignSelf: "flex-end",
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  closeButtonText: {
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.bold,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
});
