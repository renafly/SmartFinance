import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { colors, colorScheme } from "./colors";
import { radius } from "./radius";

const base = colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme;

export const paperTheme = {
  ...base,
  roundness: radius.md,
  colors: {
    ...base.colors,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    primaryContainer: colors.primaryMuted,
    secondary: colors.secondary,
    tertiary: colors.accent,
    error: colors.danger,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceMuted,
    outline: colors.border,
    outlineVariant: colors.divider,
    onBackground: colors.text,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    elevation: {
      ...base.colors.elevation,
      level0: "transparent",
      level1: colors.surface,
      level2: colors.surface,
      level3: colors.surface,
      level4: colors.surface,
      level5: colors.surface,
    },
  },
  isV3: true,
};
