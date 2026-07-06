import { useFonts } from 'expo-font';

// Untitled UI's reference designs assume Inter. Font files themselves
// are not bundled by Forge (that would mean shipping binary font assets
// from a scaffolding template) - drop .ttf files into assets/fonts and
// this hook will pick them up once the paths below exist.
export function useUntitledFonts() {
  const [loaded, error] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  });

  return { loaded, error };
}
