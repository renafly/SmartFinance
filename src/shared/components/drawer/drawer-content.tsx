import { DrawerContentScrollView, DrawerContentComponentProps } from "expo-router/drawer";
import { useI18n } from "@/shared/i18n";

import DrawerHeader from "./drawer-header";
import DrawerFooter from "./drawer-footer";
import DrawerItem from "./drawer-item";

import {
  Home,
  Wallet,
  Receipt,
  ArrowLeftRight,
  PiggyBank,
  Repeat2,
  Tags,
  Users,
  Settings,
} from "lucide-react-native";

export default function DrawerContent(
  props: DrawerContentComponentProps
) {
  const { t } = useI18n();

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
        title={t("drawer.dashboard")}
        href="/"
      />

      <DrawerItem
        icon={Wallet}
        title={t("drawer.accounts")}
        href="/accounts"
      />

      <DrawerItem
        icon={Receipt}
        title={t("drawer.transactions")}
        href="/transactions"
      />

      <DrawerItem
        icon={ArrowLeftRight}
        title={t("drawer.transfers")}
        href="/transfers"
      />

      <DrawerItem
        icon={PiggyBank}
        title={t("drawer.savings")}
        href="/savings"
      />

      <DrawerItem
        icon={Repeat2}
        title={t("drawer.recurring")}
        href="/recurring"
      />

      <DrawerItem
        icon={Tags}
        title={t("drawer.categories")}
        href="/categories"
      />

      <DrawerItem
        icon={Users}
        title={t("drawer.members")}
        href="/members"
      />

      <DrawerItem
        icon={Settings}
        title={t("drawer.settings")}
        href="/settings"
      />

      <DrawerFooter />
    </DrawerContentScrollView>
  );
}