import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/migrated-page";
import { SelectionShell } from "@/components/selection-shell";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

type DeleteTagDialogProps = {
  tag: { id: string; name: string; transactionCount: number } | null;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirms a tag delete, making clear the tagged transactions are kept. */
export function DeleteTagDialog({ tag, deleting, onConfirm, onClose }: DeleteTagDialogProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();

  return (
    <SelectionShell
      visible={!!tag}
      title={tag ? t("tags.deleteTitle", { name: tag.name }) : ""}
      closeLabel={t("cancel")}
      onClose={onClose}
      bodyScrollable={false}
    >
      <View style={{ gap: spacing(3) }}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[14], lineHeight: typography.lineHeight[20] }}>
          {tag && tag.transactionCount > 0
            ? t("tags.deleteBody", { count: tag.transactionCount })
            : t("tags.deleteBodyEmpty")}
        </Text>
        <View style={{ alignItems: "flex-start" }}>
          <Button
            label={deleting ? t("deleting") : t("tags.delete")}
            variant="danger"
            disabled={deleting}
            onPress={onConfirm}
          />
        </View>
      </View>
    </SelectionShell>
  );
}
