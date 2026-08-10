import type { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

export type NewsPostKey =
  | "dashboardOverview"
  | "recurringPlan"
  | "savingsNextStep"
  | "transferVsExpense"
  | "householdVisibility"
  | "portableBackup";

export type NewsPost = {
  /** URL segment for /news/[slug]. Shared across locales on purpose,
   * so links don't change when the visitor switches language. */
  slug: string;
  /** Matches publicPages.news.posts.<key> in each locale file, which
   * holds the actual translated copy (meta/title/description/body). */
  key: NewsPostKey;
  /** ISO date. Language-independent; formatted per-locale at render time. */
  date: string;
  icon: MaterialIconName;
};

// Newest first. This file only holds the language-independent bits
// (routing slug, date, icon) — translated copy lives in
// publicPages.news.posts.<key> in src/locales/*/common.json.
export const newsPosts: NewsPost[] = [
  {
    slug: "dashboard-in-one-view",
    key: "dashboardOverview",
    date: "2026-07-28",
    icon: "dashboard",
  },
  {
    slug: "plan-recurring-expenses",
    key: "recurringPlan",
    date: "2026-07-14",
    icon: "repeat",
  },
  {
    slug: "savings-goal-next-step",
    key: "savingsNextStep",
    date: "2026-06-30",
    icon: "savings",
  },
  {
    slug: "transfer-is-not-an-expense",
    key: "transferVsExpense",
    date: "2026-06-16",
    icon: "swap-horiz",
  },
  {
    slug: "household-visibility-boundaries",
    key: "householdVisibility",
    date: "2026-06-02",
    icon: "shield",
  },
  {
    slug: "portable-household-backup",
    key: "portableBackup",
    date: "2026-05-19",
    icon: "backup",
  },
];

export function getNewsPostBySlug(slug: string | undefined): NewsPost | undefined {
  if (!slug) return undefined;
  return newsPosts.find((post) => post.slug === slug);
}
