import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type OnboardingGuides = Record<string, number>;

function normalizeOnboardingGuides(value: Database["public"]["Tables"]["profiles"]["Row"]["onboarding_guides"]): OnboardingGuides {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const guides: OnboardingGuides = {};
  for (const [key, version] of Object.entries(value)) {
    if (
      /^[a-z0-9][a-z0-9_-]{0,63}$/.test(key) &&
      typeof version === "number" &&
      Number.isInteger(version) &&
      version > 0
    ) {
      guides[key] = version;
    }
  }

  return guides;
}

export class ProfilesRepository extends BaseRepository<"profiles"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "profiles");
  }

  async findByEmail(email: string): Promise<RepoResult<Profile>> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) return { data: null, error };
    if (!data)
      return {
        data: null,
        error: new Error(`profile with email ${email} not found`),
      };
    return { data, error: null };
  }

  /** Convenience for the currently authenticated user, using supabase.auth.getUser(). */
  async findCurrent(): Promise<RepoResult<Profile>> {
    const { data: authData, error: authError } =
      await this.client.auth.getUser();
    if (authError) return { data: null, error: authError };
    if (!authData.user)
      return { data: null, error: new Error("no authenticated user") };

    return this.findById(authData.user.id);
  }

  async getCurrentOnboardingGuides(): Promise<RepoResult<OnboardingGuides>> {
    const result = await this.findCurrent();

    if (result.error) return { data: null, error: result.error };
    return {
      data: normalizeOnboardingGuides(result.data.onboarding_guides),
      error: null,
    };
  }

  async completeOnboardingGuide(
    guideKey: string,
    version: number,
  ): Promise<RepoResult<OnboardingGuides>> {
    const { data, error } = await this.client.rpc("complete_onboarding_guide", {
      p_guide_key: guideKey,
      p_version: version,
    });

    if (error) return { data: null, error };
    return { data: normalizeOnboardingGuides(data), error: null };
  }
}
