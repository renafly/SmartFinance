import { Drawer } from "expo-router/drawer";
import { useWindowDimensions } from "react-native";

import { DrawerContent } from "@/shared/components";

export default function AppLayout() {
  const { width } = useWindowDimensions();

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: width < 1024,
        drawerType: width >= 1024 ? "permanent" : "front",
        drawerStyle: {
          width: 280,
        },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: "Dashboard",
        }}
      />

      <Drawer.Screen
        name="accounts"
        options={{
          drawerLabel: "Accounts",
        }}
      />

      <Drawer.Screen
        name="transactions"
        options={{
          drawerLabel: "Transactions",
        }}
      />

      <Drawer.Screen
        name="categories"
        options={{
          drawerLabel: "Categories",
        }}
      />

      <Drawer.Screen
        name="members"
        options={{
          drawerLabel: "Members",
        }}
      />

      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: "Settings",
        }}
      />

      {/* Hidden */}

      <Drawer.Screen
        name="transactions/new"
        options={{
          drawerItemStyle: {
            display: "none",
          },
        }}
      />

      <Drawer.Screen
        name="transactions/[id]"
        options={{
          drawerItemStyle: {
            display: "none",
          },
        }}
      />
    </Drawer>
  );
}