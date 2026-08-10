import {
    createContext,
    useContext,
    useMemo,
    type PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";
import { useThemeStore } from "../stores/themeStore";
import {
  blueColors,
  darkColors,
  lightColors,
  ultraColors,
  type ThemeColors,
} from "./colors";
import { radius } from "./radius";
import { shadows } from "./shadows";
import { spacing } from "./spacing";
import { typography } from "./typography";

type ResolvedThemeMode = "light" | "dark" | "blue" | "ultra";

type ThemeContextValue = {
  colors: ThemeColors;
  typography: typeof typography;
  radius: typeof radius;
  shadows: typeof shadows;
  spacing: typeof spacing;
  isDark: boolean;
  mode: ResolvedThemeMode;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Resolves the stored theme choice ('light' | 'dark' | 'blue' | 'ultra' | 'system')
// via the Zustand theme store. 'system' defers to the OS via useColorScheme()
// and always resolves to 'light' or 'dark' (the extra 'blue' and 'ultra'
// looks are opt-in only, same as before).
export function ThemeProvider({ children }: PropsWithChildren) {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();

  const resolvedMode: ResolvedThemeMode =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
  const isDark = resolvedMode !== "light";

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors:
        resolvedMode === "ultra"
          ? ultraColors
          : resolvedMode === "blue"
            ? blueColors
            : resolvedMode === "dark"
              ? darkColors
              : lightColors,
      typography,
      radius,
      shadows,
      spacing,
      isDark,
      mode: resolvedMode,
    }),
    [isDark, resolvedMode],
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
