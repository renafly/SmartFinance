import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';
import { border } from './border';
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

  // Neo-brutalism: Bold borders, NO shadows
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: 0, // Sharp corners for brutalism
    borderWidth: 4, // Extra thick border
    borderColor: colors.text,
  },

  screenTitle: {
    ...typography.display,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '900', // Extra bold
  },

  screenSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '900', // Extra bold
  },

  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});