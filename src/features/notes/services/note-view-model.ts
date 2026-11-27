import type { NoteRow } from "@/repositories/notes.repository";

import type { Note, NoteDraft, NoteSortKey } from "../types";

export function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Lowercased, accent-insensitive form used for search ("café" matches "cafe"). */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Notes whose title or content contain every word of `query` (in any
 * order), ignoring case and accents. An empty query returns every note.
 */
export function filterNotes(notes: readonly Note[], query: string): Note[] {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...notes];

  return notes.filter((note) => {
    const haystack = normalizeForSearch(`${note.title}\n${note.content}`);
    return terms.every((term) => haystack.includes(term));
  });
}

/** Newest first, by last update or by creation date; ties broken by id so the order is stable. */
export function sortNotes(notes: readonly Note[], sortKey: NoteSortKey): Note[] {
  const field = sortKey === "created" ? "createdAt" : "updatedAt";
  return [...notes].sort(
    (left, right) =>
      (left[field] < right[field] ? 1 : left[field] > right[field] ? -1 : 0) || left.id.localeCompare(right.id),
  );
}

/** One-line preview of the note body for the list: whitespace collapsed, cut at `maxLength` characters. */
export function notePreview(content: string, maxLength = 140): string {
  const collapsed = content.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength).trimEnd()}…`;
}

export function isBlankDraft(draft: NoteDraft): boolean {
  return draft.title.trim() === "" && draft.content.trim() === "";
}

export function draftsEqual(left: NoteDraft, right: NoteDraft): boolean {
  return left.title === right.title && left.content === right.content;
}

/** Inserts or replaces `note` in a cached list (used to keep the list in sync after a save). */
export function upsertNote(notes: readonly Note[] | undefined, note: Note): Note[] {
  const list = notes ?? [];
  const index = list.findIndex((entry) => entry.id === note.id);
  if (index === -1) return [note, ...list];
  const next = [...list];
  next[index] = note;
  return next;
}
