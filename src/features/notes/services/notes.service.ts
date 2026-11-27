import { repositories } from "@/repositories";

import type { Note, NoteDraft } from "../types";
import { rowToNote } from "./note-view-model";

class NotesService {
  async listNotes(householdId: string, ownerProfileId: string): Promise<Note[]> {
    const { data, error } = await repositories.notes.listForOwner(householdId, ownerProfileId);
    if (error) throw error;
    return (data ?? []).map(rowToNote);
  }

  async createNote(householdId: string, draft: NoteDraft): Promise<Note> {
    const { data, error } = await repositories.notes.createNote({ householdId, ...draft });
    if (error) throw error;
    return rowToNote(data);
  }

  /** Resolves null when the note changed elsewhere since `expectedVersion` (or no longer exists). */
  async updateNote(id: string, expectedVersion: number, draft: NoteDraft): Promise<Note | null> {
    const { data, error } = await repositories.notes.updateIfVersion(id, expectedVersion, draft);
    if (error) throw error;
    return data ? rowToNote(data) : null;
  }

  async getNote(id: string): Promise<Note | null> {
    const { data, error } = await repositories.notes.findNote(id);
    if (error) throw error;
    return data ? rowToNote(data) : null;
  }

  async deleteNote(id: string): Promise<void> {
    const { error } = await repositories.notes.deleteNote(id);
    if (error) throw error;
  }
}

export const notesService = new NotesService();
