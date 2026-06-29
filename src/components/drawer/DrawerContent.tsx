import { DrawerContentScrollView, DrawerContentComponentProps } from "expo-router/drawer";

import DrawerHeader from "./DrawerHeader";
import DrawerFooter from "./DrawerFooter";
import DrawerItem from "./DrawerItem";

import {
  Home,
  Wallet,
  Receipt,
  Tags,
  Users,
  Settings,
} from "lucide-react-native";

export default function DrawerContent(
  props: DrawerContentComponentProps
) {
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        flex: 1,
      }}
    >
      <DrawerHeader />

      <DrawerItem
        icon={Home}
        title="Dashboard"
        href="/"
      />

      <DrawerItem
        icon={Wallet}
        title="Accounts"
        href="/accounts"
      />

      <DrawerItem
        icon={Receipt}
        title="Transactions"
        href="/transactions"
      />

      <DrawerItem
        icon={Tags}
        title="Categories"
        href="/categories"
      />

      <DrawerItem
        icon={Users}
        title="Members"
        href="/members"
      />

      <DrawerItem
        icon={Settings}
        title="Settings"
        href="/settings"
      />

      <DrawerFooter />
    </DrawerContentScrollView>
  );
}