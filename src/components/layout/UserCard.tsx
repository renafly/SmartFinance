
import { View, Text, StyleSheet } from "react-native";
import { useAuthContext } from "@/hooks/use-auth-context";

export default function UserCard() {
  const { claims } = useAuthContext();

  const email = claims?.email ?? "";

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {email.charAt(0).toUpperCase()}
        </Text>
      </View>

      <Text numberOfLines={1} style={styles.email}>
        {email}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  avatarText: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },

  email: {
    color: "#64748b",
    fontSize: 13,
  },
});