import type { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../config/i18n";
import { ThemeProvider } from "../theme/ThemeProvider";
import { AuthProvider } from "./AuthProvider";
import { FeatureFlagProvider } from "./FeatureFlagProvider";
import { ModalProvider } from "./ModalProvider";
import { QueryProvider } from "./QueryProvider";
import { ToastProvider } from "./ToastProvider";
import { NotificationsProvider } from "./NotificationsProvider";
import { ProfileOnboardingProvider } from "@/features/onboarding/ProfileOnboardingProvider";
import { CookieConsentProvider } from "@/features/cookie-consent";

// Composition order matters: SafeAreaProvider must be the outermost
// wrapper so every descendant - including expo-router's own Stack/Drawer
// headers, and every Modal-based sheet mounted deeper in the tree - can
// read accurate device insets via useSafeAreaInsets(). Without it, insets
// fall back to a static/zero measurement, which is what let content sit
// under the Android system nav bar and the iOS notch/home indicator.
// Theme and Query are foundational after that (most other providers may
// want colors or query hooks), Auth needs Query available above it if it
// ever adds query-backed session refresh, FeatureFlags is independent,
// and Modal/Toast are UI-layer so they wrap innermost, closest to the
// screens that call useModal()/useToast().
export function RootProvider({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CookieConsentProvider>
          <QueryProvider>
            <AuthProvider>
              <ProfileOnboardingProvider>
                <FeatureFlagProvider>
                  <ModalProvider>
                    <ToastProvider>
                      <NotificationsProvider>{children}</NotificationsProvider>
                    </ToastProvider>
                  </ModalProvider>
                </FeatureFlagProvider>
              </ProfileOnboardingProvider>
            </AuthProvider>
          </QueryProvider>
        </CookieConsentProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
