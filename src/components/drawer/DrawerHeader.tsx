import { StyleSheet, Text, View } from "react-native";

export default function DrawerHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>SmartFinance</Text>

      <Text style={styles.version}>
        Personal Finance
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