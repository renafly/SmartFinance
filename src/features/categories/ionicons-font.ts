import { Asset } from "expo-asset";
import { Ionicons } from "@expo/vector-icons";
// The same TTF @expo/vector-icons/Ionicons renders everywhere else in this
// app (sidebar rows, detail panel, etc.) — imported directly here so any 3D
// graph can draw the exact same glyphs as vector geometry via drei's Text
// (see category-graph-scene.tsx, category-spend-graph-scene.tsx), instead
// of duplicating an icon set.
// eslint-disable-next-line import/no-unresolved
import ioniconsFontAsset from "@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf";

let cachedUri: string | null = null;

// Metro resolves .ttf imports differently per platform: a fetchable URL
// string on web, an opaque asset module id (number) on native. Troika (the
// text renderer behind drei's <Text>) just needs a URL it can fetch, so
// normalize both into that.
export function getIoniconsFontUri(): string {
  if (cachedUri) return cachedUri;
  cachedUri = typeof ioniconsFontAsset === "string" ? ioniconsFontAsset : Asset.fromModule(ioniconsFontAsset).uri;
  return cachedUri;
}

const IONICONS_GLYPH_MAP = Ionicons.glyphMap as unknown as Record<string, number>;
const FALLBACK_ICON_GLYPH = String.fromCodePoint(IONICONS_GLYPH_MAP["ellipse-outline"]);

// Maps an Ionicons name (e.g. "cart-outline") to the single Unicode
// character troika needs to render that glyph via the Ionicons font.
export function iconGlyphFor(iconName: string): string {
  const codePoint = IONICONS_GLYPH_MAP[iconName];
  return typeof codePoint === "number" ? String.fromCodePoint(codePoint) : FALLBACK_ICON_GLYPH;
}
