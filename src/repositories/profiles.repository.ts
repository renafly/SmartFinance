import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

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
}
