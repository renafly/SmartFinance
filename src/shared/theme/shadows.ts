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
    web: {
      boxShadow: "2px 2px 0px rgba(17, 17, 17, 0.3)",
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
    web: {
      boxShadow: "4px 4px 0px rgba(17, 17, 17, 0.3)",
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
    web: {
      boxShadow: "6px 6px 0px rgba(17, 17, 17, 0.3)",
    },
  }),
};