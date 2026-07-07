import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { Drawer } from 'expo-router/drawer';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

const menuIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  dashboard: 'home-outline',
  accounts: 'wallet-outline',
  transactions: 'receipt-outline',
  transfers: 'swap-horizontal-outline',
  monthlyBudget: 'calculator-outline',
  savings: 'save-outline',
  recurring: 'repeat-outline',
  categories: 'pricetag-outline',
  members: 'people-outline',
  settings: 'settings-outline',
};

export function ProtectedDrawerLayout() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();

  return (
      <Drawer
      screenOptions={{
        headerShown: false,
        drawerStyle: [styles.drawer, { backgroundColor: colors.background, borderColor: colors.border }],
        drawerType: Platform.OS === 'web' ? 'permanent' : 'front',
      } as any}
      drawerContent={DrawerContent}
    >
      <Drawer.Screen name="index" options={{ title: t('drawer.dashboard') }} />
      <Drawer.Screen name="accounts" options={{ title: t('drawer.accounts') }} />
      <Drawer.Screen name="transactions" options={{ title: t('drawer.transactions') }} />
      <Drawer.Screen name="transfers" options={{ title: t('drawer.transfers') }} />
      <Drawer.Screen name="budget" options={{ title: t('drawer.monthlyBudget') }} />
      <Drawer.Screen name="savings" options={{ title: t('drawer.savings') }} />
      <Drawer.Screen name="recurring" options={{ title: t('drawer.recurring') }} />
      <Drawer.Screen name="categories" options={{ title: t('drawer.categories') }} />
      <Drawer.Screen name="members" options={{ title: t('drawer.members') }} />
      <Drawer.Screen name="settings" options={{ title: t('drawer.settings') }} />
    </Drawer>
  );
}

