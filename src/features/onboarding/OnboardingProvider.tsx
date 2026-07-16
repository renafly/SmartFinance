import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { getOnboardingGuide } from './guides';
import type {
  OnboardingGuide,
  OnboardingGuideKey,
  OnboardingPersistenceAdapter,
  OnboardingProgress,
} from './types';

type OnboardingContextValue = {
  visible: boolean;
  currentGuide: OnboardingGuide | null;
  currentStepIndex: number;
  currentStep: OnboardingGuide['steps'][number] | null;
  isLoading: boolean;
  openGuide: (key: OnboardingGuideKey) => void;
  completeCurrentGuide: () => void;
  dismiss: () => void;
  next: () => void;
  previous: () => void;
  hasCompleted: (key: OnboardingGuideKey) => boolean;
  shouldShowGuide: (key: OnboardingGuideKey) => boolean;
};

const emptyProgress = (): OnboardingProgress => ({ completedVersions: {}, dismissedVersions: {} });

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

type OnboardingProviderProps = PropsWithChildren<{
  persistenceAdapter?: OnboardingPersistenceAdapter;
}>;

export function OnboardingProvider({ children, persistenceAdapter }: OnboardingProviderProps) {
  const [progress, setProgress] = useState<OnboardingProgress>(emptyProgress);
  const [currentGuide, setCurrentGuide] = useState<OnboardingGuide | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoadingAdapter, setIsLoadingAdapter] = useState(Boolean(persistenceAdapter));
  const [loadedAdapter, setLoadedAdapter] = useState<OnboardingPersistenceAdapter | undefined>(persistenceAdapter);
  const isLoading = isLoadingAdapter || (Boolean(persistenceAdapter) && loadedAdapter !== persistenceAdapter);

  useEffect(() => {
    let isActive = true;

    if (!persistenceAdapter) {
      setIsLoadingAdapter(false);
      setLoadedAdapter(undefined);
      return () => {
        isActive = false;
      };
    }

    setIsLoadingAdapter(true);

    void persistenceAdapter.load().then((savedProgress) => {
      if (!isActive) return;
      setProgress(savedProgress ?? emptyProgress());
      setLoadedAdapter(persistenceAdapter);
      setIsLoadingAdapter(false);
    }).catch(() => {
      if (!isActive) return;
      setLoadedAdapter(persistenceAdapter);
      setIsLoadingAdapter(false);
    });

    return () => {
      isActive = false;
    };
  }, [persistenceAdapter]);

  const saveProgress = (nextProgress: OnboardingProgress) => {
    setProgress(nextProgress);
    if (persistenceAdapter) {
      void persistenceAdapter.save(nextProgress).catch(() => undefined);
    }
  };

  const closeGuide = () => {
    setCurrentGuide(null);
    setCurrentStepIndex(0);
  };

  const completeCurrentGuide = () => {
    if (!currentGuide) return;
    saveProgress({
      ...progress,
      completedVersions: {
        ...progress.completedVersions,
        [currentGuide.key]: currentGuide.version,
      },
    });
    closeGuide();
  };

  const dismiss = () => {
    if (currentGuide) {
      saveProgress({
        ...progress,
        dismissedVersions: {
          ...progress.dismissedVersions,
          [currentGuide.key]: currentGuide.version,
        },
      });
    }
    closeGuide();
  };

  const currentStep = currentGuide?.steps[currentStepIndex] ?? null;
  const lastStepIndex = currentGuide ? currentGuide.steps.length - 1 : 0;

  return (
    <OnboardingContext.Provider
      value={{
        visible: currentGuide !== null,
        currentGuide,
        currentStepIndex,
        currentStep,
        isLoading,
        openGuide: (key) => {
          setCurrentGuide(getOnboardingGuide(key));
          setCurrentStepIndex(0);
        },
        completeCurrentGuide,
        dismiss,
        next: () => {
          if (currentStepIndex < lastStepIndex) setCurrentStepIndex((index) => index + 1);
          else completeCurrentGuide();
        },
        previous: () => {
          if (currentStepIndex > 0) setCurrentStepIndex((index) => index - 1);
        },
        hasCompleted: (key) => (progress.completedVersions[key] ?? 0) >= getOnboardingGuide(key).version,
        shouldShowGuide: (key) => {
          const guide = getOnboardingGuide(key);
          return (progress.completedVersions[key] ?? 0) < guide.version && (progress.dismissedVersions[key] ?? 0) < guide.version;
        },
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within an OnboardingProvider.');
  return context;
}
