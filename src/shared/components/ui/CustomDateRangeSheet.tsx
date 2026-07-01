import { Platform, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { colors, spacing, typography, radius } from "@/shared/theme";
import Button from "@/shared/components/ui/Button";

type Props = {
  visible: boolean;
  initialFrom?: Date;
  initialTo?: Date;
  onApply: (range: { from: Date; to: Date }) => void;
  onClose: () => void;
};

export function CustomDateRangeSheet({
  visible,
  initialFrom,
  initialTo,
  onApply,
  onClose,
}: Props) {
  const [from, setFrom] = useState<Date>(initialFrom ?? new Date());
  const [to, setTo] = useState<Date>(initialTo ?? new Date());

  const handleApply = () => {
    onApply({ from, to });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Custom Date Range</Text>

          <View style={styles.row}>
            <Text style={styles.label}>From</Text>
            <DatePickerField value={from} onChange={setFrom} maximumDate={to} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>To</Text>
            <DatePickerField value={to} onChange={setTo} minimumDate={from} />
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Button title="Apply" onPress={handleApply} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DatePickerField({
  value,
  onChange,
  minimumDate,
  maximumDate,
}: {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  if (Platform.OS === "web") {
    const toInputValue = (d: Date) => d.toISOString().split("T")[0];

    return (
      <input
        type="date"
        value={toInputValue(value)}
        min={minimumDate ? toInputValue(minimumDate) : undefined}
        max={maximumDate ? toInputValue(maximumDate) : undefined}
        onChange={(e) => {
          if (e.target.value) {
            const [year, month, day] = e.target.value.split("-").map(Number);
            onChange(new Date(year, month - 1, day));
          }
        }}
        style={{
          fontFamily: "inherit",
          fontSize: 14,
          padding: 8,
          borderRadius: 8,
          border: `1px solid ${colors.text}`,
          color: colors.text,
          background: colors.surface,
        }}
      />
    );
  }

  const DateTimePicker = require("@react-native-community/datetimepicker").default;
  return (
    <DateTimePicker
      value={value}
      mode="date"
      display="compact"
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      onChange={(_: unknown, date?: Date) => date && onChange(date)}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.lg },
  title: { ...typography.h3, color: colors.text },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { ...typography.body, color: colors.text, fontWeight: "700" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.md, alignItems: "center" },
  cancelButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  cancelLabel: { ...typography.body, color: colors.textMuted, fontWeight: "700" },
});