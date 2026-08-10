import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/migrated-page';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

import { styles } from '../ui-styles';

type MenuActionProps = {
  label: string;
  icon: any;
  onPress: () => void;
  colors: any;
  destructive?: boolean;
};

export function MenuAction({ label, icon, onPress, colors, destructive = false }: MenuActionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.menuAction,
        {
          borderColor: destructive ? colors.destructiveBorder : colors.border,
          backgroundColor: destructive ? colors.destructiveSoft : colors.surfaceMuted,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={destructive ? colors.destructive : colors.text} />
      <Text style={{ color: destructive ? colors.destructive : colors.text, fontWeight: typography.fontWeight.bold as any }}>
        {label}
      </Text>
    </Pressable>
  );
}

type RuleMenuProps = {
  item: any;
  onClose: () => void;
  onEdit: () => void;
  onHistory: () => void;
  onToggle: () => void;
  onDelete: () => void;
  t: any;
  colors: any;
  responsive: any;
};

export function RuleMenu({ item, onClose, onEdit, onHistory, onToggle, onDelete, t, colors, responsive }: RuleMenuProps) {
  return (
    <Modal visible={item !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('cancel')}
        />
        <View
          style={[
            styles.menuCard,
            {
              width: responsive.isPhone ? '100%' : spacing(88),
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>{item?.title}</Text>
          <MenuAction label={t('transfers.editScheduled')} icon="create-outline" onPress={onEdit} colors={colors} />
          <MenuAction label={t('transfers.executionHistory')} icon="time-outline" onPress={onHistory} colors={colors} />
          <MenuAction
            label={item?.is_active ? t('transfers.pause') : t('transfers.resume')}
            icon={item?.is_active ? 'pause-outline' : 'play-outline'}
            onPress={onToggle}
            colors={colors}
          />
          <MenuAction label={t('delete')} icon="trash-outline" onPress={onDelete} colors={colors} destructive />
          <Button label={t('cancel')} variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
