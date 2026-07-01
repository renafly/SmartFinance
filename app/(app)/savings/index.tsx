// savings.tsx
import { Text, View } from "react-native";
import { useI18n } from "@/shared/i18n";

export default function SavingsScreen() {
  const { t } = useI18n();

  return (
    <View>
      <Text>{t("drawer.savings")}</Text>
    </View>
  );
}