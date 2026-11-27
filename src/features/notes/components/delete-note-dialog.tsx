import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/migrated-page";
import { SelectionShell } from "@/components/selection-shell";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

type DeleteNoteDialogProps = {
  note: { id: string; title: string } | null;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirms a permanent note delete (same dialog pattern as DeleteTagDialog). */
export function DeleteNoteDialog({ note, deleting, onConfirm, onClose }: DeleteNoteDialogProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();

  return (
    <SelectionShell
      visible={!!note}
      title={note ? t("notes.deleteTitle", { title: note.title.trim() || t("notes.untitled") }) : ""}
      closeLabel={t("cancel")}
      onClose={onClose}
      bodyScrollable={false}
    >
      <View style={{ gap: spacing(3) }}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[14], lineHeight: typography.lineHeight[20] }}>
          {t("notes.deleteBody")}
        </Text>
        <View style={{ alignItems: "flex-start" }}>
          <Button
            label={deleting ? t("deleting") : t("notes.delete")}
            variant="danger"
            disabled={deleting}
            onPress={onConfirm}
          />
        </View>
      </View>
    </SelectionShell>
  );
}
