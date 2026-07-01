import { Drawer } from "expo-router/drawer";
import { useWindowDimensions } from "react-native";

import { useI18n } from "@/shared/i18n";
import { DrawerContent } from "@/shared/components";

export default function AppLayout() {
  const { t } = useI18n();
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
          drawerLabel: t("drawer.dashboard"),
        }}
      />

      <Drawer.Screen
        name="accounts"
        options={{
          drawerLabel: t("drawer.accounts"),
        }}
      />

      <Drawer.Screen
        name="transactions"
        options={{
          drawerLabel: t("drawer.transactions"),
          lazy: true,
        }}
      />

      <Drawer.Screen
        name="transfers"
        options={{
          drawerLabel: t("drawer.transfers"),
          lazy: true,
        }}
      />

      <Drawer.Screen
        name="categories"
        options={{
          drawerLabel: t("drawer.categories"),
        }}
      />

      <Drawer.Screen
        name="members"
        options={{
          drawerLabel: t("drawer.members"),
        }}
      />

      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: t("drawer.settings"),
        }}
      />

      <Drawer.Screen
        name="budgets"
        options={{
          drawerLabel: t("drawer.budgets"),
          lazy: true,
        }}
      />

      <Drawer.Screen
        name="recurring"
        options={{
          drawerLabel: t("drawer.recurring"),
          lazy: true,
        }}
      />

      <Drawer.Screen
        name="savings"
        options={{
          drawerLabel: t("drawer.savings"),
          lazy: true,
        }}
      />

      <Drawer.Screen
        name="investments"
        options={{
          drawerLabel: t("drawer.investments"),
          lazy: true,
        }}
      />
    </Drawer>
  );
}