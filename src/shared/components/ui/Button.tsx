import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

import {
  border,
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "@/shared/theme";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export default function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={[styles.text, variant !== "primary" && styles.darkText]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,
    paddingHorizontal: spacing.lg,

    justifyContent: "center",
    alignItems: "center",

    borderRadius: radius.md,
    borderWidth: border.thick,
    borderColor: colors.border,

    ...shadows.md,
  },

  primary: {
    backgroundColor: colors.primary,
  },

  secondary: {
    backgroundColor: colors.white,
  },

  danger: {
    backgroundColor: colors.danger,
  },

  text: {
    ...typography.body,
    fontWeight: "900",
    color: colors.text,
  },

  darkText: {
    color: colors.text,
  },

  pressed: {
    transform: [
      { translateX: 4 },
      { translateY: 4 },
    ],
    elevation: 0,
    shadowOpacity: 0,
  },

  disabled: {
    opacity: .55,
  },
});