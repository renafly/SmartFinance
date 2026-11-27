import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card, Field, Page, Pill } from '@/components/migrated-page';
import { EmptyState } from '@/components/data-surface';
import { DeleteNoteDialog } from '@/features/notes/components/delete-note-dialog';
import { NoteEditor } from '@/features/notes/components/note-editor';
import { NoteListItem } from '@/features/notes/components/note-list-item';
import { useCacheSavedNote, useDeleteNote, useGetCachedNote, useNotes } from '@/features/notes/hooks/useNotes';
import type { NoteAutosave } from '@/features/notes/services/note-autosave';
import { filterNotes, sortNotes } from '@/features/notes/services/note-view-model';
import { NOTE_SORT_KEYS, type Note, type NoteSortKey } from '@/features/notes/types';
import { useToast } from '@/providers/ToastProvider';
import { useResponsiveMetrics } from '@/theme/responsive';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

/** The open editor. `key` remounts NoteEditor per editing session; `noteId` follows the note once a new one is first saved. */
type EditingState = { key: string; initial: Note | null; noteId: string | null };
type DeleteState = { id: string; title: string; stopSaving: (() => void) | null };

let editorSessionCounter = 0;
const nextEditorKey = () => `note-editor-${++editorSessionCounter}`;

/**
 * Notes -- a personal notepad. Notes are private to the signed-in member
 * (enforced by RLS, see 20261024000000_notes.sql) and scoped to the
 * current household. Phones show either the list or the editor; wider
 * screens show both side by side.
 */
