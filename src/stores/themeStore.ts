import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

// Default seeded from the wizard's Theme answer ('dark').
export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  setMode: (mode) => set({ mode }),
}));
