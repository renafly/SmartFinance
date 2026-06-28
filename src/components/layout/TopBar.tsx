import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Menu } from "lucide-react-native";

export default function TopBar() {
  return (
    <View style={styles.container}>

      <TouchableOpacity style={styles.menuButton}>
        <Menu
          size={24}
          color="#0f172a"
        />
      </TouchableOpacity>

      <Text style={styles.title}>
        SmartFinance
      </Text>

      <View style={{ width: 40 }} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  menuButton: {
    width: 40,
    alignItems: "center",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
});