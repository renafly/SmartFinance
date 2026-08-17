import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardNetworkConfigRow =
  Database["public"]["Tables"]["dashboard_network_configs"]["Row"];
export type DashboardNetworkConfigInsert =
  Database["public"]["Tables"]["dashboard_network_configs"]["Insert"];

export class DashboardNetworkConfigRepository extends BaseRepository<"dashboard_network_configs"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "dashboard_network_configs");
  }

  /** A profile has at most one row (enforced by the `profile_id` unique
   * constraint) -- `null` means the profile hasn't customized the network
   * yet, not an error. */
  async getForProfile(
    profileId: string,
  ): Promise<RepoResult<DashboardNetworkConfigRow | null>> {
    const { data, error } = await this.client
      .from("dashboard_network_configs")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: data ?? null, error: null };
  }

  /** Inserts or replaces the profile's single config row, keyed on
   * `profile_id` -- there's always at most one row per profile, so this is
   * a plain upsert rather than the create/update split most other
   * repositories use. */
  async upsertForProfile(
    profileId: string,
    values: Omit<DashboardNetworkConfigInsert, "profile_id">,
  ): Promise<RepoResult<DashboardNetworkConfigRow>> {
    const { data, error } = await this.client
      .from("dashboard_network_configs")
      .upsert({ ...values, profile_id: profileId }, { onConflict: "profile_id" })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  }
}
