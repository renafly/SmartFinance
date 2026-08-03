import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  createCookieConsent,
  type CookieConsent,
  type CookieConsentChoices,
  type CookieConsentState,
} from "./consent";
import {
  clearOptionalPreferenceStorage,
  cookieConsentStorage,
} from "./storage";

export type CookieConsentContextValue = {
  status: "undecided" | "decided";
  consent: CookieConsentState;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (choices: CookieConsentChoices) => void;
  openPreferences: () => void;
  closePreferences: () => void;
  isPreferencesOpen: boolean;
  resetConsent: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

export function CookieConsentProvider({ children }: PropsWithChildren) {
  const [consent, setConsent] = useState<CookieConsentState>(() =>
    cookieConsentStorage.read(),
  );
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  const persistChoices = useCallback((choices: CookieConsentChoices) => {
    const nextConsent: CookieConsent = createCookieConsent(choices);
    cookieConsentStorage.write(nextConsent);
    if (!choices.preferences) clearOptionalPreferenceStorage();
    setConsent(nextConsent);
  }, []);

  const acceptAll = useCallback(() => {
    persistChoices({ preferences: true, analytics: true });
  }, [persistChoices]);

  const rejectOptional = useCallback(() => {
    persistChoices({ preferences: false, analytics: false });
  }, [persistChoices]);

  const resetConsent = useCallback(() => {
    cookieConsentStorage.clear();
    setConsent(null);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      status: consent === null ? "undecided" : "decided",
      consent,
      acceptAll,
      rejectOptional,
      savePreferences: persistChoices,
      openPreferences: () => setIsPreferencesOpen(true),
      closePreferences: () => setIsPreferencesOpen(false),
      isPreferencesOpen,
      resetConsent,
    }),
    [
      acceptAll,
      consent,
      isPreferencesOpen,
      persistChoices,
      rejectOptional,
      resetConsent,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error(
      "useCookieConsent must be used within a CookieConsentProvider.",
    );
  }
  return context;
}
