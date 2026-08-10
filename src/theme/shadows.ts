import { Platform } from 'react-native';

// react-native's shadow API differs per platform (iOS: shadow*, Android:
// elevation) - this centralizes the split so components just pick
// shadows.sm / shadows.md rather than branching on Platform.OS
// themselves.
//
// Redesign 2026-08: the new direction is flat surfaces with a hairline
// border doing the separation work instead of drop shadow, so these are
// intentionally much subtler than before. Kept (rather than removed) for
// the few floating/overlay surfaces — menus, modals — that still want a
// touch of elevation.
function makeShadow(elevation: number) {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: 0.04,
      shadowRadius: elevation,
    },
    android: { elevation },
    default: {},
  });
}

export const shadows = {
  sm: makeShadow(1),
  md: makeShadow(2),
  lg: makeShadow(3),
};
