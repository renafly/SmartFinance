import { Slot } from "expo-router";

import AppShell from "@/components/layout/AppShell";

export default function AppLayout() {
  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}