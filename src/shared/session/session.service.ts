import { sessionRepository } from "./session.repository"
import { UserProfile } from "./session.types"

export class SessionService {
  async load(profile: UserProfile) {
    const memberships = await sessionRepository.getAcceptedMemberships(profile.id)

    if (memberships.error) throw memberships.error

    const acceptedMemberships = memberships.data ?? []

    const selectedMembership =
      acceptedMemberships.find(
        (membership) => membership.household_id === profile.default_household_id
      ) ?? acceptedMemberships[0] ?? null

    if (!selectedMembership) {
      return {
        profile,
        membership: null,
        household: null,
      }
    }

    const household = await sessionRepository.getHousehold(
      selectedMembership.household_id
    )

    if (household.error) throw household.error

    return {
      profile,
      membership: selectedMembership,
      household: household.data,
    }
  }
}

export const sessionService = new SessionService()