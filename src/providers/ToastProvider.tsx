import { createContext, useCallback, useContext, useState, type PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type Toast = { id: number; message: string };

type ToastContextValue = {
  show: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// Simple auto-dismissing toast, one at a time. See UX extras (item 37)
// for where a design system might replace this with a nicer animated
// version - this establishes the hook API (useToast().show(...)) that
// the rest of the app should keep using either way.
export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<Toast | null>(null);
  // Toasts render above everything (including whatever screen/Modal is on
  // top), so a fixed bottom offset has to account for the iOS home
  // indicator and the Android system nav bar itself - a flat `bottom: 48`
  // put the toast under gesture-nav pills on some Android devices and
  // right on top of the home indicator on others.
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const show = useCallback((message: string) => {
    const id = Date.now();
    setToast({ id, message });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            bottom: spacing(6) + insets.bottom,
            left: spacing(6),
            right: spacing(6),
            alignSelf: 'center',
            maxWidth: 480,
            marginHorizontal: 'auto',
            // Inverted surface so the toast stands out in light and dark mode
            // (a fixed #111 vanished against the dark theme's background).
            backgroundColor: colors.text,
            borderRadius: radius.md,
            paddingVertical: spacing(3),
            paddingHorizontal: spacing(4),
          }}
        >
          <Text style={{ color: colors.background, textAlign: 'center', fontSize: typography.fontSize[14] }}>
            {toast.message}
          </Text>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider.');
  return ctx;
}
