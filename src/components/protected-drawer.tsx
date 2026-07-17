import type { DrawerContentComponentProps } from "expo-router/drawer";
import { Drawer } from "expo-router/drawer";
import { router, usePathname } from "expo-router";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { useResponsiveMetrics } from "@/theme/responsive";
import { isSystemAdminEmail } from "@/constants/admin-access";
import { NotificationCenter } from "@/components/notification-center";
import { useOnboarding } from "@/features/onboarding";
import type { OnboardingGuideKey } from "@/features/onboarding";
import { usePlatformAdminAccess } from "@/features/feedback";

const menuIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  dashboard: "home-outline",
  accounts: "wallet-outline",
  transactions: "receipt-outline",
  transfers: "swap-horizontal-outline",
  monthlyBudget: "calculator-outline",
  savings: "file-tray-full-outline",
  categories: "pricetag-outline",
  members: "people-outline",
  diagnostics: "pulse-outline",
  feedback: "chatbubbles-outline",
  adminFeedback: "file-tray-full-outline",
  settings: "settings-outline",
};

function getGuideKeyForPathname(pathname: string): OnboardingGuideKey | null {
  if (
    pathname === "/" ||
    pathname.endsWith("/(protected)") ||
    pathname.endsWith("/index")
  )
    return "dashboard";

  const section = pathname.split("/").filter(Boolean).at(-1);
  return [
    "accounts",
    "transactions",
    "transfers",
    "budget",
    "savings",
    "categories",
    "members",
    "settings",
  ].includes(section ?? "")
    ? (section as OnboardingGuideKey)
    : null;
}

function SectionGuideButton({
  guideKey,
}: {
  guideKey: OnboardingGuideKey | null;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { openGuide } = useOnboarding();

  if (!guideKey) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("onboarding.sectionGuide")}
      onPress={() => openGuide(guideKey)}
      style={({ pressed }) => [
        styles.guideButton,
        { backgroundColor: colors.primarySoft, borderColor: colors.primary },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
      <Text style={[styles.guideLabel, { color: colors.primary }]}>
        {t("onboarding.sectionGuide")}
      </Text>
    </Pressable>
  );
}

export function ProtectedDrawerLayout() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const usePermanentDrawer = Platform.OS === "web" && responsive.isDesktop;

  return (
    <Drawer
      screenOptions={
        {
          headerShown: !usePermanentDrawer,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
            fontSize: typography.fontSize[16],
            fontWeight: typography.fontWeight.extraBold,
          },
          drawerStyle: [
            styles.drawer,
            {
              width: responsive.isPhone
                ? Math.min(responsive.width * 0.88, 320)
                : spacing(70),
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ],
          drawerType: usePermanentDrawer ? "permanent" : "front",
          overlayColor: colors.overlay,
        } as any
      }
      drawerContent={DrawerContent}
    >
      <Drawer.Screen name="index" options={{ title: t("drawer.dashboard") }} />
      <Drawer.Screen
        name="accounts"
        options={{ title: t("drawer.accounts") }}
      />
      <Drawer.Screen
        name="transactions"
        options={{ title: t("drawer.transactions") }}
      />
      <Drawer.Screen
        name="transfers"
        options={{ title: t("drawer.transfers") }}
      />
      <Drawer.Screen
        name="budget"
        options={{ title: t("drawer.monthlyBudget") }}
      />
      <Drawer.Screen name="savings" options={{ title: t("drawer.savings") }} />
      <Drawer.Screen
        name="categories"
        options={{ title: t("drawer.categories") }}
      />
      <Drawer.Screen name="members" options={{ title: t("drawer.members") }} />
      <Drawer.Screen
        name="feedback"
        options={{ title: t("drawer.feedback") }}
      />
      <Drawer.Screen
        name="admin-feedback"
        options={{ title: t("drawer.adminFeedback") }}
      />
      <Drawer.Screen
        name="diagnostics"
        options={{ title: t("drawer.diagnostics") }}
      />
      <Drawer.Screen
        name="settings"
        options={{ title: t("drawer.settings") }}
      />
    </Drawer>
  );
}

