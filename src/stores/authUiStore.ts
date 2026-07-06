import { create } from 'zustand';

// UI-only auth state (e.g. "is the login sheet open", "which provider is
// mid-flow") - NOT the session itself. The session lives in the auth
// provider or the backend client (e.g. Supabase). Keeping these separate
// avoids a store fighting the SDK for source-of-truth on the session.
type AuthUiState = {
  isAuthSheetOpen: boolean;
  pendingProvider: string | null;
  openAuthSheet: () => void;
  closeAuthSheet: () => void;
  setPendingProvider: (provider: string | null) => void;
};

export const useAuthUiStore = create<AuthUiState>((set) => ({
  isAuthSheetOpen: false,
  pendingProvider: null,
  openAuthSheet: () => set({ isAuthSheetOpen: true }),
  closeAuthSheet: () => set({ isAuthSheetOpen: false, pendingProvider: null }),
  setPendingProvider: (provider) => set({ pendingProvider: provider }),
}));
