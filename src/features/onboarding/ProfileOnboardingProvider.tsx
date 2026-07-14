import { useEffect, useMemo, type PropsWithChildren } from 'react';

import { useCompleteOnboardingGuide, useOnboardingGuides } from '@/features/profiles/hooks';
import { useAuth } from '@/providers/AuthProvider';
import type { OnboardingGuides } from '@/repositories/profiles.repository';

import { GuideModal } from './GuideModal';
import { onboardingGuides } from './guides';
import { OnboardingProvider, useOnboarding } from './OnboardingProvider';
import type { OnboardingPersistenceAdapter, OnboardingProgress } from './types';

function toProgress(guides: OnboardingGuides): OnboardingProgress {
  // Dismissing a guide means the user has seen it; one server-side version map stores both outcomes.
  return { completedVersions: guides, dismissedVersions: guides };
}

function AutomaticGuideLauncher({ ready }: { ready: boolean }) {
  const { isLoading, openGuide, shouldShowGuide, visible } = useOnboarding();

  useEffect(() => {
    if (!ready || isLoading || visible) return;

    const guide = Object.values(onboardingGuides).find(
      (item) => item.autoShow && shouldShowGuide(item.key),
    );

    if (guide) openGuide(guide.key);
  }, [isLoading, openGuide, ready, shouldShowGuide, visible]);

  return null;
}

export function ProfileOnboardingProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const guidesQuery = useOnboardingGuides();
  const { mutateAsync: completeGuide } = useCompleteOnboardingGuide();

  const persistenceAdapter = useMemo<OnboardingPersistenceAdapter | undefined>(() => {
    if (!profile?.id || !guidesQuery.isSuccess) return undefined;

    const savedGuides = guidesQuery.data ?? {};
    return {
      load: async () => toProgress(savedGuides),
      save: async (progress) => {
        const seenVersions = { ...progress.dismissedVersions, ...progress.completedVersions };
        const pendingCompletions = Object.entries(seenVersions).filter(
          ([key, version]) => (savedGuides[key] ?? 0) < version,
        );

        await Promise.all(
          pendingCompletions.map(([key, version]) => completeGuide({ key, version })),
        );
      },
    };
  }, [completeGuide, guidesQuery.data, guidesQuery.isSuccess, profile?.id]);

  return (
    <OnboardingProvider persistenceAdapter={persistenceAdapter}>
      <AutomaticGuideLauncher ready={Boolean(profile?.id) && guidesQuery.isSuccess} />
      {children}
      <GuideModal />
    </OnboardingProvider>
  );
}
