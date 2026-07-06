import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { UnleashClient } from 'unleash-proxy-client';
import { DEFAULT_FLAGS, type FeatureFlagKey } from '../services/FeatureService';

type FeatureFlagContextValue = {
  isEnabled: (key: FeatureFlagKey) => boolean;
  ready: boolean;
};

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  isEnabled: (key) => DEFAULT_FLAGS[key],
  ready: false,
});

// Reads Unleash proxy URL/client key from .env (EXPO_PUBLIC_UNLEASH_URL,
// EXPO_PUBLIC_UNLEASH_CLIENT_KEY - see item 45). Falls back to
// DEFAULT_FLAGS (local fallback) if those aren't set or the client
// fails to start, so a missing Unleash proxy never crashes the app.
export function FeatureFlagProvider({ children }: PropsWithChildren) {
  const [client, setClient] = useState<UnleashClient | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = process.env.EXPO_PUBLIC_UNLEASH_URL;
    const clientKey = process.env.EXPO_PUBLIC_UNLEASH_CLIENT_KEY;

    if (!url || !clientKey) {
      console.warn('[SmartFinance] Unleash env vars missing, using local fallback flags.');
      setReady(true);
      return;
    }

    const unleash = new UnleashClient({
      url,
      clientKey,
      appName: 'SmartFinance',
      refreshInterval: 30,
    });

    unleash.on('ready', () => setReady(true));
    unleash.on('error', (err: unknown) => console.warn('[SmartFinance] Unleash error, using local fallback:', err));
    unleash.start();
    setClient(unleash);

    return () => unleash.stop();
  }, []);

  function isEnabled(key: FeatureFlagKey): boolean {
    if (!client || !ready) return DEFAULT_FLAGS[key];
    try {
      return client.isEnabled(key);
    } catch {
      return DEFAULT_FLAGS[key];
    }
  }

  return <FeatureFlagContext.Provider value={{ isEnabled, ready }}>{children}</FeatureFlagContext.Provider>;
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  return useContext(FeatureFlagContext).isEnabled(key);
}