function DrawerContent(props: DrawerContentComponentProps) {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const { logout, profile, session } = useAuth();
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const platformAdminQuery = usePlatformAdminAccess();
  const closeDrawerAfterNavigate =
    Platform.OS !== "web" || !responsive.isDesktop;
  const canViewDiagnostics = isSystemAdminEmail(
    profile?.email,
    session?.user.email,
  );
  const canManageFeedback = platformAdminQuery.data === true;
  const guideKey = getGuideKeyForPathname(pathname);
  const navigateTo = (href: string) => {
    router.push(href as any);
    if (closeDrawerAfterNavigate) {
      props.navigation.closeDrawer();
    }
  };
  const menuItems: {
    key: keyof typeof menuIconMap;
    label: string;
    href: string;
  }[] = [
    { key: "dashboard", label: t("drawer.dashboard"), href: "/(protected)" },
    {
      key: "accounts",
      label: t("drawer.accounts"),
      href: "/(protected)/accounts",
    },
    {
      key: "transactions",
      label: t("drawer.transactions"),
      href: "/(protected)/transactions",
    },
    {
      key: "transfers",
      label: t("drawer.transfers"),
      href: "/(protected)/transfers",
    },
    {
      key: "monthlyBudget",
      label: t("drawer.monthlyBudget"),
      href: "/(protected)/budget",
    },
    {
      key: "savings",
      label: t("drawer.savings"),
      href: "/(protected)/savings",
    },
    {
      key: "categories",
      label: t("drawer.categories"),
      href: "/(protected)/categories",
    },
    {
      key: "members",
      label: t("drawer.members"),
      href: "/(protected)/members",
    },
    {
      key: "feedback",
      label: t("drawer.feedback"),
      href: "/(protected)/feedback",
    },
    ...(canManageFeedback
      ? [
          {
            key: "adminFeedback" as const,
            label: t("drawer.adminFeedback"),
            href: "/(protected)/admin-feedback",
          },
        ]
      : []),
    ...(canViewDiagnostics
      ? [
          {
            key: "diagnostics" as const,
            label: t("drawer.diagnostics"),
            href: "/(protected)/diagnostics",
          },
        ]
      : []),
    {
      key: "settings",
      label: t("drawer.settings"),
      href: "/(protected)/settings",
    },
  ];

  const menuGroups: {
    title: string;
    description: string;
    items: {
      key: keyof typeof menuIconMap;
      label: string;
      href: string;
    }[];
  }[] = [
    {
      title: t("drawer.overview"),
      description: t("drawer.overviewDescription"),
      items: [
        {
          key: "dashboard",
          label: t("drawer.dashboard"),
          href: "/(protected)",
        },
        {
          key: "accounts",
          label: t("drawer.accounts"),
          href: "/(protected)/accounts",
        },
        {
          key: "transactions",
          label: t("drawer.transactions"),
          href: "/(protected)/transactions",
        },
      ],
    },
    {
      title: t("drawer.moneyMovement"),
      description: t("drawer.moneyMovementDescription"),
      items: [
        {
          key: "transfers",
          label: t("drawer.transfers"),
          href: "/(protected)/transfers",
        },
        {
          key: "monthlyBudget",
          label: t("drawer.monthlyBudget"),
          href: "/(protected)/budget",
        },
        {
          key: "savings",
          label: t("drawer.savings"),
          href: "/(protected)/savings",
        },
      ],
    },
    {
      title: t("drawer.administration"),
      description: t("drawer.administrationDescription"),
      items: [
        {
          key: "categories",
          label: t("drawer.categories"),
          href: "/(protected)/categories",
        },
        {
          key: "members",
          label: t("drawer.members"),
          href: "/(protected)/members",
        },
        {
          key: "feedback",
          label: t("drawer.feedback"),
          href: "/(protected)/feedback",
        },
        ...(canManageFeedback
          ? [
              {
                key: "adminFeedback" as const,
                label: t("drawer.adminFeedback"),
                href: "/(protected)/admin-feedback",
              },
            ]
          : []),
        ...(canViewDiagnostics
          ? [
              {
                key: "diagnostics" as const,
                label: t("drawer.diagnostics"),
                href: "/(protected)/diagnostics",
              },
            ]
          : []),
        {
          key: "settings",
          label: t("drawer.settings"),
          href: "/(protected)/settings",
        },
      ],
    },
  ];

  if (Platform.OS === "web") {
    return (
      <ScrollView
        style={[
          styles.webShell,
          {
            backgroundColor: colors.background,
          },
        ]}
        contentContainerStyle={[
          styles.drawerScrollContent,
          {
            paddingHorizontal: responsive.isPhone ? spacing(3) : spacing(4.5),
            paddingTop: responsive.isPhone ? spacing(3) : spacing(4.5),
            paddingBottom: responsive.isPhone ? spacing(3) : spacing(4.5),
            gap: responsive.isPhone ? spacing(3) : spacing(4),
          },
        ]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.brand,
            {
              backgroundColor: colors.muted,
              borderColor: colors.border,
              padding: responsive.isPhone ? spacing(3) : spacing(4),
            },
          ]}
        >
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>
            {t("drawer.brand")}
          </Text>
          <Text
            style={[
              styles.brandSubtitle,
              { color: colors.foreground, opacity: 0.72 },
            ]}
          >
            {t("drawer.subtitle")}
          </Text>
        </View>

        <NotificationCenter />

        <SectionGuideButton guideKey={guideKey} />

        <View style={styles.groupedMenu}>
          {menuGroups.map((group) => (
            <View key={group.title} style={styles.groupBlock}>
              <Text style={[styles.groupHeading, { color: colors.primary }]}>
                {group.title}
              </Text>
              <Text
                style={[
                  styles.groupDescription,
                  { color: colors.foreground, opacity: 0.7 },
                ]}
              >
                {group.description}
              </Text>

              <View style={styles.navList}>
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const iconName = menuIconMap[item.key] ?? "ellipse-outline";

                  return (
                    <Pressable
                      key={item.href}
                      onPress={() => navigateTo(item.href)}
                      style={({ pressed }) => [
                        styles.navItem,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.muted,
                          borderColor: active ? colors.primary : colors.border,
                          paddingHorizontal: responsive.isPhone
                            ? spacing(3)
                            : spacing(3.5),
                          paddingVertical: responsive.isPhone
                            ? spacing(3)
                            : spacing(3.5),
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name={iconName}
                        size={18}
                        color={active ? colors.background : colors.foreground}
                      />
                      <Text
                        style={[
                          styles.navLabel,
                          {
                            color: active
                              ? colors.background
                              : colors.foreground,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={() => void logout()}
            style={({ pressed }) => [
              styles.logoutButton,
              {
                backgroundColor: colors.destructive,
                borderColor: colors.destructive,
              },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={colors.background}
            />
            <Text style={[styles.logoutLabel, { color: colors.background }]}>
              {t("logout")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.drawerContent, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.drawerScrollContent,
        styles.nativeDrawerScrollContent,
      ]}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.brand,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.brandTitle, { color: colors.foreground }]}>
          {t("drawer.brand")}
        </Text>
        <Text
          style={[
            styles.brandSubtitle,
            { color: colors.foreground, opacity: 0.72 },
          ]}
        >
          {t("drawer.subtitle")}
        </Text>
      </View>

      <NotificationCenter />

      <SectionGuideButton guideKey={guideKey} />

      <View style={styles.navList}>
        {menuItems.map((item) => {
          const active = pathname === item.href;
          const iconName = menuIconMap[item.key] ?? "ellipse-outline";

          return (
            <Pressable
              key={item.href}
              onPress={() => navigateTo(item.href)}
              style={({ pressed }) => [
                styles.navItem,
                {
                  backgroundColor: active ? colors.primary : colors.muted,
                  borderColor: active ? colors.primary : colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={iconName}
                size={18}
                color={active ? colors.background : colors.foreground}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: active ? colors.background : colors.foreground },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => void logout()}
          style={({ pressed }) => [
            styles.logoutButton,
            {
              backgroundColor: colors.destructive,
              borderColor: colors.destructive,
            },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color={colors.background}
          />
          <Text style={[styles.logoutLabel, { color: colors.background }]}>
            {t("logout")}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles: any = StyleSheet.create({
  drawer: {},
  webShell: {
    flex: 1,
  },
  drawerScrollContent: {
    flexGrow: 1,
  },
  scene: {},
  drawerContent: {
    flex: 1,
  },
  nativeDrawerScrollContent: {
    paddingHorizontal: spacing(4),
    paddingTop: spacing(6),
    paddingBottom: spacing(4),
    gap: spacing(5),
  },
  brand: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing(1.5),
  },
  brandTitle: {
    fontSize: typography.fontSize[24],
    fontWeight: typography.fontWeight.extraBold as any,
  },
  brandSubtitle: {
    fontSize: typography.fontSize[13],
  },
  navList: {
    gap: spacing(2),
  },
  groupedMenu: {
    gap: spacing(4.5),
  },
  footer: {
    marginTop: "auto",
    paddingTop: spacing(2),
  },
  groupBlock: {
    gap: spacing(2.5),
  },
  groupHeading: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold as any,
    letterSpacing: typography.letterSpacing[10],
    textTransform: "uppercase",
  },
  groupDescription: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  navItem: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  navLabel: {
    fontWeight: typography.fontWeight.semibold as any,
    fontSize: typography.fontSize[15],
  },
  logoutButton: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  logoutLabel: {
    fontWeight: typography.fontWeight.bold as any,
    fontSize: typography.fontSize[15],
  },
  guideButton: {
    minHeight: 44,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  guideLabel: {
    fontWeight: typography.fontWeight.bold as any,
    fontSize: typography.fontSize[14],
  },
  pressed: {
    opacity: 0.85,
  },
});
