import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  profilesService,
  type OnboardingGuideDefinition,
} from '@/features/profiles/services/profiles.service';
import { useAuth } from '@/providers/AuthProvider';

const onboardingGuidesKey = (profileId: string | undefined) => [
  'onboarding-guides',
  profileId,
];

export function useOnboardingGuides() {
  const { profile, isLoading } = useAuth();

  return useQuery({
    queryKey: onboardingGuidesKey(profile?.id),
    queryFn: () => profilesService.getOnboardingGuides(),
    enabled: Boolean(profile?.id) && !isLoading,
  });
}

export function useCompleteOnboardingGuide() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (guide: OnboardingGuideDefinition) =>
      profilesService.completeOnboardingGuide(guide),
    onSuccess: (guides) => {
      queryClient.setQueryData(onboardingGuidesKey(profile?.id), guides);
    },
  });
}
