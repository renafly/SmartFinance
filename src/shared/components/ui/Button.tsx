import { Button as PaperButton } from "react-native-paper";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

const variantMap: Record<string, "contained" | "outlined" | "text"> = {
  primary: "contained",
  secondary: "outlined",
  danger: "contained",
};

const modeToButtonColor: Record<string, any> = {
  danger: { backgroundColor: "#FF6B6B" },
};

export default function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
}: Props) {
  const mode = variantMap[variant] || "contained";
  const buttonColor = variant === "danger" ? "#FF6B6B" : undefined;

  return (
    <PaperButton
      mode={mode}
      onPress={onPress}
      disabled={disabled || loading}
      loading={loading}
      buttonColor={buttonColor}
    >
      {title}
    </PaperButton>
  );
}