import {
  getCompletedGuideVersion,
  shouldShowOnboardingGuide,
} from './profiles.service';

describe('versioned onboarding guides', () => {
  it('shows a guide until its current version has been completed', () => {
    const guides = { dashboard: 1 };

    expect(shouldShowOnboardingGuide(guides, { key: 'dashboard', version: 1 })).toBe(false);
    expect(shouldShowOnboardingGuide(guides, { key: 'dashboard', version: 2 })).toBe(true);
    expect(shouldShowOnboardingGuide(guides, { key: 'saving-pots', version: 1 })).toBe(true);
  });

  it('uses zero as the completion version for unseen guides', () => {
    expect(getCompletedGuideVersion({}, 'transactions')).toBe(0);
  });
});
