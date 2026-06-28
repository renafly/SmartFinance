
import { StyleSheet, View } from "react-native";

import StatCard from "@/components/ui/StatCard";

export default function DashboardStats() {
  return (
    <View style={styles.container}>
      <StatCard title="Saldo Total" value="€12 540" />
      <StatCard title="Receitas" value="€3 240" />
      <StatCard title="Despesas" value="€1 920" />
      <StatCard title="Poupanças" value="€18 300" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 30,
  },
});