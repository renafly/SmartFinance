import { StyleSheet, Text, View } from "react-native";

type Props = {
  message: string;
};

export default function EmptyState({
  message,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 50,
    alignItems: "center",
  },

  text: {
    color: "#94a3b8",
    fontSize: 16,
  },
});