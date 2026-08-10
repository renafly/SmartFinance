import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import { usePreferencesStore } from "@/stores/preferencesStore";
import { useTheme } from "@/theme/ThemeProvider";

const options = [
  { value: "pt" as const, flag: "🇵🇹", code: "PT", label: "Português" },
  { value: "en" as const, flag: "🇬🇧", code: "EN", label: "English" },
];

const MENU_WIDTH = 172;
const MENU_MARGIN = 16;

export function LanguageMenu() {
  const { t, i18n } = useTranslation("common");
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<View>(null);
  const triggerRef = useRef<View & { focus?: () => void }>(null);
  const resolvedLanguage = i18n.resolvedLanguage?.startsWith("pt")
    ? "pt"
    : "en";
  const active =
    options.find((option) => option.value === resolvedLanguage) ?? options[0];

  // Flags represent countries, not languages, and a flag-only trigger
  // doesn't tell anyone (sighted or using assistive tech) which language
  // is currently active without opening the menu. Show the language code
  // next to the flag, and describe the current selection in the
  // accessibility label instead of a generic "select language".
  const triggerLabel = t("landing.language.current", {
    language: active.label,
  });

  // Keep the dropdown from overflowing narrow viewports: it opens
  // right-aligned to its own trigger by default, but on very small
  // screens (roughly a 320-360px phone) a fixed 172px panel can still
  // run past the edge of the viewport, so shrink it to fit instead.
  const menuWidth = Math.min(MENU_WIDTH, Math.max(width - MENU_MARGIN * 2, 140));

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus?.());
      }
    };
    const closeOutside = (event: PointerEvent) => {
      const root = rootRef.current as unknown as HTMLElement | null;
      if (root && !root.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  return (
    <View ref={rootRef} style={styles.root}>
      <Pressable
        ref={triggerRef}
        accessibilityLabel={triggerLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          styles.trigger,
          { borderColor: colors.primary, backgroundColor: colors.primarySoft },
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.flag}>{active.flag}</Text>
        <Text style={[styles.code, { color: colors.primary }]}>
          {active.code}
        </Text>
        <MaterialIcons
          color={colors.primary}
          name={open ? "expand-less" : "expand-more"}
          size={18}
        />
      </Pressable>
      {open ? (
        <View
          accessibilityRole="menu"
          style={[
            styles.menu,
            {
              width: menuWidth,
              backgroundColor: colors.surface,
              borderColor: colors.primary,
            },
          ]}
        >
          {options.map((option) => (
            <Pressable
              accessibilityRole="menuitem"
              accessibilityState={{ selected: option.value === active.value }}
              key={option.value}
              onPress={() => {
                setLanguage(option.value);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.option,
                option.value === active.value && {
                  backgroundColor: colors.primarySoft,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.flag}>{option.flag}</Text>
              <Text style={[styles.optionText, { color: colors.text }]}>
                {option.label}
              </Text>
              {option.value === active.value ? (
                <MaterialIcons color={colors.primary} name="check" size={17} />
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "relative", zIndex: 100 },
  trigger: {
    minWidth: 78,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  flag: { fontSize: 18, lineHeight: 22 },
  code: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  menu: {
    position: "absolute",
    right: 0,
    top: 50,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    zIndex: 110,
    elevation: 12,
  },
  option: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionText: { flex: 1, fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.72 },
});
