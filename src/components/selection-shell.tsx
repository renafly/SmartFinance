import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/migrated-page';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

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
  iconName = 'chevron-down-outline',
  disabled,
  onPress,
}: SelectionTriggerProps) {
  const { colors } = useTheme();
  const isEmpty = valueLabel === placeholder;

  return (
    <View style={styles.triggerWrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <View style={styles.triggerIcon}>
          <Ionicons name={iconName} size={16} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1, gap: spacing(1) }}>
          <Text style={[styles.triggerValue, { color: isEmpty ? colors.textSecondary : colors.text }]}>
            {valueLabel}
          </Text>
          {hint ? <Text style={[styles.triggerHint, { color: colors.textSecondary }]}>{hint}</Text> : null}
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
  children: ReactNode;
};

export function SelectionShell({
  visible,
  title,
  subtitle,
  closeLabel,
  onClose,
  children,
}: SelectionShellProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          </View>
          {children}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="close-outline" size={16} color={colors.text} />
            <Text style={[styles.closeButtonText, { color: colors.text }]}>{closeLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type OptionRowProps = {
  title: string;
  subtitle?: string;
  active?: boolean;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
};

export function SelectionOptionRow({
  title,
  subtitle,
  active,
  onPress,
  iconName = 'ellipse-outline',
  danger,
}: OptionRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        {
          backgroundColor: active ? colors.primary : colors.surfaceMuted,
          borderColor: danger ? colors.destructiveBorder : active ? colors.primary : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={iconName}
        size={18}
        color={active ? colors.primaryForeground : danger ? colors.destructive : colors.textSecondary}
      />
      <View style={{ flex: 1, gap: spacing(1) }}>
        <Text style={[styles.optionTitle, { color: active ? colors.primaryForeground : colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.optionSubtitle, { color: active ? colors.primaryForeground : colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.optionCheck, { color: active ? colors.primaryForeground : colors.textSecondary }]}>
        {active ? '✓' : ''}
      </Text>
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

export function DropdownMenu({ visible, title, closeLabel, onClose, items }: DropdownMenuProps) {
  const { colors } = useTheme();

  return (
    <SelectionShell visible={visible} title={title} closeLabel={closeLabel} onClose={onClose}>
      <View style={{ gap: spacing(2.5) }}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.dropdownItem,
              {
                backgroundColor: item.danger ? colors.destructiveSoft : colors.surfaceMuted,
                borderColor: item.danger ? colors.destructiveBorder : colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            {item.iconName ? (
              <Ionicons name={item.iconName} size={16} color={item.danger ? colors.destructive : colors.text} />
            ) : null}
            <View style={{ flex: 1, gap: spacing(0.75) }}>
              <Text style={[styles.dropdownLabel, { color: item.danger ? colors.destructive : colors.text }]}>
                {item.label}
              </Text>
              {item.subtitle ? (
                <Text style={[styles.dropdownSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
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
  return (
    <SelectionShell visible={visible} title={title} subtitle={subtitle} closeLabel={closeLabel} onClose={onClose}>
      <View style={{ gap: spacing(3) }}>
        {children}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing(2) }}>
          <Button label={closeLabel} variant="secondary" onPress={onClose} />
          <Button label={confirmLabel} onPress={onConfirm} disabled={confirmDisabled} />
        </View>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  triggerIcon: {
    width: spacing(9),
    height: spacing(9),
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'center',
    padding: spacing(5),
  },
  modalCard: {
    gap: spacing(3.5),
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing(4.5),
    maxHeight: '90%',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    padding: spacing(3.5),
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
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    padding: spacing(3.5),
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
    alignSelf: 'flex-end',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
