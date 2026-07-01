import { MD3LightTheme } from "react-native-paper";
import { colors } from "./colors";

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.accent,
    error: colors.danger,
    success: colors.success,
    warning: colors.warning,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.background,
    outline: colors.border,
    onBackground: colors.text,
    onSurface: colors.text,
  },
  // Neo-Brutalism: No shadows, thick outlines
  isV3: true,
};
