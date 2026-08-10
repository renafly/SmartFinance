import { create } from 'zustand';
import { getPersistentString, setPersistentString } from '@/shared/lib/persistent-storage';

// Session-and-device-persisted "privacy mode" for the dashboard: when on,
// every currency figure on the dashboard (hero total, metric cards,
// allocations, per-person breakdown, account table, recent transactions,
// and the accounts network) is masked. Global (not per-screen) so a single
// floating toggle controls all of it at once, mirroring the theme store.
const PRIVACY_STORAGE_KEY = 'smartfinance.hideValues';

type PrivacyState = {
  hideValues: boolean;
  toggleHideValues: () => void;
  setHideValues: (value: boolean) => void;
};

function getStoredHideValues(): boolean {
  try {
    return getPersistentString(PRIVACY_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export const usePrivacyStore = create<PrivacyState>((set, get) => ({
  hideValues: getStoredHideValues(),
  toggleHideValues: () => {
    const next = !get().hideValues;
    setPersistentString(PRIVACY_STORAGE_KEY, next ? '1' : '0');
    set({ hideValues: next });
  },
  setHideValues: (value) => {
    setPersistentString(PRIVACY_STORAGE_KEY, value ? '1' : '0');
    set({ hideValues: value });
  },
}));
