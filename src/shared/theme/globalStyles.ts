import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';
import { border } from './border';
import { shadows } from './shadows';
import { typography } from './typography';

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },

  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modern minimal: soft borders, gentle rounding, subtle shadow
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: border.thin,
    borderColor: colors.border,
    ...shadows.sm,
  },

  screenTitle: {
    ...typography.display,
    color: colors.text,
  },

  screenSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },

  sectionTitle: {
    ...typography.h2,
    color: colors.text,
  },

  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
