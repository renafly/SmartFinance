import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";

import { Button } from "@/components/migrated-page";
import { DatePickerField as SharedDatePickerField } from "@/components/date-picker-field";
import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

export function parseDateInputValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const nextDate = new Date(year, month, day);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

export function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(
    () => parseDateInputValue(value) ?? new Date(),
  );

  if (Platform.OS === "web") {
    return (
      <SharedDatePickerField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    );
  }

  return (
    <View style={{ gap: spacing(2) }}>
      <Text
        style={
          {
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.semibold as any,
          } as any
        }
      >
        {label}
      </Text>
      <Pressable
        onPress={() => {
          if (!open) {
            setDraftDate(parseDateInputValue(value) ?? new Date());
          }
          setOpen((current) => !current);
        }}
        accessibilityRole="button"
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing(3.5),
          paddingVertical: spacing(3),
          borderRadius: radius.mdPlus,
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={
            {
              color:
                value.trim().length > 0 ? colors.text : colors.textSecondary,
              fontWeight: typography.fontWeight.bold as any,
            } as any
          }
        >
          {value.trim().length > 0 ? value : placeholder}
        </Text>
        <Text
          style={
            {
              color: colors.textSecondary,
              fontWeight: typography.fontWeight.bold as any,
            } as any
          }
        >
          {open ? "▴" : "▾"}
        </Text>
      </Pressable>
      {open ? (
        <View
          style={{
            gap: spacing(2),
            padding: spacing(3),
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <DateTimePicker
            value={draftDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            presentation={Platform.OS === "android" ? "dialog" : "inline"}
            onValueChange={(_, date) => {
              if (!date) return;
              setDraftDate(date);
              if (Platform.OS === "android") {
                onChange(formatDateInputValue(date));
                setOpen(false);
              }
            }}
            onDismiss={() => setOpen(false)}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: spacing(2),
            }}
          >
            <Button
              label={t("cancel")}
              variant="secondary"
              onPress={() => setOpen(false)}
            />
            <Button
              label={t("done")}
              onPress={() => {
                onChange(formatDateInputValue(draftDate));
                setOpen(false);
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function DateFilterField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation("common");

  return (
    <View style={{ gap: spacing(1.5) }}>
      <DatePickerField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {value ? (
        <Pressable
          onPress={() => onChange("")}
          accessibilityRole="button"
          accessibilityLabel={t("clear")}
          style={({ pressed }) => [
            {
              alignSelf: "flex-start",
              paddingHorizontal: spacing(2.5),
              paddingVertical: spacing(1.5),
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceMuted,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text
            style={
              {
                color: colors.textSecondary,
                fontSize: typography.fontSize[12],
                fontWeight: typography.fontWeight.semibold as any,
              } as any
            }
          >
            {t("clear")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
