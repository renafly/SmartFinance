import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { formatDateTime } from "@/components/migrated-page";
import { radius } from "@/theme/radius";
import { useResponsiveMetrics } from "@/theme/responsive";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

import { notePreview } from "../services/note-view-model";
import type { Note } from "../types";

type NoteListItemProps = {
  note: Note;
  selected: boolean;
  onOpen: () => void;
  onDelete: () => void;
};

/** One note in the Notes list: title, a short preview and the last update. */
export function NoteListItem({ note, selected, onOpen, onDelete }: NoteListItemProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const title = note.title.trim() || t("notes.untitled");
  const preview = notePreview(note.content);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.surfaceSelected : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          padding: responsive.isPhone ? spacing(3) : spacing(3.5),
        },
      ]}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={t("notes.openNote", { title })}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        <Text numberOfLines={2} style={[styles.preview, { color: colors.textSecondary }]}>
          {preview || t("notes.emptyPreview")}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {t("notes.updatedAt", { date: formatDateTime(note.updatedAt) })}
        </Text>
      </Pressable>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={t("notes.deleteNamed", { title })}
        hitSlop={spacing(1)}
        style={({ pressed }) => [
          styles.iconButton,
          { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="trash-outline" size={16} color={colors.destructive} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(2),
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  summary: {
    flex: 1,
    minWidth: 0,
    gap: spacing(1),
  },
  title: {
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.semibold as any,
  },
  preview: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  meta: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[16],
  },
  iconButton: {
    width: spacing(9),
    height: spacing(9),
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.75,
  },
});
