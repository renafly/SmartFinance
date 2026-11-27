import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { useAuth } from "@/providers/AuthProvider";

import { NoteAutosave, type NoteSaveStatus } from "../services/note-autosave";
import { notesService } from "../services/notes.service";
import type { Note } from "../types";

/**
 * One NoteAutosave per editor session (the caller remounts the editor --
 * via `key` -- to edit a different note). Saves are flushed when the editor
 * unmounts, when the app goes to the background, and (web) a "leave page?"
 * prompt is shown while a change hasn't been saved yet.
 */
export function useNoteAutosave({
  initial,
  onSaved,
}: {
  initial: Note | null;
  onSaved: (note: Note) => void;
}) {
  const { householdId } = useAuth();
  const [status, setStatus] = useState<NoteSaveStatus>(initial ? "saved" : "idle");
  const [conflict, setConflict] = useState<{ latest: Note | null } | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // Created once per mount; `initial` changes are handled by remounting.
  const autosave = useMemo(
    () =>
      new NoteAutosave({
        initial,
        persistence: {
          create: (draft) => notesService.createNote(householdId!, draft),
          update: (id, version, draft) => notesService.updateNote(id, version, draft),
          fetchLatest: (id) => notesService.getNote(id),
        },
        onStatusChange: setStatus,
        onSaved: (note) => onSavedRef.current(note),
        onConflict: (latest) => setConflict({ latest }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") void autosave.flush();
    });

    let removeBeforeUnload: (() => void) | undefined;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handler = (event: BeforeUnloadEvent) => {
        if (!autosave.hasUnsavedChanges()) return;
        void autosave.flush();
        event.preventDefault();
        event.returnValue = "";
      };
      window.addEventListener("beforeunload", handler);
      removeBeforeUnload = () => window.removeEventListener("beforeunload", handler);
    }

    return () => {
      subscription.remove();
      removeBeforeUnload?.();
      // Closing the editor (back, another note, leaving the screen) saves
      // whatever is pending; cancel() beforehand opts out (note deleted).
      void autosave.flush();
    };
  }, [autosave]);

  return {
    autosave,
    status,
    conflict,
    clearConflict: () => setConflict(null),
  };
}
