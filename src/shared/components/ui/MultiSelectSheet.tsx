import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, spacing, typography, radius } from "@/shared/theme";

type Option = { id: string; label: string };

type Props = {
  visible: boolean;
  title: string;
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  onClear: () => void;
};

export function MultiSelectSheet({
  visible,
  title,
  options,
  selected,
  onToggle,
  onClose,
  onClear,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClear}>
            <Text style={styles.clearButton}>Clear</Text>
          </Pressable>
        </View>

        <ScrollView>
          {options.map((option) => {
            const isSelected = selected.includes(option.id);
            return (
              <Pressable
                key={option.id}
                onPress={() => onToggle(option.id)}
                style={[styles.row, isSelected && styles.rowSelected]}
              >
                <Text
                  style={[
                    styles.rowLabel,
                    isSelected && styles.rowLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}
                >
                  {isSelected && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={styles.doneButton} onPress={onClose}>
          <Text style={styles.doneLabel}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  sheet: {
    backgroundColor: colors.background,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.text,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    padding: spacing.lg,
    maxHeight: "60%",
    gap: spacing.md,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    ...typography.h4,
    color: colors.text,
  },

  clearButton: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.text,
  },

  rowSelected: {
    backgroundColor: colors.surface,
  },

  rowLabel: {
    ...typography.body,
    color: colors.text,
  },

  rowLabelSelected: {
    fontWeight: "700",
  },

  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 3,
    borderColor: colors.text,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },

  checkboxSelected: {
    backgroundColor: colors.text,
  },

  checkmark: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 14,
  },

  doneButton: {
    backgroundColor: colors.text,
    borderWidth: 3,
    borderColor: colors.text,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },

  doneLabel: {
    ...typography.body,
    color: colors.surface,
    fontWeight: "700",
  },
});