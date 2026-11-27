import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";

import { notesService } from "../services/notes.service";
import { upsertNote } from "../services/note-view-model";
import type { Note } from "../types";

export const NOTES_QUERY_KEY = "notes";

/** The signed-in member's own notes in the current household (RLS enforces the same on the server). */
export function useNotes() {
  const { householdId, profile, isLoading } = useAuth();
  const ownerId = profile?.id ?? null;

  return useQuery({
    queryKey: [NOTES_QUERY_KEY, householdId, ownerId],
    queryFn: () => notesService.listNotes(householdId!, ownerId!),
    enabled: !!householdId && !!ownerId && !isLoading,
  });
}

/**
 * Writes a freshly saved note straight into the cached list instead of
 * refetching, so the list updates instantly and a refetch can never race
 * with the editor that just saved.
 */
export function useCacheSavedNote() {
  const queryClient = useQueryClient();
  const { householdId, profile } = useAuth();
  const ownerId = profile?.id ?? null;

  return useCallback(
    (note: Note) => {
      queryClient.setQueryData<Note[]>([NOTES_QUERY_KEY, householdId, ownerId], (current) => upsertNote(current, note));
    },
    [householdId, ownerId, queryClient],
  );
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const { householdId, profile } = useAuth();
  const ownerId = profile?.id ?? null;

  return useMutation({
    mutationFn: (id: string) => notesService.deleteNote(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Note[]>([NOTES_QUERY_KEY, householdId, ownerId], (current) =>
        (current ?? []).filter((note) => note.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
    },
  });
}

/** Reads one note from the cached list (the freshest copy this device has saved or loaded). */
export function useGetCachedNote() {
  const queryClient = useQueryClient();
  const { householdId, profile } = useAuth();
  const ownerId = profile?.id ?? null;

  return useCallback(
    (id: string) =>
      queryClient.getQueryData<Note[]>([NOTES_QUERY_KEY, householdId, ownerId])?.find((note) => note.id === id) ?? null,
    [householdId, ownerId, queryClient],
  );
}
