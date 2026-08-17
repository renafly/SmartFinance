import { createContext, useCallback, useContext, useState, type PropsWithChildren, type ReactNode } from 'react';
import { Modal, View } from 'react-native';

import { PrivacyToggle } from '@/components/migrated-page';

type ModalContextValue = {
  show: (content: ReactNode) => void;
  hide: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

// Single global modal slot. Good enough for confirmation dialogs and
// one-off sheets; a stack of modals would need a different design and
// isn't what "Nice Extras" scope calls for here.
export function ModalProvider({ children }: PropsWithChildren) {
  const [content, setContent] = useState<ReactNode>(null);

  const show = useCallback((node: ReactNode) => setContent(node), []);
  const hide = useCallback(() => setContent(null), []);

  return (
    <ModalContext.Provider value={{ show, hide }}>
      {children}
      <Modal visible={content !== null} transparent animationType="fade" onRequestClose={hide}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          {content}
          {/* This is the single shared confirm-dialog/one-off-sheet Modal
              used app-wide via useModal().show(...) — RN Modals present in
              their own layer above everything else, so the global privacy
              toggle needs its own mount point here too. */}
          <PrivacyToggle />
        </View>
      </Modal>
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within a ModalProvider.');
  return ctx;
}
