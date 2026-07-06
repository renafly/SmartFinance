import { create } from 'zustand';

type PreferencesState = {
  language: string;
  setLanguage: (language: string) => void;
};

// Default seeded from the wizard's Languages answer - first selected
// language becomes the initial preference.
export const usePreferencesStore = create<PreferencesState>((set) => ({
  language: 'en',
  setLanguage: (language) => set({ language }),
}));
