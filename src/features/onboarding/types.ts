export const onboardingGuideKeys = [
  'initial',
  'dashboard',
  'accounts',
  'transactions',
  'transfers',
  'budget',
  'savings',
  'categories',
  'members',
  'settings',
] as const;

export type OnboardingGuideKey = (typeof onboardingGuideKeys)[number];
export type OnboardingLocale = 'pt' | 'en';

export type GuideCopy = {
  title: string;
  body: string;
};

export type GuideStep = {
  key: string;
  copy: Record<OnboardingLocale, GuideCopy>;
};

export type OnboardingGuide = {
  key: OnboardingGuideKey;
  version: number;
  /** Guides marked automatic appear once when this exact guide version is new. */
  autoShow?: boolean;
  steps: readonly GuideStep[];
};

/**
 * Persisted progress is versioned per guide. Raising a guide version makes
 * only that guide eligible to be shown again when its content changes.
 */
export type OnboardingProgress = {
  completedVersions: Partial<Record<OnboardingGuideKey, number>>;
  dismissedVersions: Partial<Record<OnboardingGuideKey, number>>;
};

/**
 * Keep storage behind this adapter so Supabase or local persistence can be
 * wired in without changing guide UI or screen-level consumers.
 */
export type OnboardingPersistenceAdapter = {
  load: () => Promise<OnboardingProgress | null>;
  save: (progress: OnboardingProgress) => Promise<void>;
};
