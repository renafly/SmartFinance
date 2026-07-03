import { Modal, Platform, Pressable, View } from "react-native";
import { useEffect, useState } from "react";
import { Text } from "react-native-paper";

import { DateField } from "@/shared/components/ui/DateField";
import { colors, spacing } from "@/shared/theme";

type Props = {
  visible: boolean;
  /** ISO date string YYYY-MM-DD */
  initialFrom?: string;
  /** ISO date string YYYY-MM-DD */
  initialTo?: string;
  onApply: (range: { from: string; to: string }) => void;
  onClose: () => void;
};

const todayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function CustomDateRangeSheet({
  visible,
  initialFrom,
  initialTo,
  onApply,
  onClose,
}: Props) {
  const [from, setFrom] = useState<string>(initialFrom ?? todayISO());
  const [to, setTo] = useState<string>(initialTo ?? todayISO());

  useEffect(() => {
    if (visible) {
      setFrom(initialFrom ?? todayISO());
      setTo(initialTo ?? todayISO());
    }
  }, [visible, initialFrom, initialTo]);

  const isWeb = Platform.OS === "web";

  const handleApply = () => {
    onApply({ from, to });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(17, 17, 17, 0.4)",
          justifyContent: isWeb ? "center" : "flex-end",
          alignItems: "center",
          padding: isWeb ? spacing.lg : 0,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: isWeb ? 480 : undefined,
            backgroundColor: colors.surface,
            borderWidth: 3,
            borderColor: colors.text,
            padding: spacing.lg,
            paddingBottom: spacing.xl,
          }}
        >
          <Text variant="headlineSmall" style={{ marginBottom: spacing.lg, fontWeight: "900" }}>
            Custom Date Range
          </Text>

          <View style={{ marginBottom: spacing.lg, gap: spacing.lg }}>
            <DateField label="From" value={from} onChange={setFrom} maximumDate={new Date(to)} />
            <DateField label="To" value={to} onChange={setTo} minimumDate={new Date(from)} />
          </View>

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                borderWidth: 3,
                borderColor: colors.text,
                backgroundColor: colors.surface,
                paddingVertical: spacing.md,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900" }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleApply}
              style={{
                flex: 1,
                borderWidth: 3,
                borderColor: colors.text,
                backgroundColor: colors.primary,
                paddingVertical: spacing.md,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900" }}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}