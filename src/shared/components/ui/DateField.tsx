import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { colors, spacing } from "@/shared/theme";

type Props = {
  label?: string;
  /** Value stored as an ISO date string: YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

const toISO = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromISO = (value: string): Date => {
  if (value) {
    const [year, month, day] = value.split("-").map(Number);
    if (year && month && day) {
      return new Date(year, month - 1, day);
    }
  }
  return new Date();
};

const formatDisplay = (value: string): string => {
  const date = fromISO(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const boxStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  minHeight: 56,
  justifyContent: "center",
} as const;

export function DateField({
  label,
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const content = (() => {
    if (Platform.OS === "web") {
      return (
        <input
          type="date"
          value={value}
          min={minimumDate ? toISO(minimumDate) : undefined}
          max={maximumDate ? toISO(maximumDate) : undefined}
          onChange={(e) => onChange(e.target.value)}
          style={{
            fontFamily: "inherit",
            fontSize: 16,
            paddingLeft: spacing.md,
            paddingRight: spacing.md,
            minHeight: 56,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: colors.border,
            color: colors.text,
            background: colors.surface,
            boxSizing: "border-box",
            width: "100%",
          }}
        />
      );
    }

    const DateTimePicker = require("@react-native-community/datetimepicker").default;

    return (
      <>
        <Pressable onPress={() => setShowPicker(true)} style={boxStyle}>
          <Text style={{ color: colors.text }}>{formatDisplay(value)}</Text>
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={fromISO(value)}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(event: { type?: string }, date?: Date) => {
              // Android fires with type 'dismissed' when cancelled.
              if (Platform.OS === "android") {
                setShowPicker(false);
              }
              if (event?.type === "dismissed") {
                return;
              }
              if (date) {
                onChange(toISO(date));
              }
              if (Platform.OS === "ios") {
                // Keep the inline picker open on iOS; user taps elsewhere to close.
              }
            }}
          />
        )}
        {Platform.OS === "ios" && showPicker && (
          <Pressable onPress={() => setShowPicker(false)} style={{ paddingVertical: spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: "700", textAlign: "right" }}>Done</Text>
          </Pressable>
        )}
      </>
    );
  })();

  return (
    <View style={{ gap: spacing.sm, flex: 1 }}>
      {label ? <Text style={{ fontWeight: "700" }}>{label}</Text> : null}
      {content}
      {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}
