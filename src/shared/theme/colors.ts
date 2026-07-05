import { Appearance } from "react-native";

// Modern, clean & minimal palette anchored by teal.
// Two full palettes (light/dark) resolved from the system color scheme.

export type ColorPalette = {
  background: string;
  surface: string;
  surfaceMuted: string;

  primary: string;
  primaryMuted: string;
  secondary: string;
  accent: string;

  success: string;
  warning: string;
  danger: string;
  info: string;

  income: string;
  expense: string;
  savings: string;
  investment: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  onPrimary: string;

  border: string;
  divider: string;

  white: string;
  black: string;
};

const lightColors: ColorPalette = {
  // Base
  background: "#F6F7F9",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F3F5",

  // Brand (teal)
  primary: "#0D9488",
  primaryMuted: "#CCFBF1",
  secondary: "#475569",
  accent: "#14B8A6",

  // Status
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#0891B2",

  // Finance
  income: "#059669",
  expense: "#DC2626",
  savings: "#0D9488",
  investment: "#4F46E5",

  // Text
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  onPrimary: "#FFFFFF",

  // UI
  border: "#E2E8F0",
  divider: "#EEF1F4",

  // Misc
  white: "#FFFFFF",
  black: "#0F172A",
};

const darkColors: ColorPalette = {
  // Base
  background: "#0B0F14",
  surface: "#151B23",
  surfaceMuted: "#1B222B",

  // Brand (teal)
  primary: "#2DD4BF",
  primaryMuted: "#134E4A",
  secondary: "#94A3B8",
  accent: "#5EEAD4",

  // Status
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#F87171",
  info: "#22D3EE",

  // Finance
  income: "#34D399",
  expense: "#F87171",
  savings: "#2DD4BF",
  investment: "#818CF8",

  // Text
  text: "#F1F5F9",
  textSecondary: "#CBD5E1",
  textMuted: "#64748B",
  onPrimary: "#04211E",

  // UI
  border: "#24303D",
  divider: "#1E2733",

  // Misc
  white: "#FFFFFF",
  black: "#0F172A",
};

export const palettes = { light: lightColors, dark: darkColors };

export const colorScheme: "light" | "dark" =
  Appearance.getColorScheme() === "dark" ? "dark" : "light";

// Resolved palette used across the app. Reflects the system setting at launch.
export const colors: ColorPalette =
  colorScheme === "dark" ? darkColors : lightColors;