function DrawerContent(_props: DrawerContentComponentProps) {
  const { t } = useTranslation('common');
  const pathname = usePathname();
  const { logout } = useAuth();
  const { colors } = useTheme();
  const menuItems: Array<{ key: keyof typeof menuIconMap; label: string; href: string }> = [
    { key: 'dashboard', label: t('drawer.dashboard'), href: '/(protected)' },
    { key: 'accounts', label: t('drawer.accounts'), href: '/(protected)/accounts' },
    { key: 'transactions', label: t('drawer.transactions'), href: '/(protected)/transactions' },
    { key: 'transfers', label: t('drawer.transfers'), href: '/(protected)/transfers' },
    { key: 'monthlyBudget', label: t('drawer.monthlyBudget'), href: '/(protected)/budget' },
    { key: 'savings', label: t('drawer.savings'), href: '/(protected)/savings' },
    { key: 'recurring', label: t('drawer.recurring'), href: '/(protected)/recurring' },
    { key: 'categories', label: t('drawer.categories'), href: '/(protected)/categories' },
    { key: 'members', label: t('drawer.members'), href: '/(protected)/members' },
    { key: 'settings', label: t('drawer.settings'), href: '/(protected)/settings' },
  ];

  const menuGroups: Array<{
    title: string;
    description: string;
    items: Array<{ key: keyof typeof menuIconMap; label: string; href: string }>;
  }> = [
    {
      title: t('drawer.overview'),
      description: t('drawer.overviewDescription'),
      items: [
        { key: 'dashboard', label: t('drawer.dashboard'), href: '/(protected)' },
        { key: 'accounts', label: t('drawer.accounts'), href: '/(protected)/accounts' },
        { key: 'transactions', label: t('drawer.transactions'), href: '/(protected)/transactions' },
      ],
    },
    {
      title: t('drawer.moneyMovement'),
      description: t('drawer.moneyMovementDescription'),
      items: [
        { key: 'transfers', label: t('drawer.transfers'), href: '/(protected)/transfers' },
        { key: 'monthlyBudget', label: t('drawer.monthlyBudget'), href: '/(protected)/budget' },
        { key: 'savings', label: t('drawer.savings'), href: '/(protected)/savings' },
        { key: 'recurring', label: t('drawer.recurring'), href: '/(protected)/recurring' },
      ],
    },
    {
      title: t('drawer.administration'),
      description: t('drawer.administrationDescription'),
      items: [
        { key: 'categories', label: t('drawer.categories'), href: '/(protected)/categories' },
        { key: 'members', label: t('drawer.members'), href: '/(protected)/members' },
        { key: 'settings', label: t('drawer.settings'), href: '/(protected)/settings' },
      ],
    },
  ];

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webShell, { backgroundColor: colors.background }]}>
        <View style={[styles.brand, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>{t('drawer.brand')}</Text>
          <Text style={[styles.brandSubtitle, { color: colors.foreground, opacity: 0.72 }]}>{t('drawer.subtitle')}</Text>
        </View>

        <View style={styles.groupedMenu}>
          {menuGroups.map((group) => (
            <View key={group.title} style={styles.groupBlock}>
              <Text style={[styles.groupHeading, { color: colors.primary }]}>{group.title}</Text>
              <Text style={[styles.groupDescription, { color: colors.foreground, opacity: 0.7 }]}>{group.description}</Text>

              <View style={styles.navList}>
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const iconName = menuIconMap[item.key] ?? 'ellipse-outline';

                  return (
                    <Pressable
                      key={item.href}
                      onPress={() => router.push(item.href as any)}
                      style={({ pressed }) => [
                        styles.navItem,
                        { backgroundColor: active ? colors.primary : colors.muted, borderColor: active ? colors.primary : colors.border },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name={iconName} size={18} color={active ? colors.background : colors.foreground} />
                      <Text style={[styles.navLabel, { color: active ? colors.background : colors.foreground }]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable onPress={() => void logout()} style={({ pressed }) => [styles.logoutButton, { backgroundColor: colors.destructive, borderColor: colors.destructive }, pressed && styles.pressed]}>
            <Ionicons name="log-out-outline" size={18} color={colors.background} />
            <Text style={[styles.logoutLabel, { color: colors.background }]}>{t('logout')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
      <View style={[styles.drawerContent, { backgroundColor: colors.background }]}>
        <View style={[styles.brand, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Text style={[styles.brandTitle, { color: colors.foreground }]}>{t('drawer.brand')}</Text>
        <Text style={[styles.brandSubtitle, { color: colors.foreground, opacity: 0.72 }]}>{t('drawer.subtitle')}</Text>
      </View>

      <View style={styles.navList}>
        {menuItems.map((item) => {
          const active = pathname === item.href;
          const iconName = menuIconMap[item.key] ?? 'ellipse-outline';

          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [
                styles.navItem,
                { backgroundColor: active ? colors.primary : colors.muted, borderColor: active ? colors.primary : colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name={iconName} size={18} color={active ? colors.background : colors.foreground} />
              <Text style={[styles.navLabel, { color: active ? colors.background : colors.foreground }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => void logout()} style={({ pressed }) => [styles.logoutButton, { backgroundColor: colors.destructive, borderColor: colors.destructive }, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" size={18} color={colors.background} />
          <Text style={[styles.logoutLabel, { color: colors.background }]}>{t('logout')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles: any = StyleSheet.create({
  drawer: {
    width: spacing(70),
  },
  webShell: {
    flex: 1,
    paddingHorizontal: spacing(4.5),
    paddingTop: spacing(4.5),
    paddingBottom: spacing(4.5),
    gap: spacing(4),
  },
  scene: {
  },
  drawerContent: {
    paddingHorizontal: spacing(4),
    paddingTop: spacing(6),
    gap: spacing(5),
  },
  brand: {
    padding: spacing(4),
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
    marginTop: 'auto',
    paddingTop: spacing(2),
  },
  groupBlock: {
    gap: spacing(2.5),
  },
  groupHeading: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold as any,
    letterSpacing: typography.letterSpacing[10],
    textTransform: 'uppercase',
  },
  groupDescription: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  navItem: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  logoutLabel: {
    fontWeight: typography.fontWeight.bold as any,
    fontSize: typography.fontSize[15],
  },
  pressed: {
    opacity: 0.85,
  },
});
