import type { Note, NoteDraft } from "../types";
import { draftsEqual, isBlankDraft } from "./note-view-model";

export type NoteSaveStatus =
  /** A new note with nothing typed yet -- nothing to save. */
  | "idle"
  /** Changes typed, waiting for the debounce before saving. */
  | "pending"
  | "saving"
  | "saved"
  /** The last save failed; the text is kept and saved again on the next change or retry(). */
  | "error"
  /** The note was changed (or deleted) elsewhere since it was loaded; waiting for keepMine()/loadLatest(). */
  | "conflict";

export type NotePersistence = {
  create(draft: NoteDraft): Promise<Note>;
  /** Saves only if the note is still at `expectedVersion`; resolves null on a version conflict. */
  update(id: string, expectedVersion: number, draft: NoteDraft): Promise<Note | null>;
  /** The current server copy, or null if the note no longer exists. */
  fetchLatest(id: string): Promise<Note | null>;
};

export type NoteAutosaveOptions = {
  persistence: NotePersistence;
  /** The note being edited, or null for a new, not yet saved note. */
  initial: Note | null;
  delayMs?: number;
  onStatusChange?: (status: NoteSaveStatus) => void;
  /** Called after every successful save with the server's copy (new id/version/timestamps). */
  onSaved?: (note: Note) => void;
  /** Called when a save hits a version conflict; `latest` is null if the note was deleted elsewhere. */
  onConflict?: (latest: Note | null) => void;
};

export const NOTE_AUTOSAVE_DELAY_MS = 800;

/**
 * Debounced, serialized autosave for one note editor. Framework-agnostic so
 * it can be unit-tested with fake timers; useNoteAutosave wires it to React.
 *
 * Guarantees:
 * - at most one save request is in flight at a time; typing during a save
 *   triggers exactly one follow-up save with the newest text, so a slow
 *   response can never overwrite newer text with older text;
 * - every update is conditional on the version this editor last saw, so a
 *   copy edited on another device/tab is never silently overwritten -- the
 *   editor enters "conflict" and the user decides (keepMine / loadLatest);
 * - a brand-new note is only created once it has a title or text, so
 *   opening "New note" and leaving doesn't leave empty notes behind;
 * - flush()/dispose() save whatever is pending immediately (used when the
 *   editor closes, the screen loses focus or the app goes to background).
 */
export class NoteAutosave {
  private saved: Note | null;
  private draft: NoteDraft;
  private status: NoteSaveStatus;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private cancelled = false;
  private conflictLatest: Note | null = null;
  private readonly delayMs: number;

  constructor(private readonly options: NoteAutosaveOptions) {
    this.saved = options.initial;
    this.draft = options.initial
      ? { title: options.initial.title, content: options.initial.content }
      : { title: "", content: "" };
    this.status = options.initial ? "saved" : "idle";
    this.delayMs = options.delayMs ?? NOTE_AUTOSAVE_DELAY_MS;
  }

  getStatus(): NoteSaveStatus {
    return this.status;
  }

  /** The last saved copy (null while a new note hasn't been saved yet). */
  getSavedNote(): Note | null {
    return this.saved;
  }

  hasUnsavedChanges(): boolean {
    return !this.isInSync();
  }

  /** Records the editor's current text and schedules a save. */
  change(draft: NoteDraft): void {
    if (this.cancelled) return;
    this.draft = { title: draft.title, content: draft.content };
    if (this.status === "conflict") return; // kept, saved once the conflict is resolved

    this.clearTimer();
    if (this.isInSync()) {
      if (this.status !== "saving") this.setStatus(this.saved ? "saved" : "idle");
      return;
    }
    if (this.status !== "saving") this.setStatus("pending");
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.delayMs);
  }

  /** Saves pending changes now. Resolves once everything typed so far is saved (or the save failed / conflicted). */
  flush(): Promise<void> {
    this.clearTimer();
    this.queue = this.queue.then(() => this.drain());
    return this.queue;
  }

  retry(): Promise<void> {
    return this.flush();
  }

  /** Conflict: keep this editor's text, overwriting the other copy (or re-creating the note if it was deleted). */
  keepMine(): Promise<void> {
    if (this.status !== "conflict") return this.queue;
    this.saved = this.conflictLatest;
    this.conflictLatest = null;
    this.setStatus("pending");
    return this.flush();
  }

  /** Conflict: drop this editor's text and adopt the other copy. Returns it (null if the note was deleted elsewhere). */
  loadLatest(): Note | null {
    if (this.status !== "conflict") return this.saved;
    const latest = this.conflictLatest;
    this.conflictLatest = null;
    this.saved = latest;
    this.draft = latest ? { title: latest.title, content: latest.content } : { title: "", content: "" };
    this.setStatus(latest ? "saved" : "idle");
    return latest;
  }

  /** Stops all saving without flushing (used right before the note is deleted). */
  cancel(): void {
    this.cancelled = true;
    this.clearTimer();
  }

  private isInSync(): boolean {
    return this.saved ? draftsEqual(this.draft, this.saved) : isBlankDraft(this.draft);
  }

  private async drain(): Promise<void> {
    while (!this.cancelled && this.status !== "conflict" && !this.isInSync()) {
      const snapshot = { ...this.draft };
      const base = this.saved;
      this.setStatus("saving");

      let result: Note | null;
      try {
        result = base
          ? await this.options.persistence.update(base.id, base.version, snapshot)
          : await this.options.persistence.create(snapshot);
      } catch {
        if (!this.cancelled) this.setStatus("error");
        return;
      }
      if (this.cancelled) return;

      if (result === null && base) {
        let latest: Note | null = null;
        try {
          latest = await this.options.persistence.fetchLatest(base.id);
        } catch {
          latest = null;
        }
        if (this.cancelled) return;
        this.conflictLatest = latest;
        this.setStatus("conflict");
        this.options.onConflict?.(latest);
        return;
      }

      if (result) {
        this.saved = result;
        this.options.onSaved?.(result);
      }
    }

    if (!this.cancelled && this.status !== "conflict" && this.isInSync()) {
      this.setStatus(this.saved ? "saved" : "idle");
    }
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private setStatus(status: NoteSaveStatus) {
    if (this.status === status) return;
    this.status = status;
    this.options.onStatusChange?.(status);
  }
}
