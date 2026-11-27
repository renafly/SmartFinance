/** A saved note, as the app uses it (camelCase view of public.notes). */
export type Note = {
  id: string;
  title: string;
  content: string;
  /** Optimistic-concurrency token -- see 20261024000000_notes.sql. */
  version: number;
  createdAt: string;
  updatedAt: string;
};

/** The editable part of a note. */
export type NoteDraft = {
  title: string;
  content: string;
};

export const NOTE_SORT_KEYS = ["updated", "created"] as const;
export type NoteSortKey = (typeof NOTE_SORT_KEYS)[number];

/** Same limits as the notes table's check constraints. */
export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_CONTENT_MAX_LENGTH = 100000;
