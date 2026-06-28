import { TextStyle } from "react-native";

export const fontSizes = {
  xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, xxxl: 30, display: 38,
};

export const fontWeights: Record<string, TextStyle["fontWeight"]> = {
  regular: "400", medium: "500", semibold: "600", bold: "700", extrabold: "800",
};

export const lineHeights = { tight: 1.2, normal: 1.5, relaxed: 1.75 };

export const typography = {
  displayLarge: { fontSize: fontSizes.display, fontWeight: fontWeights.bold, lineHeight: fontSizes.display * 1.2 } as TextStyle,
  displaySmall: { fontSize: fontSizes.xxxl, fontWeight: fontWeights.bold, lineHeight: fontSizes.xxxl * 1.2 } as TextStyle,
  h1: { fontSize: fontSizes.xxl, fontWeight: fontWeights.bold, lineHeight: fontSizes.xxl * 1.2 } as TextStyle,
  h2: { fontSize: fontSizes.xl, fontWeight: fontWeights.semibold, lineHeight: fontSizes.xl * 1.2 } as TextStyle,
  h3: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, lineHeight: fontSizes.lg * 1.5 } as TextStyle,
  bodyLarge: { fontSize: fontSizes.md, fontWeight: fontWeights.regular, lineHeight: fontSizes.md * 1.5 } as TextStyle,
  body: { fontSize: fontSizes.sm, fontWeight: fontWeights.regular, lineHeight: fontSizes.sm * 1.5 } as TextStyle,
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, lineHeight: fontSizes.sm * 1.5 } as TextStyle,
  caption: { fontSize: fontSizes.xs, fontWeight: fontWeights.regular, lineHeight: fontSizes.xs * 1.5 } as TextStyle,
  amount: { fontSize: fontSizes.xxxl, fontWeight: fontWeights.bold, lineHeight: fontSizes.xxxl * 1.2, letterSpacing: -0.5 } as TextStyle,
  amountSmall: { fontSize: fontSizes.xl, fontWeight: fontWeights.semibold, lineHeight: fontSizes.xl * 1.2 } as TextStyle,
};