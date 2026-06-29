import { Platform } from "react-native";

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: "#111",
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffset: {
        width: 2,
        height: 2,
      },
    },
    android: {
      elevation: 3,
    },
  }),

  md: Platform.select({
    ios: {
      shadowColor: "#111",
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffset: {
        width: 4,
        height: 4,
      },
    },
    android: {
      elevation: 6,
    },
  }),

  lg: Platform.select({
    ios: {
      shadowColor: "#111",
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffset: {
        width: 6,
        height: 6,
      },
    },
    android: {
      elevation: 9,
    },
  }),
};