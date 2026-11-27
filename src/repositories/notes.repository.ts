import { BaseRepository, type RepoResult } from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NoteRow = Database["public"]["Tables"]["notes"]["Row"];

/**
 * Personal notes (20261024000000_notes.sql). RLS limits every query to the
 * signed-in author's own notes in households they're a member of, so the
 * owner filter below is a query-shaping filter, not the security boundary.
 */
export class NotesRepository extends BaseRepository<"notes"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "notes");
  }

  async listForOwner(householdId: string, ownerProfileId: string): Promise<RepoResult<NoteRow[]>> {
    const { data, error } = await this.client
      .from("notes")
      .select("*")
      .eq("household_id", householdId)
      .eq("owner_profile_id", ownerProfileId)
      .order("updated_at", { ascending: false });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async createNote(input: { householdId: string; title: string; content: string }): Promise<RepoResult<NoteRow>> {
    const { data, error } = await this.client
      .from("notes")
      .insert({ household_id: input.householdId, title: input.title, content: input.content })
      .select("*")
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  }

  /**
   * Saves only if the note is still at `expectedVersion` (optimistic
   * concurrency). Resolves `data: null` -- without an error -- when the note
   * was changed elsewhere in the meantime (or no longer exists), so the
   * caller can tell a conflict apart from a failed request.
   */
  async updateIfVersion(
    id: string,
    expectedVersion: number,
    input: { title: string; content: string },
  ): Promise<RepoResult<NoteRow | null>> {
    const { data, error } = await this.client
      .from("notes")
      .update({ title: input.title, content: input.content })
      .eq("id", id)
      .eq("version", expectedVersion)
      .select("*")
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: data ?? null, error: null };
  }

  async findNote(id: string): Promise<RepoResult<NoteRow | null>> {
    const { data, error } = await this.client.from("notes").select("*").eq("id", id).maybeSingle();

    if (error) return { data: null, error };
    return { data: data ?? null, error: null };
  }

  async deleteNote(id: string): Promise<RepoResult<null>> {
    const { error } = await this.client.from("notes").delete().eq("id", id);

    if (error) return { data: null, error };
    return { data: null, error: null };
  }
}
