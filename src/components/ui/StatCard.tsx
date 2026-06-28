
import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  value: string;
};

export default function StatCard({
  title,
  value,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  title: {
    color: "#64748b",
    marginBottom: 10,
    fontSize: 14,
  },

  value: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
  },
});