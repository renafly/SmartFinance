import { sessionRepository } from './session.repository';

export class SessionService {
  async loadProfileAndHousehold(userId: string | null | undefined) {
    if (!userId) {
      return {
        profile: null,
        householdId: null,
      };
    }

    const { data: profileData, error: profileError } = await sessionRepository.getProfile(userId);
    if (profileError) throw profileError;

    const { data: membershipData, error: membershipError } =
      await sessionRepository.getAcceptedMemberships(userId);

    if (membershipError) throw membershipError;

    const memberships = (membershipData ?? []).filter((member) => {
      const household = Array.isArray(member.household)
        ? member.household[0]
        : member.household;

      return household?.deleted_at == null;
    });
    const defaultMembership = memberships.find(
      (member) => member.household_id === profileData?.default_household_id
    );
    const selectedMembership = defaultMembership ?? memberships[0] ?? null;

    return {
      profile: profileData ?? null,
      householdId: selectedMembership?.household_id ?? null,
    };
  }
}

export const sessionService = new SessionService();
