import { parseDate, type DateValue } from "@internationalized/date";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  DatePicker,
  Dialog,
  Group,
  Popover,
} from "react-aria-components";

type DateGranularity = "date" | "month";

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  granularity?: DateGranularity;
};

function toDateValue(value: string, granularity: DateGranularity) {
  const normalized = granularity === "month" && /^\d{4}-\d{2}$/.test(value)
    ? `${value}-01`
    : value.slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? parseDate(normalized) : null;
}

function formatDateValue(value: DateValue, granularity: DateGranularity) {
  const date = value.toString();
  return granularity === "month" ? date.slice(0, 7) : date;
}

function formatDisplayValue(value: DateValue | null, placeholder: string, granularity: DateGranularity) {
  if (!value) return placeholder;
  return value.toDate("UTC").toLocaleDateString(undefined, granularity === "month"
    ? { month: "long", year: "numeric", timeZone: "UTC" }
    : { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// Web-only adaptation of Untitled UI's React Aria DatePicker. The native
// sibling keeps the platform date controls for Android and iOS.
export function DatePickerField({ label, value, onChange, placeholder, granularity = "date" }: DatePickerFieldProps) {
  const selectedValue = toDateValue(value, granularity);

  return (
    <DatePicker
      value={selectedValue}
      onChange={(nextValue) => {
        if (nextValue) onChange(formatDateValue(nextValue, granularity));
      }}
      shouldCloseOnSelect
      style={{ display: "grid", gap: 8, position: "relative" }}
    >
      <span style={{ color: "#475569", fontSize: 14, fontWeight: 600 }}>{label}</span>
      <Group>
        <Button
          style={({ isPressed }) => ({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            width: "100%",
            minHeight: 46,
            padding: "10px 14px",
            border: "1px solid #CBD5E1",
            borderRadius: 10,
            background: isPressed ? "#E2E8F0" : "#EEF2F7",
            color: selectedValue ? "#0F172A" : "#475569",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            textAlign: "left",
          })}
        >
          <span>{formatDisplayValue(selectedValue, placeholder, granularity)}</span>
          <span aria-hidden="true" style={{ color: "#64748B", fontSize: 18 }}>⌄</span>
        </Button>
      </Group>
      <Popover
        offset={8}
        style={{ border: "1px solid #CBD5E1", borderRadius: 14, background: "#FFFFFF", boxShadow: "0 16px 32px rgba(15, 23, 42, 0.16)", padding: 16, zIndex: 50 }}
      >
        <Dialog style={{ outline: "none" }}>
          <Calendar>
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <Button slot="previous" aria-label="Previous month" style={calendarButtonStyle}>‹</Button>
              <CalendarHeading style={{ color: "#0F172A", fontSize: 14, fontWeight: 700 }} />
              <Button slot="next" aria-label="Next month" style={calendarButtonStyle}>›</Button>
            </header>
            <CalendarGrid style={{ borderCollapse: "collapse" }}>
              <CalendarGridHeader>
                {(day) => <CalendarHeaderCell style={{ width: 36, height: 28, color: "#64748B", fontSize: 12, fontWeight: 700, textAlign: "center" }}>{day}</CalendarHeaderCell>}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    style={({ isDisabled, isOutsideMonth, isSelected }) => ({
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: isSelected ? "#2563EB" : "transparent",
                      color: isSelected ? "#FFFFFF" : isOutsideMonth || isDisabled ? "#94A3B8" : "#0F172A",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 600,
                      textAlign: "center",
                    })}
                  >
                    {({ formattedDate }) => formattedDate}
                  </CalendarCell>
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </DatePicker>
  );
}

const calendarButtonStyle = {
  width: 32,
  height: 32,
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#334155",
  cursor: "pointer",
  fontSize: 20,
  lineHeight: "28px",
};

export function MonthPickerField(props: Omit<DatePickerFieldProps, "granularity">) {
  return <DatePickerField {...props} granularity="month" />;
}
