import { border } from "./border";
import { colors } from "./colors";
import { radius } from "./radius";
import { shadows } from "./shadows";

export const componentStyles = {
  card: {
    backgroundColor: colors.surface,

    borderWidth: border.normal,
    borderColor: colors.border,

    borderRadius: radius.md,

    ...shadows.md,
  },

  button: {
    borderWidth: border.normal,
    borderColor: colors.border,

    borderRadius: radius.md,

    ...shadows.md,
  },

  input: {
    backgroundColor: colors.white,

    borderWidth: border.normal,
    borderColor: colors.border,

    borderRadius: radius.md,

    ...shadows.sm,
  },

  badge: {
    borderWidth: border.normal,
    borderColor: colors.border,

    borderRadius: radius.pill,
  },
};