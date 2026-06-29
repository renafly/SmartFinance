import { View, StyleSheet } from "react-native";

import SignOutButton from "@/components/social-auth-buttons/sign-out-button";

export default function DrawerFooter() {
  return (
    <View style={styles.container}>
      <SignOutButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: "auto",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
});