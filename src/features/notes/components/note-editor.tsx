import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button, formatDateTime } from "@/components/migrated-page";
import { radius } from "@/theme/radius";
import { useResponsiveMetrics } from "@/theme/responsive";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

import { useNoteAutosave } from "../hooks/useNoteAutosave";
import type { NoteAutosave, NoteSaveStatus } from "../services/note-autosave";
import { NOTE_CONTENT_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH, type Note } from "../types";

type NoteEditorProps = {
  /** The note to edit, or null for a new note (created on the first save). */
  note: Note | null;
  /** Called after every successful save. */
  onSaved: (note: Note) => void;
  /** Back to the list (phones). Omit to hide the back button. */
  onBack?: () => void;
  /** Delete was pressed. `stopSaving` must be called before deleting so no pending save re-creates the note. */
  onRequestDelete: (note: Note | null, stopSaving: () => void) => void;
  /** The note was deleted on another device and the user chose to drop their copy. */
  onGone: () => void;
  /** Hands the editor's autosave to the parent, so it can wait for pending saves before switching notes. */
  onAutosaveReady?: (autosave: NoteAutosave) => void;
};

/**
 * Distraction-free note editor: a title line, a large body area and a small
 * save-status line. Every keystroke goes through NoteAutosave (debounced,
 * serialized, version-checked), so nothing needs an explicit Save button.
 * Remount it (via `key`) to edit a different note.
 */
export function NoteEditor({ note, onSaved, onBack, onRequestDelete, onGone, onAutosaveReady }: NoteEditorProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const { autosave, status, conflict, clearConflict } = useNoteAutosave({ initial: note, onSaved });

  useEffect(() => {
    onAutosaveReady?.(autosave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosave]);

  function updateTitle(value: string) {
    setTitle(value);
    autosave.change({ title: value, content });
  }

  function updateContent(value: string) {
    setContent(value);
    autosave.change({ title, content: value });
  }

  function handleKeepMine() {
    clearConflict();
    void autosave.keepMine();
  }

  function handleLoadLatest() {
    clearConflict();
    const latest = autosave.loadLatest();
    if (!latest) {
      onGone();
      return;
    }
    setTitle(latest.title);
    setContent(latest.content);
    onSaved(latest);
  }

  const saved = autosave.getSavedNote();
  const iconButtonStyle = (pressed: boolean) => [
    styles.iconButton,
    { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
    pressed && styles.pressed,
  ];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: responsive.isPhone ? spacing(3) : spacing(5),
        },
      ]}
    >
      <View style={styles.toolbar}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={t("notes.back")}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={[styles.backLabel, { color: colors.primary }]}>{t("notes.back")}</Text>
          </Pressable>
        ) : null}
        <SaveStatusLine status={status} updatedAt={saved?.updatedAt ?? null} onRetry={() => void autosave.retry()} />
        <Pressable
          onPress={() => onRequestDelete(saved, () => autosave.cancel())}
          accessibilityRole="button"
          accessibilityLabel={saved ? t("notes.delete") : t("notes.discard")}
          style={({ pressed }) => iconButtonStyle(pressed)}
        >
          <Ionicons name="trash-outline" size={16} color={colors.destructive} />
        </Pressable>
      </View>

      {conflict ? (
        <View
          accessibilityRole="alert"
          style={[styles.banner, { backgroundColor: colors.financialAttentionSoft, borderColor: colors.financialAttention }]}
        >
          <Text style={[styles.bannerTitle, { color: colors.text }]}>
            {conflict.latest ? t("notes.conflict.title") : t("notes.conflict.deletedTitle")}
          </Text>
          <Text style={[styles.bannerBody, { color: colors.text }]}>
            {conflict.latest ? t("notes.conflict.description") : t("notes.conflict.deletedDescription")}
          </Text>
          <View style={styles.bannerActions}>
            <Button
              label={conflict.latest ? t("notes.conflict.keepMine") : t("notes.conflict.restore")}
              onPress={handleKeepMine}
            />
            <Button
              label={conflict.latest ? t("notes.conflict.loadLatest") : t("notes.conflict.discard")}
              variant="secondary"
              onPress={handleLoadLatest}
            />
          </View>
        </View>
      ) : null}

      <TextInput
        value={title}
        onChangeText={updateTitle}
        placeholder={t("notes.titlePlaceholder")}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={t("notes.titleLabel")}
        maxLength={NOTE_TITLE_MAX_LENGTH}
        autoFocus={!note}
        returnKeyType="next"
        style={[
          styles.titleInput,
          {
            color: colors.text,
            borderBottomColor: colors.border,
            fontSize: responsive.isPhone ? typography.fontSize[20] : typography.fontSize[24],
          },
        ]}
      />
      <TextInput
        value={content}
        onChangeText={updateContent}
        placeholder={t("notes.contentPlaceholder")}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={t("notes.contentLabel")}
        maxLength={NOTE_CONTENT_MAX_LENGTH}
        multiline
        textAlignVertical="top"
        style={[
          styles.contentInput,
          {
            color: colors.text,
            fontSize: typography.fontSize[16],
            lineHeight: typography.lineHeight[24],
            minHeight: responsive.isPhone ? spacing(90) : spacing(130),
          },
        ]}
      />
    </View>
  );
}

function SaveStatusLine({
  status,
  updatedAt,
  onRetry,
}: {
  status: NoteSaveStatus;
  updatedAt: string | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();

  let label = "";
  let color = colors.textSecondary;
  if (status === "pending") label = t("notes.status.pending");
  else if (status === "saving") label = t("notes.status.saving");
  else if (status === "saved") {
    label = updatedAt
      ? t("notes.status.savedAt", { date: formatDateTime(updatedAt) })
      : t("notes.status.saved");
  } else if (status === "error") {
    label = t("notes.status.error");
    color = colors.destructive;
  } else if (status === "conflict") {
    label = t("notes.status.conflict");
    color = colors.financialAttention;
  }

  return (
    <View style={styles.status} accessibilityLiveRegion="polite">
      {status === "saving" ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
      {status === "saved" ? <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} /> : null}
      {status === "error" ? <Ionicons name="alert-circle-outline" size={14} color={colors.destructive} /> : null}
      <Text style={[styles.statusText, { color }]} numberOfLines={2}>
        {label}
      </Text>
      {status === "error" ? (
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={spacing(1)}>
          <Text style={[styles.retry, { color: colors.primary }]}>{t("notes.status.retry")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    gap: spacing(3),
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(0.5),
    paddingVertical: spacing(1),
  },
  backLabel: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.semibold as any,
  },
  status: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing(1.5),
  },
  statusText: {
    flexShrink: 1,
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
    textAlign: "right",
  },
  retry: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.semibold as any,
  },
  iconButton: {
    width: spacing(9),
    height: spacing(9),
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    gap: spacing(2),
  },
  bannerTitle: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.semibold as any,
  },
  bannerBody: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  bannerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2),
  },
  titleInput: {
    fontWeight: typography.fontWeight.bold as any,
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
  },
  contentInput: {
    paddingVertical: spacing(1),
  },
  pressed: {
    opacity: 0.75,
  },
});
