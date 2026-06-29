import {
  Home,
  CreditCard,
  ArrowLeftRight,
  FolderTree,
  Users,
  PiggyBank,
  Target,
  TrendingUp,
  Settings,
} from "lucide-react-native";

export const navigation = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Accounts",
    href: "/accounts",
    icon: CreditCard,
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: FolderTree,
  },
  {
    title: "Members",
    href: "/members",
    icon: Users,
  },
  {
    title: "Budgets",
    href: "/budgets",
    icon: Target,
  },
  {
    title: "Savings",
    href: "/savings",
    icon: PiggyBank,
  },
  {
    title: "Investments",
    href: "/investments",
    icon: TrendingUp,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];