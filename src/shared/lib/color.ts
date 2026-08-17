/**
 * Plain hex color math with no UI-framework dependency (no react-native,
 * no three.js) so it can be reused from pure data/aggregation modules as
 * well as components. Currently used to derive a family of shades for a
 * single base color, e.g. splitting a Wage Flow category's flow segment
 * into one shade per contributing subcategory while keeping them visually
 * grouped under the same base hue.
 */

type Rgb = { r: number; g: number; b: number };

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function hexToRgb(hex: string): Rgb | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return null;

  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (value: number) => clampByte(value).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Linearly mixes `baseHex` toward `towardHex` by `ratio` (0 = pure base, 1 =
 * pure target). Falls back to the base color unchanged if either hex is
 * unparseable, so callers never have to guard against invalid palette
 * values. */
export function mixHexColors(baseHex: string, towardHex: string, ratio: number): string {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(towardHex);
  if (!base || !target) return baseHex;

  const clamped = clamp01(ratio);
  const mix = (a: number, b: number) => a + (b - a) * clamped;

  return rgbToHex({
    r: mix(base.r, target.r),
    g: mix(base.g, target.g),
    b: mix(base.b, target.b),
  });
}

/**
 * Produces `count` shades of `baseHex`, ordered from the true base color
 * (index 0) to progressively lighter tints (toward `towardHex`, white by
 * default). Intended for ranking contributors by size (largest first) so
 * the biggest contributor reads as the "true" category color and smaller
 * ones as lighter variants of it -- keeping the whole family visually tied
 * to the same base hue instead of looking like unrelated colors.
 */
export function generateColorShades(
  baseHex: string,
  count: number,
  options?: { towardHex?: string; maxRatio?: number },
): string[] {
  if (count <= 1) return [baseHex];

  const towardHex = options?.towardHex ?? "#FFFFFF";
  const maxRatio = options?.maxRatio ?? 0.62;

  return Array.from({ length: count }, (_, index) =>
    mixHexColors(baseHex, towardHex, (index / (count - 1)) * maxRatio),
  );
}
