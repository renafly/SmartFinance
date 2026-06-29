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

  card: {
    width: '100%',
    backgroundColor: colors.surface,

    padding: spacing.xl,

    borderRadius: radius.md,
    borderWidth: border.thick,
    borderColor: colors.border,

    ...shadows.lg,
  },

  screenTitle: {
    ...typography.display,
    color: colors.text,
    textAlign: 'center',
  },

  screenSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
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