import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useTheme } from "@/theme/ThemeProvider";

type DateGranularity = "date" | "month";

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  granularity?: DateGranularity;
};

function parseDateValue(value: string, granularity: DateGranularity) {
  const expression = granularity === "month" ? /^(\d{4})-(\d{2})$/ : /^(\d{4})-(\d{2})-(\d{2})$/;
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
  if (!date) return null;
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

// A handful of small hover/entrance transitions that are awkward to express
// with plain inline styles (no pseudo-classes) - injected once, shared by
// every instance of the picker on the page.
let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-smf-date-picker", "");
  style.textContent = `
    .smf-dp-trigger:hover { filter: brightness(0.98); }
    .smf-dp-nav { transition: opacity 120ms ease, transform 80ms ease; }
    .smf-dp-nav:hover { opacity: 0.75; }
    .smf-dp-nav:active { transform: scale(0.92); }
    .smf-dp-cell { transition: background-color 120ms ease, color 120ms ease, transform 80ms ease; }
    .smf-dp-cell:hover { transform: scale(1.08); }
    .smf-dp-panel { animation: smf-dp-in 140ms ease; }
    @keyframes smf-dp-in {
      from { opacity: 0; transform: translateY(-6px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// Web-only date field: a small custom popover calendar, portaled to
// <body> so it always floats above the "Add movement" modal instead of
// being clipped by its scroll area. The previous custom calendar here was
// built on react-aria-components and had a bug where its internal
// "visible month" state would silently reset mid-navigation - pressing
// ‹ a couple of times would snap back to the current month. That state
// is now owned entirely by this component (calendarMonth below) and is
// only re-synced when the popover transitions from closed to open, never
// on renders that merely happen while it's already open - the same fix
// already proven out on the native calendar in date-picker-field.tsx.
export function DatePickerField({
  label,
  value,
  onChange,
  placeholder,
  granularity = "date",
}: DatePickerFieldProps) {
  const { colors } = useTheme();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateValue(value, granularity) ?? new Date());
  const wasOpenRef = useRef(false);

  useEffect(ensureStyles, []);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setCalendarMonth(parseDateValue(value, granularity) ?? new Date());
    }
    wasOpenRef.current = open;
  }, [granularity, open, value]);

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = granularity === "month" ? 260 : 300;
      const panelHeight = granularity === "month" ? 220 : 360;
      const left = Math.min(Math.max(rect.left, 8), window.innerWidth - panelWidth - 8);
      const fitsBelow = rect.bottom + panelHeight + 8 <= window.innerHeight;
      const top = fitsBelow
        ? rect.bottom + 8
        : Math.max(rect.top - panelHeight - 8, 8);
      setPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open, granularity]);

  useEffect(() => {
    if (!open) return;

    function handleScroll(event: Event) {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("scroll", handleScroll, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedDate = parseDateValue(value, granularity);
  const displayValue = formatDisplayValue(value, granularity);
  const monthLabel = calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, day) =>
    new Date(2024, 0, day + 7).toLocaleDateString(undefined, { weekday: "narrow" }),
  );
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const leadingEmptyDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const calendarDays = Array.from({ length: leadingEmptyDays + daysInMonth }, (_, index) =>
    index < leadingEmptyDays ? null : index - leadingEmptyDays + 1,
  );

  function selectDate(date: Date) {
    onChange(formatDateValue(date, granularity));
    setOpen(false);
  }

  const navButtonStyle: CSSProperties = {
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    background: colors.surface,
    color: colors.text,
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <div style={{ display: "grid", gap: 8, position: "relative" }}>
      <span style={{ color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="smf-dp-trigger"
        onClick={() => setOpen((current) => !current)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          width: "100%",
          minHeight: 46,
          padding: "10px 14px",
          border: `1px solid ${open ? colors.primary : colors.border}`,
          borderRadius: 10,
          background: colors.surfaceMuted,
          color: displayValue ? colors.text : colors.textSecondary,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          textAlign: "left",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {displayValue ?? placeholder}
        </span>
        <span
          aria-hidden="true"
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 120ms ease",
          }}
        >
          ▾
        </span>
      </button>
      {open && position && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                onClick={() => setOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 2147483646 }}
              />
              <div
                ref={panelRef}
                className="smf-dp-panel"
                style={{
                  position: "fixed",
                  top: position.top,
                  left: position.left,
                  zIndex: 2147483647,
                  minWidth: granularity === "month" ? 260 : 300,
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  boxShadow: `0 16px 32px ${colors.overlay}`,
                  padding: 16,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button
                    type="button"
                    className="smf-dp-nav"
                    aria-label="Previous"
                    onClick={() => setCalendarMonth((current) => addMonths(current, granularity === "month" ? -12 : -1))}
                    style={navButtonStyle}
                  >
                    ‹
                  </button>
                  <span style={{ color: colors.text, fontSize: 14, fontWeight: 800 }}>
                    {granularity === "month" ? calendarMonth.getFullYear() : monthLabel}
                  </span>
                  <button
                    type="button"
                    className="smf-dp-nav"
                    aria-label="Next"
                    onClick={() => setCalendarMonth((current) => addMonths(current, granularity === "month" ? 12 : 1))}
                    style={navButtonStyle}
                  >
                    ›
                  </button>
                </div>
                {granularity === "month" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {Array.from({ length: 12 }, (_, month) => {
                      const monthDate = new Date(calendarMonth.getFullYear(), month, 1);
                      const selected = selectedDate
                        ? selectedDate.getFullYear() === monthDate.getFullYear() && selectedDate.getMonth() === month
                        : false;
                      return (
                        <button
                          key={month}
                          type="button"
                          className="smf-dp-cell"
                          onClick={() => selectDate(monthDate)}
                          style={{
                            padding: "10px 0",
                            borderRadius: 8,
                            border: "none",
                            background: selected ? colors.primary : "transparent",
                            color: selected ? colors.primaryForeground : colors.text,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {monthDate.toLocaleDateString(undefined, { month: "short" })}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                      {weekdays.map((day, index) => (
                        <span
                          key={`${day}-${index}`}
                          style={{
                            textAlign: "center",
                            color: colors.textSecondary,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                      {calendarDays.map((day, index) => {
                        if (day === null) return <div key={`empty-${index}`} style={{ width: 36, height: 36 }} />;
                        const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                        const selected = selectedDate ? isSameDay(selectedDate, date) : false;
                        const today = isSameDay(date, new Date());
                        return (
                          <button
                            key={day}
                            type="button"
                            className="smf-dp-cell"
                            onClick={() => selectDate(date)}
                            style={{
                              width: 36,
                              height: 36,
                              justifySelf: "center",
                              borderRadius: 8,
                              border: today && !selected ? `1px solid ${colors.primary}` : "none",
                              background: selected ? colors.primary : "transparent",
                              color: selected ? colors.primaryForeground : colors.text,
                              fontWeight: selected ? 800 : 600,
                              fontSize: 13,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

export function MonthPickerField(props: Omit<DatePickerFieldProps, "granularity">) {
  return <DatePickerField {...props} granularity="month" />;
}
