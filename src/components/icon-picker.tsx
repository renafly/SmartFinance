import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type IconPickerProps = {
  label: string;
  value: string | null;
  onChange: (icon: string | null) => void;
  placeholder?: string;
  hint?: string;
  closeLabel?: string;
  searchPlaceholder?: string;
  noneLabel?: string;
  disabled?: boolean;
};

const ALL_ICON_NAMES = Object.keys((Ionicons as any).glyphMap ?? {}).sort();
const DEFAULT_ICON_NAMES = [
  'pricetag-outline',
  'wallet-outline',
  'cash-outline',
  'card-outline',
  'cart-outline',
  'basket-outline',
  'home-outline',
  'briefcase-outline',
  'build-outline',
  'train-outline',
  'airplane-outline',
  'car-outline',
  'school-outline',
  'medical-outline',
  'fitness-outline',
  'restaurant-outline',
  'gift-outline',
  'leaf-outline',
  'flower-outline',
  'heart-outline',
  'checkmark-done-outline',
  'people-outline',
  'person-outline',
  'settings-outline',
  'bookmark-outline',
  'star-outline',
  'time-outline',
  'calendar-outline',
  'folder-outline',
  'layers-outline',
  'pie-chart-outline',
  'trending-up-outline',
  'shield-checkmark-outline',
] as const;

const STARTER_ICON_NAMES = [...new Set([...DEFAULT_ICON_NAMES, ...ALL_ICON_NAMES])];

export function IconPicker({
  label,
  value,
  onChange,
  placeholder = 'Pick an icon',
  hint,
  closeLabel = 'Close',
  searchPlaceholder = 'Search icons',
  noneLabel = 'No icon',
  disabled,
}: IconPickerProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedValue = value ?? '';
  const filteredIcons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return STARTER_ICON_NAMES.slice(0, 180);
    return ALL_ICON_NAMES.filter((icon) => icon.toLowerCase().includes(query)).slice(0, 180);
  }, [search]);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.selector,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <View style={styles.selectorIcon}>
          {selectedValue ? (
            <Ionicons name={selectedValue as any} size={18} color={colors.primary} />
          ) : (
            <Ionicons name="image-outline" size={18} color={colors.textSecondary} />
          )}
        </View>
        <View style={{ flex: 1, gap: spacing(1) }}>
          <Text style={[styles.value, { color: colors.text }]}>{selectedValue || placeholder}</Text>
          {hint ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text> : null}
        </View>
        <Ionicons name="chevron-down-outline" size={16} color={colors.link} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="images-outline" size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>
              </View>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{hint ?? placeholder}</Text>
            </View>

            <View style={{ gap: spacing(2) }}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.searchInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
                ]}
              />
              <Pressable
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.noneButton,
                  { backgroundColor: !selectedValue ? colors.primary : colors.surfaceMuted, borderColor: !selectedValue ? colors.primary : colors.border },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close-circle-outline" size={18} color={!selectedValue ? colors.primaryForeground : colors.textSecondary} />
                <Text style={[styles.noneLabel, { color: !selectedValue ? colors.primaryForeground : colors.text }]}>{noneLabel}</Text>
              </Pressable>
            </View>

            <View style={styles.grid}>
              {filteredIcons.map((iconName) => {
                const active = iconName === selectedValue;
                return (
                  <Pressable
                    key={iconName}
                    onPress={() => {
                      onChange(iconName);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.iconTile,
                      { backgroundColor: active ? colors.primary : colors.surfaceMuted, borderColor: active ? colors.primary : colors.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name={iconName as any}
                      size={20}
                      color={active ? colors.primaryForeground : colors.textSecondary}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.iconName,
                        { color: active ? colors.primaryForeground : colors.textSecondary },
                      ]}
                    >
                      {iconName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setOpen(false)}
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
    </View>
  );
}

const styles: any = StyleSheet.create({
  wrapper: {
    gap: spacing(2),
  },
  label: {
    fontWeight: typography.fontWeight.semibold as any,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  selectorIcon: {
    width: spacing(9),
    height: spacing(9),
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold as any,
  },
  hint: {
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
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  modalTitle: {
    fontSize: typography.fontSize[20],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  modalSubtitle: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    fontSize: typography.fontSize[14],
  },
  noneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    padding: spacing(3),
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  noneLabel: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.semibold as any,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    maxHeight: 340,
  },
  iconTile: {
    width: '31%',
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  iconName: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.semibold as any,
    textAlign: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  closeButtonText: {
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.bold as any,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
});
