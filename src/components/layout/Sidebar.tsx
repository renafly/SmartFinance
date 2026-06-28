import { StyleSheet, Text, View } from "react-native";

import SidebarItem from "./SidebarItem";
import { navigation } from "./navigation";

import SignOutButton from "@/components/social-auth-buttons/sign-out-button";
import { useAuthContext } from "@/hooks/use-auth-context";

export default function Sidebar() {
  const { profile, claims } = useAuthContext();

  return (
    <View style={styles.sidebar}>
      <Text style={styles.logo}>
        💰 SmartFinance
      </Text>

      <View style={styles.menu}>
        {navigation.map((item) => (
          <SidebarItem
            key={item.href}
            {...item}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.name}>
          {profile?.username ??
            claims?.email?.split("@")[0]}
        </Text>

        <Text style={styles.email}>
          {claims?.email}
        </Text>

        <View style={{ marginTop: 20 }}>
          <SignOutButton />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderColor: "#e2e8f0",
    padding: 24,
  },

  logo: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 40,
  },

  menu: {
    flex: 1,
  },

  footer: {
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingTop: 20,
  },

  name: {
    fontWeight: "700",
    fontSize: 16,
  },

  email: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 13,
  },
});