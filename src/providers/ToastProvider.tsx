import { createContext, useCallback, useContext, useState, type PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

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
        <View style={{ position: 'absolute', bottom: 48, left: 24, right: 24, backgroundColor: '#111', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>{toast.message}</Text>
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
