import { Platform } from "react-native";

const shadowBase = (elevation: number, opacity: number) =>
  Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: opacity,
      shadowRadius: elevation * 2,
    },
    android: {
      elevation: elevation * 2,
    },
    default: {},
  });

export const shadows = {
  none: {},
  sm: shadowBase(1, 0.06),
  md: shadowBase(2, 0.08),
  lg: shadowBase(4, 0.1),
  xl: shadowBase(8, 0.12),

  card: shadowBase(2, 0.08),
  button: shadowBase(1, 0.06),
  modal: shadowBase(8, 0.15),
};