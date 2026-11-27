import { blueColors, darkColors, lightColors, ultraColors, type ThemeColors } from "@/theme/colors";

import {
  ACCOUNT_SHADE_STEPS,
  buildAccountShadeIndexMap,
  getAccountShadeTone,
  type AccountTone,
} from "./account-shades";

// Mirrors the owner tones the transactions list builds per member
// (src/app/(protected)/transactions.tsx, `ownerTones`).
const ownerTonesFor = (colors: ThemeColors): AccountTone[] => [
  { accent: colors.primary, surface: colors.primarySoft },
  { accent: colors.financialPositive, surface: colors.financialPositiveSoft },
  { accent: colors.financialNeutral, surface: colors.financialNeutralSoft },
  { accent: colors.financialAttention, surface: colors.financialAttentionSoft },
  { accent: colors.financialGoal, surface: colors.financialGoalSoft },
];

const themes: Record<string, ThemeColors> = {
  light: lightColors,
  dark: darkColors as ThemeColors,
  blue: blueColors as ThemeColors,
  ultra: ultraColors as ThemeColors,
};

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

describe("buildAccountShadeIndexMap", () => {
  const accounts = [
    { id: "a-wallet", owner_profile_id: "member-a", created_at: "2026-02-01T00:00:00Z" },
    { id: "a-current", owner_profile_id: "member-a", created_at: "2026-01-01T00:00:00Z" },
    { id: "b-current", owner_profile_id: "member-b", created_at: "2026-01-05T00:00:00Z" },
    { id: "joint", owner_profile_id: null, created_at: "2026-01-02T00:00:00Z" },
  ];

  it("ranks accounts by creation date inside each owner group, shared included", () => {
    const shades = buildAccountShadeIndexMap(accounts);

    expect(shades.get("a-current")).toBe(0);
    expect(shades.get("a-wallet")).toBe(1);
    expect(shades.get("b-current")).toBe(0);
    expect(shades.get("joint")).toBe(0);
  });

  it("does not depend on input order", () => {
    expect(buildAccountShadeIndexMap([...accounts].reverse())).toEqual(
      buildAccountShadeIndexMap(accounts),
    );
  });

  it("gives a new account the next shade without changing existing ones", () => {
    const before = buildAccountShadeIndexMap(accounts);
    const after = buildAccountShadeIndexMap([
      ...accounts,
      { id: "a-savings", owner_profile_id: "member-a", created_at: "2026-03-01T00:00:00Z" },
    ]);

    for (const [id, shade] of before) expect(after.get(id)).toBe(shade);
    expect(after.get("a-savings")).toBe(2);
  });

  it("puts accounts without a creation date last and breaks ties by id", () => {
    const shades = buildAccountShadeIndexMap([
      { id: "z", owner_profile_id: "m" },
      { id: "b", owner_profile_id: "m", created_at: "2026-01-01T00:00:00Z" },
      { id: "a", owner_profile_id: "m", created_at: "2026-01-01T00:00:00Z" },
      { id: null, owner_profile_id: "m" },
    ]);

    expect([...shades.entries()].sort((x, y) => x[1] - y[1])).toEqual([
      ["a", 0],
      ["b", 1],
      ["z", 2],
    ]);
  });

  it("repeats the ladder once an owner has more accounts than shades", () => {
    const many = Array.from({ length: ACCOUNT_SHADE_STEPS.length + 1 }, (_, index) => ({
      id: `acc-${index}`,
      owner_profile_id: "m",
      created_at: `2026-01-0${index + 1}T00:00:00Z`,
    }));

    expect(buildAccountShadeIndexMap(many).get(`acc-${ACCOUNT_SHADE_STEPS.length}`)).toBe(0);
  });
});

describe("getAccountShadeTone", () => {
  it("keeps the owner's tone unchanged for the first shade and for unknown accounts", () => {
    const [tone] = ownerTonesFor(lightColors);

    expect(getAccountShadeTone(tone, 0, lightColors)).toEqual({
      accent: tone.accent.toLowerCase(),
      surface: tone.surface.toLowerCase(),
    });
    expect(getAccountShadeTone(tone, undefined, lightColors)).toEqual(
      getAccountShadeTone(tone, 0, lightColors),
    );
  });

  it.each(Object.entries(themes))("produces distinct shades of each owner tone (%s)", (_, colors) => {
    for (const tone of ownerTonesFor(colors)) {
      const shades = ACCOUNT_SHADE_STEPS.map((__, index) =>
        JSON.stringify(getAccountShadeTone(tone, index, colors)),
      );
      expect(new Set(shades).size).toBe(ACCOUNT_SHADE_STEPS.length);
    }
  });

  it.each(Object.entries(themes))("keeps every shade readable (%s)", (_, colors) => {
    for (const tone of ownerTonesFor(colors)) {
      const baseSecondary = contrast(colors.textSecondary, tone.surface);
      const baseAmount = Math.min(
        contrast(colors.destructive, tone.surface),
        contrast(colors.success, tone.surface),
      );

      ACCOUNT_SHADE_STEPS.forEach((__, index) => {
        const shade = getAccountShadeTone(tone, index, colors);

        expect(contrast(colors.text, shade.surface)).toBeGreaterThanOrEqual(4.5);
        // Never less readable than the owner's unshaded tone (or AA, if
        // that is lower).
        expect(contrast(colors.textSecondary, shade.surface)).toBeGreaterThanOrEqual(
          Math.min(4.5, baseSecondary) - 0.05,
        );
        expect(
          Math.min(
            contrast(colors.destructive, shade.surface),
            contrast(colors.success, shade.surface),
          ),
        ).toBeGreaterThanOrEqual(Math.min(4.5, baseAmount) - 0.05);
        // Non-text contrast for the left stripe against its own row.
        expect(contrast(shade.accent, shade.surface)).toBeGreaterThanOrEqual(3);
      });
    }
  });
});
