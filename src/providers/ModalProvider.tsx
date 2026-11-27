import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { Modal, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, PrivacyToggle } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type DialogOptions = {
  title: string;
  message?: string;
  /** Label of the confirming button; defaults to "OK". */
  confirmLabel?: string;
  /** Styles the confirming button as destructive (delete, withdraw...). */
  destructive?: boolean;
};

type ModalContextValue = {
  show: (content: ReactNode) => void;
  hide: () => void;
  /** Asks the user to confirm; resolves true on confirm, false on cancel or dismiss. */
  confirm: (options: DialogOptions) => Promise<boolean>;
  /** Shows a message with a single OK button; resolves once dismissed. */
  alert: (options: DialogOptions) => Promise<void>;
};

const ModalContext = createContext<ModalContextValue | null>(null);

// Single global modal slot. Good enough for confirmation dialogs and
// one-off sheets; a stack of modals would need a different design and
// isn't what "Nice Extras" scope calls for here.
export function ModalProvider({ children }: PropsWithChildren) {
  const [content, setContent] = useState<ReactNode>(null);
  const insets = useSafeAreaInsets();
  // Resolves the pending confirm()/alert() promise, if the slot holds a dialog.
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setContent(null);
    resolve?.(value);
  }, []);

  const show = useCallback((node: ReactNode) => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setContent(node);
  }, []);
  const hide = useCallback(() => settle(false), [settle]);

  const open = useCallback(
    (options: DialogOptions, kind: 'confirm' | 'alert') =>
      new Promise<boolean>((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setContent(
          <DialogCard
            {...options}
            kind={kind}
            onConfirm={() => settle(true)}
            onCancel={() => settle(false)}
          />,
        );
      }),
    [settle],
  );

  const value = useMemo<ModalContextValue>(
    () => ({
      show,
      hide,
      confirm: (options) => open(options, 'confirm'),
      alert: async (options) => {
        await open(options, 'alert');
      },
    }),
    [hide, open, show],
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      <Modal visible={content !== null} transparent animationType="fade" onRequestClose={hide}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
        >
          {content}
          {/* This is the single shared confirm-dialog/one-off-sheet Modal
              slot (see ModalContext.show/hide above) — RN Modals present in
              their own layer above everything else, so the global privacy
              toggle needs its own mount point here too. */}
          <PrivacyToggle />
        </View>
      </Modal>
    </ModalContext.Provider>
  );
}

/** The shared modal slot: confirm()/alert() dialogs plus show()/hide() for custom content. */
export function useDialog(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useDialog must be used within a ModalProvider.');
  return ctx;
}

type DialogCardProps = DialogOptions & {
  kind: 'confirm' | 'alert';
  onConfirm: () => void;
  onCancel: () => void;
};

function DialogCard({ title, message, confirmLabel, destructive, kind, onConfirm, onCancel }: DialogCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');

  return (
    <View
      accessibilityRole="alert"
      accessibilityViewIsModal
      style={{
        width: '90%',
        maxWidth: 440,
        gap: spacing(3),
        padding: spacing(5),
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: typography.fontSize[18], fontWeight: typography.fontWeight.bold }}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSize[14],
            lineHeight: typography.lineHeight[20],
          }}
        >
          {message}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing(2) }}>
        {kind === 'confirm' ? <Button label={t('cancel')} variant="secondary" onPress={onCancel} /> : null}
        <Button
          label={confirmLabel ?? t('ok')}
          variant={destructive ? 'danger' : 'primary'}
          onPress={onConfirm}
        />
      </View>
    </View>
  );
}
