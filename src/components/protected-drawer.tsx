import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { Drawer } from 'expo-router/drawer';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

const items = [
  { label: 'Dashboard', href: '/(protected)' },
  { label: 'Accounts', href: '/(protected)/accounts' },
  { label: 'Transactions', href: '/(protected)/transactions' },
  { label: 'Transfers', href: '/(protected)/transfers' },
  { label: 'Savings', href: '/(protected)/savings' },
  { label: 'Recurring', href: '/(protected)/recurring' },
  { label: 'Categories', href: '/(protected)/categories' },
  { label: 'Members', href: '/(protected)/members' },
  { label: 'Settings', href: '/(protected)/settings' },
];

export function ProtectedDrawerLayout() {
  const { colors } = useTheme();

  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerStyle: [styles.drawer, { backgroundColor: colors.background, borderColor: colors.border }],
        sceneContainerStyle: { backgroundColor: colors.background },
        drawerType: Platform.OS === 'web' ? 'permanent' : 'front',
      }}
      drawerContent={DrawerContent}
    >
      <Drawer.Screen name="index" options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="accounts" options={{ title: 'Accounts' }} />
      <Drawer.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Drawer.Screen name="transfers" options={{ title: 'Transfers' }} />
      <Drawer.Screen name="savings" options={{ title: 'Savings' }} />
      <Drawer.Screen name="recurring" options={{ title: 'Recurring' }} />
      <Drawer.Screen name="categories" options={{ title: 'Categories' }} />
      <Drawer.Screen name="members" options={{ title: 'Members' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}

function DrawerContent(_props: DrawerContentComponentProps) {
  const { t } = useTranslation('common');
  const pathname = usePathname();
  const { logout } = useAuth();
  const { colors } = useTheme();

  const menuGroups = [
    {
      title: t('drawer.overview', { defaultValue: 'Overview' }),
      description: t('drawer.overviewDescription', { defaultValue: 'Start here and jump to the most-used surfaces.' }),
      items: [
        { label: t('drawer.dashboard'), href: '/(protected)' },
        { label: t('drawer.accounts'), href: '/(protected)/accounts' },
        { label: t('drawer.transactions'), href: '/(protected)/transactions' },
      ],
    },
    {
      title: t('drawer.moneyMovement', { defaultValue: 'Money movement' }),
      description: t('drawer.moneyMovementDescription', { defaultValue: 'Move funds and review recurring flows.' }),
      items: [
        { label: t('drawer.transfers'), href: '/(protected)/transfers' },
        { label: t('drawer.savings'), href: '/(protected)/savings' },
        { label: t('drawer.recurring'), href: '/(protected)/recurring' },
      ],
    },
    {
      title: t('drawer.administration', { defaultValue: 'Administration' }),
      description: t('drawer.administrationDescription', { defaultValue: 'Manage how the household is structured.' }),
      items: [
        { label: t('drawer.categories'), href: '/(protected)/categories' },
        { label: t('drawer.members'), href: '/(protected)/members' },
        { label: t('drawer.settings'), href: '/(protected)/settings' },
      ],
    },
  ];

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webShell, { backgroundColor: colors.background }]}>
        <View style={[styles.brand, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>SmartFinance</Text>
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
            <Text style={[styles.logoutLabel, { color: colors.background }]}>{t('logout')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.drawerContent, { backgroundColor: colors.background }]}>
      <View style={[styles.brand, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Text style={[styles.brandTitle, { color: colors.foreground }]}>SmartFinance</Text>
        <Text style={[styles.brandSubtitle, { color: colors.foreground, opacity: 0.72 }]}>{t('drawer.subtitle')}</Text>
      </View>

      <View style={styles.navList}>
        {items.map((item) => {
          const active = pathname === item.href;

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
              <Text style={[styles.navLabel, { color: active ? colors.background : colors.foreground }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => void logout()} style={({ pressed }) => [styles.logoutButton, { backgroundColor: colors.destructive, borderColor: colors.destructive }, pressed && styles.pressed]}>
          <Text style={[styles.logoutLabel, { color: colors.background }]}>{t('logout')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: typography.fontWeight.extraBold,
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
    fontWeight: typography.fontWeight.extraBold,
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
  },
  navLabel: {
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize[15],
  },
  logoutButton: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3.5),
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  logoutLabel: {
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize[15],
  },
  pressed: {
    opacity: 0.85,
  },
});