export default function NotesScreen() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const { show: showToast } = useToast();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<NoteSortKey>('updated');
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<DeleteState | null>(null);
  const activeAutosave = useRef<NoteAutosave | null>(null);

  const notesQuery = useNotes();
  const cacheSavedNote = useCacheSavedNote();
  const getCachedNote = useGetCachedNote();
  const deleteNote = useDeleteNote();

  const notes = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);
  const visibleNotes = useMemo(() => sortNotes(filterNotes(notes, search), sortKey), [notes, search, sortKey]);
  const hasAnyNotes = notes.length > 0;

  /** Waits for the open editor's pending saves, so the next editor starts from the latest saved version. */
  async function settleActiveEditor() {
    try {
      await activeAutosave.current?.flush();
    } catch {
      // flush never rejects; failures surface as the editor's "error" status
    }
  }

  async function openNote(note: Note) {
    if (editing?.noteId === note.id) return;
    await settleActiveEditor();
    const latest = getCachedNote(note.id) ?? note;
    setEditing({ key: nextEditorKey(), initial: latest, noteId: latest.id });
  }

  async function openNewNote() {
    await settleActiveEditor();
    setEditing({ key: nextEditorKey(), initial: null, noteId: null });
  }

  function closeEditor() {
    setEditing(null);
  }

  function handleSaved(note: Note) {
    cacheSavedNote(note);
    setEditing((current) => (current && current.noteId !== note.id ? { ...current, noteId: note.id } : current));
  }

  function requestDeleteFromEditor(saved: Note | null, stopSaving: () => void) {
    if (!saved) {
      // A new note that was never saved: nothing to delete, just discard it.
      stopSaving();
      closeEditor();
      return;
    }
    setNoteToDelete({ id: saved.id, title: saved.title, stopSaving });
  }

  function requestDeleteFromList(note: Note) {
    const isOpen = editing?.noteId === note.id;
    setNoteToDelete({
      id: note.id,
      title: note.title,
      stopSaving: isOpen ? () => activeAutosave.current?.cancel() : null,
    });
  }

  async function handleConfirmDelete() {
    if (!noteToDelete) return;
    const { id, stopSaving } = noteToDelete;
    const isOpen = editing?.noteId === id;
    if (isOpen) {
      // Save what's pending first, then stop: no save may land after (or
      // race with) the delete.
      await settleActiveEditor();
      stopSaving?.();
    }
    try {
      await deleteNote.mutateAsync(id);
      if (isOpen) closeEditor();
      setNoteToDelete(null);
      showToast(t('notes.deletedToast'));
    } catch {
      setNoteToDelete(null);
      showToast(t('notes.deleteError'));
      if (isOpen) {
        // Saving was stopped for the delete; reopen the note so editing works again.
        const latest = getCachedNote(id);
        setEditing(latest ? { key: nextEditorKey(), initial: latest, noteId: id } : null);
      }
    }
  }

  const mutedText = {
    color: colors.textSecondary,
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  };
  const labelText = {
    color: colors.textSecondary,
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.semibold as any,
  };

  const editor = editing ? (
    <NoteEditor
      key={editing.key}
      note={editing.initial}
      onSaved={handleSaved}
      onBack={responsive.isPhone ? closeEditor : undefined}
      onRequestDelete={requestDeleteFromEditor}
      onGone={() => {
        // Deleted on another device: drop it from the list too.
        closeEditor();
        void notesQuery.refetch();
      }}
      onAutosaveReady={(autosave) => {
        activeAutosave.current = autosave;
      }}
    />
  ) : null;

  const listColumn = (
    <View style={{ gap: spacing(3) }}>
      <Card>
        <Field
          label={t('notes.searchLabel')}
          placeholder={t('notes.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
        />
        <View style={{ gap: spacing(2) }}>
          <Text style={labelText}>{t('notes.sort.label')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {NOTE_SORT_KEYS.map((key) => (
              <Pill key={key} label={t(`notes.sort.${key}`)} active={sortKey === key} onPress={() => setSortKey(key)} />
            ))}
          </View>
        </View>
      </Card>

      {visibleNotes.length === 0 ? (
        <Text style={mutedText}>
          {search.trim() ? t('notes.noResults', { query: search.trim() }) : t('notes.listEmpty')}
        </Text>
      ) : (
        <View style={{ gap: spacing(2) }}>
          {visibleNotes.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              selected={editing?.noteId === note.id}
              onOpen={() => void openNote(note)}
              onDelete={() => requestDeleteFromList(note)}
            />
          ))}
        </View>
      )}
    </View>
  );

  let body: ReactNode;
  if (notesQuery.isLoading) {
    body = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(4) }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={mutedText}>{t('notes.loading')}</Text>
      </View>
    );
  } else if (notesQuery.isError) {
    body = (
      <EmptyState
        icon="alert-circle-outline"
        title={t('notes.loadError')}
        actionLabel={t('notes.retry')}
        onAction={() => void notesQuery.refetch()}
      />
    );
  } else if (!hasAnyNotes && !editing) {
    body = (
      <EmptyState
        icon="document-text-outline"
        title={t('notes.empty.title')}
        description={t('notes.empty.description')}
        actionLabel={t('notes.newNote')}
        onAction={() => void openNewNote()}
      />
    );
  } else if (responsive.isPhone) {
    body = editor ?? listColumn;
  } else {
    body = (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(4) }}>
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 320, maxWidth: 420, minWidth: 0 } as any}>{listColumn}</View>
        <View style={{ flexGrow: 2, flexShrink: 1, flexBasis: 480, minWidth: 0 } as any}>
          {editor ?? (
            <EmptyState
              icon="create-outline"
              title={t('notes.selectPrompt.title')}
              description={t('notes.selectPrompt.description')}
              actionLabel={t('notes.newNote')}
              onAction={() => void openNewNote()}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <Page
      title={t('drawer.notes')}
      subtitle={t('notes.subtitle')}
      actions={<Button label={t('notes.newNote')} onPress={() => void openNewNote()} />}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(420)} style={{ gap: spacing(3) }}>
        {body}
      </Animated.View>

      <DeleteNoteDialog
        note={noteToDelete}
        deleting={deleteNote.isPending}
        onConfirm={() => void handleConfirmDelete()}
        onClose={() => setNoteToDelete(null)}
      />
    </Page>
  );
}
