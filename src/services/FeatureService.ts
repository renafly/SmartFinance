// Typed flags - the single source of truth for which flag keys exist in
// SmartFinance. Add new flags here first so both the provider and
// every call site stay in sync via TypeScript.
export type FeatureFlagKey = 'exampleFeature';

export const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
  exampleFeature: false,
};
