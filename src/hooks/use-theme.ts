import { useTheme as useAppTheme } from '@/theme/ThemeProvider';

export function useTheme() {
  const { colors } = useAppTheme();

  return {
    text: colors.text,
    background: colors.background,
    backgroundElement: colors.surface,
    backgroundSelected: colors.surfaceSelected,
    textSecondary: colors.textSecondary,
    link: colors.link,
  };
}
