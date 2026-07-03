// investments.tsx
import { Text, View } from "react-native";
import { useI18n } from "@/shared/i18n";

export default function InvestmentsScreen() {
  const { t } = useI18n();

  return (
    <View>
      <Text>{t("drawer.investments")}</Text>
    </View>
  );
}