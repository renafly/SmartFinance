import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { SelectionShell, SelectionTrigger } from '@/components/selection-shell';

type IconPickerProps = {
  label: string;
  value: string | null;
  onChange: (icon: string | null) => void;
  suggestedIcons?: readonly string[];
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
const ICON_GRID_COLUMNS = 3;

export function IconPicker({
  label,
  value,
  onChange,
  suggestedIcons,
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
    if (!query) {
      return suggestedIcons?.length
        ? [...new Set([...suggestedIcons, ...DEFAULT_ICON_NAMES])].filter((iconName) => ALL_ICON_NAMES.includes(iconName))
        : STARTER_ICON_NAMES;
    }
    return ALL_ICON_NAMES.filter((icon) => icon.toLowerCase().includes(query));
  }, [search, suggestedIcons]);

  function renderIconTile({ item: iconName }: { item: string }) {
    const active = iconName === selectedValue;

    return (
      <Pressable
        accessibilityLabel={iconName}
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
          size={24}
          color={active ? colors.primaryForeground : colors.textSecondary}
        />
      </Pressable>
    );
  }

  return (
    <View style={styles.wrapper}>
      <SelectionTrigger
        label={label}
        valueLabel={selectedValue || placeholder}
        hint={hint}
        placeholder={placeholder}
        iconName={selectedValue ? (selectedValue as any) : 'image-outline'}
        disabled={disabled}
        onPress={() => setOpen(true)}
      />

      <SelectionShell
        visible={open}
        title={label}
        subtitle={hint ?? placeholder}
        closeLabel={closeLabel}
        onClose={() => setOpen(false)}
        bodyScrollable={false}
      >
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

        <FlatList
          key={ICON_GRID_COLUMNS}
          data={filteredIcons}
          keyExtractor={(item) => item}
          renderItem={renderIconTile}
          numColumns={ICON_GRID_COLUMNS}
          initialNumToRender={36}
          maxToRenderPerBatch={36}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          style={styles.grid}
        />
      </SelectionShell>
    </View>
  );
}

const styles: any = StyleSheet.create({
  wrapper: {
    gap: spacing(2),
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
    maxHeight: 340,
  },
  gridContent: {
    gap: spacing(2),
    paddingBottom: spacing(1),
  },
  gridRow: {
    gap: spacing(2),
  },
  iconTile: {
    flex: 1,
    minWidth: 72,
    maxWidth: '32%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(2),
    borderWidth: 1,
    borderRadius: radius.lg,
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
