import { useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Field } from "@/components/migrated-page";
import {
  SelectionOptionRow,
  SelectionShell,
  SelectionTrigger,
} from "@/components/selection-shell";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

import { useCreateTag, useTags } from "../hooks/useTags";
import { TagNameValidationError } from "../services/tags.service";
import { filterTags, normalizeTagName, tagNameKey } from "../services/tag-view-model";

export type TagPickerProps = {
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

/**
 * Optional tag selector for the expense create/edit forms. Same
 * SelectionTrigger + SelectionShell pattern as CategoryPicker/DropdownField,
 * so it renders as a bottom sheet on phones and a centered dialog on
 * desktop/web, plus:
 *  - a search box that doubles as "create": typing a name that doesn't
 *    exist yet offers a one-tap "Create “…”" row, which creates the tag and
 *    selects it without leaving the expense form;
 *  - a leading "No tag" row that clears the selection.
 *
 * The underlying schema is many-to-many (transaction_tag_assignments), so
 * tapping a tag toggles it rather than replacing the selection -- editing
 * a transaction that already carries several tags never silently drops
 * one. In the common case the user taps one tag and "Done".
 */
export function TagPicker({ selectedIds, onChange, disabled }: TagPickerProps) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const tagsQuery = useTags();
  const createTag = useCreateTag();
  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const tagsById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);

  const selectedNames = selectedIds
    .map((id) => tagsById.get(id)?.name)
    .filter((name): name is string => !!name);
  const placeholder = t("tags.picker.placeholder");
  const valueLabel =
    selectedNames.length === 0
      ? placeholder
      : selectedNames.length === 1
        ? selectedNames[0]
        : t("tags.picker.moreSelected", { first: selectedNames[0], count: selectedNames.length - 1 });

  const normalizedQuery = normalizeTagName(query);
  const visibleTags = useMemo(() => filterTags(tags, query), [tags, query]);
  const hasExactMatch = tags.some((tag) => tagNameKey(tag.name) === tagNameKey(normalizedQuery));
  const canOfferCreate = normalizedQuery.length > 0 && !hasExactMatch;

  function close() {
    setOpen(false);
    setQuery("");
    setCreateError(null);
  }

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);
  }

  async function handleCreate() {
    setCreateError(null);
    try {
      const created = await createTag.mutateAsync({ name: normalizedQuery, existing: tags });
      onChange([...selectedIds.filter((id) => id !== created.id), created.id]);
      setQuery("");
    } catch (error) {
      setCreateError(
        error instanceof TagNameValidationError ? t(`tags.errors.${error.code}`) : t("tags.saveError"),
      );
    }
  }

  const messageStyle = {
    color: colors.textSecondary,
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  };

  return (
    <View style={{ gap: spacing(2) }}>
      <SelectionTrigger
        label={t("tags.picker.label")}
        valueLabel={valueLabel}
        placeholder={placeholder}
        hint={t("tags.picker.hint")}
        iconName="pricetags-outline"
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      <SelectionShell
        visible={open}
        title={t("tags.picker.label")}
        subtitle={t("tags.picker.subtitle")}
        closeLabel={t("close")}
        onClose={close}
        primaryAction={{ label: t("tags.picker.done"), onPress: close }}
      >
        <View style={{ gap: spacing(2) }}>
          <Field
            label={t("tags.picker.searchLabel")}
            placeholder={t("tags.picker.searchPlaceholder")}
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              setCreateError(null);
            }}
            autoCapitalize="sentences"
            autoCorrect={false}
            returnKeyType={canOfferCreate ? "done" : "search"}
            onSubmitEditing={() => {
              if (canOfferCreate && !createTag.isPending) void handleCreate();
            }}
            maxLength={80}
          />
          {createError ? (
            <Text style={[messageStyle, { color: colors.destructive }]} accessibilityLiveRegion="polite">
              {createError}
            </Text>
          ) : null}

          {canOfferCreate ? (
            <SelectionOptionRow
              title={createTag.isPending ? t("tags.picker.creating") : t("tags.picker.create", { name: normalizedQuery })}
              iconName="add-circle-outline"
              onPress={() => {
                if (!createTag.isPending) void handleCreate();
              }}
            />
          ) : null}

          {!normalizedQuery ? (
            <SelectionOptionRow
              title={t("tags.picker.none")}
              iconName="close-circle-outline"
              active={selectedIds.length === 0}
              onPress={() => onChange([])}
            />
          ) : null}

          {tagsQuery.isLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2) }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={messageStyle}>{t("tags.picker.loading")}</Text>
            </View>
          ) : tagsQuery.isError ? (
            <Text style={[messageStyle, { color: colors.destructive }]}>{t("tags.picker.loadError")}</Text>
          ) : tags.length === 0 && !normalizedQuery ? (
            <Text style={messageStyle}>{t("tags.picker.empty")}</Text>
          ) : visibleTags.length === 0 && !canOfferCreate ? (
            <Text style={messageStyle}>{t("tags.picker.noMatches", { query: normalizedQuery })}</Text>
          ) : (
            visibleTags.map((tag) => {
              const active = selectedIds.includes(tag.id);
              return (
                <SelectionOptionRow
                  key={tag.id}
                  title={tag.name}
                  iconName={active ? "checkmark-circle" : "pricetag-outline"}
                  active={active}
                  onPress={() => toggle(tag.id)}
                />
              );
            })
          )}
        </View>
      </SelectionShell>
    </View>
  );
}
