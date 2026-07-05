import { Platform } from "react-native";
import { colorScheme } from "./colors";

// Modern, soft, diffused shadows (no hard neo-brutalist offsets).
const shadowColor = "#0F172A";
const opacity = colorScheme === "dark" ? 0.5 : 0.08;

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor,
      shadowOpacity: opacity,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: `0px 1px 3px rgba(15, 23, 42, ${opacity})`,
    },
  }),

  md: Platform.select({
    ios: {
      shadowColor,
      shadowOpacity: opacity,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: `0px 6px 18px rgba(15, 23, 42, ${opacity})`,
    },
  }),

  lg: Platform.select({
    ios: {
      shadowColor,
      shadowOpacity: opacity + 0.02,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 12 },
    },
    android: {
      elevation: 8,
    },
    web: {
      boxShadow: `0px 14px 40px rgba(15, 23, 42, ${opacity + 0.02})`,
    },
  }),
};
