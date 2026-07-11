import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/migrated-page";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type DateGranularity = "date" | "month";

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  granularity?: DateGranularity;
};

function parseDateValue(value: string, granularity: DateGranularity) {
  const expression = granularity === "month"
    ? /^(\d{4})-(\d{2})$/
    : /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = value.match(expression);
  if (!match) return null;

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, granularity === "month" ? 1 : Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateValue(date: Date, granularity: DateGranularity) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  if (granularity === "month") return `${year}-${month}`;
  return `${year}-${month}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDisplayValue(value: string, granularity: DateGranularity) {
  const date = parseDateValue(value, granularity);
  if (!date) return value;
  return date.toLocaleDateString(undefined, granularity === "month"
    ? { month: "long", year: "numeric" }
    : { day: "numeric", month: "short", year: "numeric" });
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

export function DatePickerField({ label, value, onChange, placeholder, granularity = "date" }: DatePickerFieldProps) {
  const { colors } = useTheme();
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseDateValue(value, granularity) ?? new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateValue(value, granularity) ?? new Date());

  useEffect(() => {
    if (!open) return;
    const selectedDate = parseDateValue(value, granularity) ?? new Date();
    setDraftDate(selectedDate);
    setCalendarMonth(selectedDate);
  }, [granularity, open, value]);

  const selectedDate = parseDateValue(value, granularity);
  const isWeb = Platform.OS === "web";
  const monthName = calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, day) =>
    new Date(2024, 0, day + 7).toLocaleDateString(undefined, { weekday: "narrow" }),
  );
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const leadingEmptyDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const calendarDays = Array.from({ length: leadingEmptyDays + daysInMonth }, (_, index) =>
    index < leadingEmptyDays ? null : index - leadingEmptyDays + 1,
  );

  function selectWebDate(date: Date) {
    onChange(formatDateValue(date, granularity));
    setOpen(false);
  }

  return (
    <View style={{ gap: spacing(2) }}>
      <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold } as any}>{label}</Text>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing(3.5), paddingVertical: spacing(3), borderRadius: radius.mdPlus, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border }}
      >
        <Text style={{ color: value.trim() ? colors.text : colors.textSecondary, fontWeight: typography.fontWeight.bold } as any}>
          {value.trim() ? formatDisplayValue(value, granularity) : placeholder}
        </Text>
        <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.bold } as any}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      {open ? (
        <View style={{ gap: spacing(2), padding: spacing(3), borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border }}>
          {isWeb ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Pressable onPress={() => setCalendarMonth((current) => addMonths(current, granularity === "month" ? -12 : -1))} style={{ padding: spacing(1.5) }}>
                  <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold } as any}>‹</Text>
                </Pressable>
                <Text style={{ color: colors.text, fontWeight: typography.fontWeight.extraBold } as any}>
                  {granularity === "month" ? calendarMonth.getFullYear() : monthName}
                </Text>
                <Pressable onPress={() => setCalendarMonth((current) => addMonths(current, granularity === "month" ? 12 : 1))} style={{ padding: spacing(1.5) }}>
                  <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold } as any}>›</Text>
                </Pressable>
              </View>
              {granularity === "month" ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(1) }}>
                  {Array.from({ length: 12 }, (_, month) => {
                    const monthDate = new Date(calendarMonth.getFullYear(), month, 1);
                    const selected = selectedDate?.getFullYear() === monthDate.getFullYear() && selectedDate.getMonth() === month;
                    return (
                      <Pressable
                        key={month}
                        onPress={() => selectWebDate(monthDate)}
                        style={{ width: "31%", paddingVertical: spacing(2), borderRadius: radius.md, backgroundColor: selected ? colors.primary : colors.surface, alignItems: "center" }}
                      >
                        <Text style={{ color: selected ? colors.primaryForeground : colors.text, fontWeight: typography.fontWeight.bold } as any}>
                          {monthDate.toLocaleDateString(undefined, { month: "short" })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: "row" }}>
                    {weekdays.map((day) => <Text key={day} style={{ flex: 1, textAlign: "center", color: colors.textSecondary, fontWeight: typography.fontWeight.bold } as any}>{day}</Text>)}
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {calendarDays.map((day, index) => {
                      if (day === null) return <View key={`empty-${index}`} style={{ width: "14.285%", aspectRatio: 1 }} />;
                      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                      const selected = selectedDate ? isSameDay(selectedDate, date) : false;
                      return (
                        <Pressable
                          key={day}
                          onPress={() => selectWebDate(date)}
                          style={{ width: "14.285%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: selected ? colors.primary : "transparent" }}
                        >
                          <Text style={{ color: selected ? colors.primaryForeground : colors.text, fontWeight: selected ? typography.fontWeight.extraBold : typography.fontWeight.semibold } as any}>{day}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          ) : (
            <DateTimePicker
              value={draftDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              presentation={Platform.OS === "android" ? "dialog" : "inline"}
              onValueChange={(_, nextDate) => {
                if (!nextDate) return;
                setDraftDate(nextDate);
                if (Platform.OS === "android") {
                  onChange(formatDateValue(nextDate, granularity));
                  setOpen(false);
                }
              }}
              onDismiss={() => setOpen(false)}
            />
          )}
          {!isWeb && Platform.OS !== "android" ? (
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: spacing(2) }}>
              <Button label={t("cancel")} variant="secondary" onPress={() => setOpen(false)} />
              <Button label={t("done")} onPress={() => { onChange(formatDateValue(draftDate, granularity)); setOpen(false); }} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function MonthPickerField(props: Omit<DatePickerFieldProps, "granularity">) {
  return <DatePickerField {...props} granularity="month" />;
}
