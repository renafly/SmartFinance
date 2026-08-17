import { create } from 'zustand';

// Global "privacy mode": when on, every currency figure app-wide (dashboard,
// accounts, transactions, budget, saving pots, wage flow, account/destination
// pickers, etc.) is masked. A single floating toggle (rendered by the shared
// `Page` component) controls all of it at once.
//
// Deliberately NOT persisted to device storage: values must always start
// hidden on a fresh login/app open, regardless of what the user chose last
// time (AuthProvider resets this to `true` on every SIGNED_IN event as a
// belt-and-suspenders reset). Within a single running session, revealing
// values sticks until the user hides them again or the session ends.
type PrivacyState = {
  hideValues: boolean;
  toggleHideValues: () => void;
  setHideValues: (value: boolean) => void;
};

export const usePrivacyStore = create<PrivacyState>((set, get) => ({
  hideValues: true,
  toggleHideValues: () => set({ hideValues: !get().hideValues }),
  setHideValues: (value) => set({ hideValues: value }),
}));
