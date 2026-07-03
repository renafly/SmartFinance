import { Heading4 } from "lucide-react-native";

export const typography = {
  display: {
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 42,
  },

  h1: {
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
  },

  h2: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },

  h3: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },

  h4: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },

  body: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },

  caption: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },

  tiny: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
} as const;