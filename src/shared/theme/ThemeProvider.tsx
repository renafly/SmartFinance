import {
    createContext,
    useContext,
    useMemo,
    type PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { darkColors, lightColors, type ThemeColors } from "./colors";
import { radius } from "./radius";
import { shadows } from "./shadows";
import { spacing } from "./spacing";
import { typography } from "./typography";

type ThemeContextValue = {
  colors: ThemeColors;
  typography: typeof typography;
  radius: typeof radius;
  shadows: typeof shadows;
  spacing: typeof spacing;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Resolves the wizard's Theme answer ('light' | 'dark' | 'system') via
// the Zustand themeStore (item 28) - 'system' defers to the OS via
// useColorScheme(), light/dark are pinned regardless of OS setting.
export function ThemeProvider({ children }: PropsWithChildren) {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      typography,
      radius,
      shadows,
      spacing,
      isDark,
    }),
    [isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider.");
  return ctx;
}
