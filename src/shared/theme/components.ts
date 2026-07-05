import { border } from "./border";
import { colors } from "./colors";
import { radius } from "./radius";
import { shadows } from "./shadows";

export const componentStyles = {
  card: {
    backgroundColor: colors.surface,

    borderWidth: border.thin,
    borderColor: colors.border,

    borderRadius: radius.lg,

    ...shadows.sm,
  },

  button: {
    borderRadius: radius.md,
  },

  input: {
    backgroundColor: colors.surface,

    borderWidth: border.thin,
    borderColor: colors.border,

    borderRadius: radius.md,
  },

  badge: {
    borderWidth: border.thin,
    borderColor: colors.border,

    borderRadius: radius.pill,
  },
};
