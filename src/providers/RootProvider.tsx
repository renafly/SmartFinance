import type { PropsWithChildren } from "react";
import "../config/i18n";
import { ThemeProvider } from "../theme/ThemeProvider";
import { AuthProvider } from "./AuthProvider";
import { FeatureFlagProvider } from "./FeatureFlagProvider";
import { ModalProvider } from "./ModalProvider";
import { QueryProvider } from "./QueryProvider";
import { ToastProvider } from "./ToastProvider";

// Composition order matters: Theme and Query are foundational (most
// other providers may want colors or query hooks), Auth needs Query
// available above it if it ever adds query-backed session refresh,
// FeatureFlags is independent, and Modal/Toast are UI-layer so they
// wrap innermost, closest to the screens that call useModal()/useToast().
export function RootProvider({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <FeatureFlagProvider>
            <ModalProvider>
              <ToastProvider>{children}</ToastProvider>
            </ModalProvider>
          </FeatureFlagProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
