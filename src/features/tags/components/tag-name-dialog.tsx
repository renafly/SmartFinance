import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Field } from "@/components/migrated-page";
import { SelectionShell } from "@/components/selection-shell";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

import { TAG_NAME_MAX_LENGTH } from "../types";

type TagNameDialogProps = {
  visible: boolean;
  title: string;
  initialName: string;
  submitting: boolean;
  /** Already-localized error, or null. */
  error: string | null;
  onChangeName?: () => void;
  onSubmit: (name: string) => void;
  onClose: () => void;
};

/** Create/rename dialog -- the same SelectionShell (bottom sheet on phone, dialog on desktop) used by every picker. */
export function TagNameDialog({
  visible,
  title,
  initialName,
  submitting,
  error,
  onChangeName,
  onSubmit,
  onClose,
}: TagNameDialogProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  const canSubmit = name.trim().length > 0 && !submitting;

  return (
    <SelectionShell
      visible={visible}
      title={title}
      closeLabel={t("cancel")}
      onClose={onClose}
      primaryAction={{
        label: submitting ? t("saving") : t("tags.save"),
        onPress: () => onSubmit(name),
        disabled: !canSubmit,
      }}
    >
      <View style={{ gap: spacing(2) }}>
        <Field
          label={t("tags.nameLabel")}
          placeholder={t("tags.namePlaceholder")}
          value={name}
          onChangeText={(value) => {
            setName(value);
            onChangeName?.();
          }}
          autoFocus
          autoCapitalize="sentences"
          maxLength={TAG_NAME_MAX_LENGTH + 20}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (canSubmit) onSubmit(name);
          }}
        />
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.destructive, fontSize: typography.fontSize[13] }}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </SelectionShell>
  );
}
