import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { Drawer } from 'expo-router/drawer';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerStyle: styles.drawer,
        sceneContainerStyle: styles.scene,
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
  const pathname = usePathname();

  return (
    <View style={styles.drawerContent}>
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>SmartFinance</Text>
        <Text style={styles.brandSubtitle}>Household finance workspace</Text>
      </View>

      <View style={styles.navList}>
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && styles.pressed]}
            >
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: '#07111F',
    width: 280,
  },
  scene: {
    backgroundColor: '#07111F',
  },
  drawerContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 20,
  },
  brand: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6,
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
  },
  brandSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
  },
  navList: {
    gap: 8,
  },
  navItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  navItemActive: {
    backgroundColor: '#111C31',
    borderColor: '#7DD3FC',
  },
  navLabel: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 15,
  },
  navLabelActive: {
    color: '#F8FAFC',
  },
  pressed: {
    opacity: 0.85,
  },
});
