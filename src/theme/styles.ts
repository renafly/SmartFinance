import { StyleSheet } from 'react-native'
import { colors } from './colors'
import { spacing } from './spacing'
import { radius } from './radius'
import { typography } from './typography'

export const globalStyles = StyleSheet.create({
  // Layouts
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.screenPadding,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardElevated: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
  },

  // Typography
  screenTitle: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  screenSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Inputs
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
})