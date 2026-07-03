import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/shared/i18n";

export default function DrawerHeader() {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>SmartFinance</Text>

      <Text style={styles.version}>
        {t("drawer.subtitle")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
  },

  version: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 14,
  },
});