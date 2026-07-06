import { Platform } from 'react-native';

// react-native's shadow API differs per platform (iOS: shadow*, Android:
// elevation) - this centralizes the split so components just pick
// shadows.sm / shadows.md rather than branching on Platform.OS
// themselves.
function makeShadow(elevation: number) {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: 0.1,
      shadowRadius: elevation,
    },
    android: { elevation },
    default: {},
  });
}

export const shadows = {
  sm: makeShadow(2),
  md: makeShadow(4),
  lg: makeShadow(8),
};
