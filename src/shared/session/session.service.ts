import { sessionRepository } from "./session.repository"
import { UserProfile } from "./session.types"

export class SessionService {
  async load(profile: UserProfile) {
    const membership = await sessionRepository.getMembership(profile.id)

    if (membership.error) throw membership.error

    const household = await sessionRepository.getHousehold(
      membership.data.household_id
    )

    if (household.error) throw household.error

    return {
      profile,
      membership: membership.data,
      household: household.data,
    }
  }
}

export const sessionService = new SessionService()