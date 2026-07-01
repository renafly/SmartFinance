import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, TextInput as NativeTextInput, View } from "react-native";
import { Text } from "react-native-paper";

import { useArchiveCategory, useCategories, useCreateCategory, useDeleteCategory, useRestoreCategory } from "@/features/categories/hooks";
import { useSession } from "@/shared/session";
import Screen from "@/shared/components/ui/Screen";
import PageHeader from "@/shared/components/ui/PageHeader";
import Section from "@/shared/components/ui/Section";
import EmptyState from "@/shared/components/ui/EmptyState";
import { Select } from "@/shared/components/ui/Select";
import { useI18n } from "@/shared/i18n";
import { colors, spacing } from "@/shared/theme";

type CategoryType = "income" | "expense" | "account";

export default function CategoriesScreen() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const householdId = session?.household.id;

  const [typeFilter, setTypeFilter] = useState<CategoryType>("expense");
  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CategoryType>("expense");
  const [newIcon, setNewIcon] = useState("");
  const [newColor, setNewColor] = useState("");

  const createMutation = useCreateCategory();
  const archiveMutation = useArchiveCategory();
  const deleteMutation = useDeleteCategory();
  const restoreMutation = useRestoreCategory();

  const { data: categories = [], isPending, error } = useCategories(typeFilter);

  const sortedCategories = useMemo(() => {
    return [...categories]
      .filter((category) => showArchived || !category.is_archived)
      .sort((a, b) => {
      if (a.is_default !== b.is_default) {
        return a.is_default ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
      });
  }, [categories, showArchived]);

  const onCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !householdId) return;

    await createMutation.mutateAsync({
      household_id: householdId,
      name: trimmed,
      type: newType,
      icon: newIcon.trim() || null,
      color: newColor.trim() || null,
    });

    setNewName("");
    setNewIcon("");
    setNewColor("");
  };

  const askDelete = (categoryId: string, categoryName: string) => {
    Alert.alert(
      t("categories.deleteTitle"),
      t("categories.deleteMessage", { name: categoryName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await deleteMutation.mutateAsync(categoryId);
          },
        },
      ]
    );
  };

  const askArchive = (categoryId: string, categoryName: string) => {
    Alert.alert(
      t("categories.archiveTitle"),
      t("categories.archiveMessage", { name: categoryName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("categories.archive"),
          onPress: async () => {
            await archiveMutation.mutateAsync(categoryId);
          },
        },
      ]
    );
  };

  const askRestore = (categoryId: string, categoryName: string) => {
    Alert.alert(
      t("categories.restoreTitle"),
      t("categories.restoreMessage", { name: categoryName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("categories.restore"),
          onPress: async () => {
            await restoreMutation.mutateAsync(categoryId);
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <PageHeader title={t("categories.title")} subtitle={t("categories.subtitle")} />

      <Section title={t("categories.filterTitle")}>
        <Select
          options={[
            { id: "expense", label: t("categories.expense") },
            { id: "income", label: t("categories.income") },
            { id: "account", label: t("categories.account") },
          ]}
          selected={typeFilter}
          onSelect={(v) => setTypeFilter(v as CategoryType)}
        />
        <Pressable onPress={() => setShowArchived((value) => !value)} style={{ marginTop: spacing.md }}>
          <Text style={{ fontWeight: "700" }}>
            {showArchived ? t("categories.showArchived") : t("categories.hideArchived")}
          </Text>
        </Pressable>
      </Section>

      <Section title={t("categories.addTitle")}>
        <View style={{ gap: spacing.lg }}>
          <Select
            label={t("categories.type")}
            options={[
              { id: "expense", label: t("categories.expense") },
              { id: "income", label: t("categories.income") },
              { id: "account", label: t("categories.account") },
            ]}
            selected={newType}
            onSelect={(v) => setNewType(v as CategoryType)}
          />

          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontWeight: "700" }}>{t("categories.name")}</Text>
            <NativeTextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Subscriptions"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 3,
                borderColor: colors.text,
                backgroundColor: colors.surface,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                minHeight: 56,
                color: colors.text,
              }}
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontWeight: "700" }}>{t("categories.icon")}</Text>
            <NativeTextInput
              value={newIcon}
              onChangeText={setNewIcon}
              placeholder="e.g. shopping-cart"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 3,
                borderColor: colors.text,
                backgroundColor: colors.surface,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                minHeight: 56,
                color: colors.text,
              }}
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontWeight: "700" }}>{t("categories.color")}</Text>
            <NativeTextInput
              value={newColor}
              onChangeText={setNewColor}
              placeholder="#FFAA00"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              style={{
                borderWidth: 3,
                borderColor: colors.text,
                backgroundColor: colors.surface,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                minHeight: 56,
                color: colors.text,
              }}
            />
          </View>

          <Pressable
            onPress={onCreate}
            disabled={!newName.trim() || !householdId || createMutation.isPending}
            style={{
              borderWidth: 3,
              borderColor: colors.text,
              backgroundColor: colors.primary,
              paddingVertical: spacing.md,
              alignItems: "center",
              opacity: !newName.trim() || !householdId || createMutation.isPending ? 0.6 : 1,
            }}
          >
            <Text style={{ fontWeight: "900" }}>
              {createMutation.isPending ? t("categories.creating") : t("categories.create")}
            </Text>
          </Pressable>
        </View>
      </Section>

      <Section title={
        typeFilter === "expense"
          ? t("categories.expenseList")
          : typeFilter === "income"
            ? t("categories.incomeList")
            : t("categories.accountList")
      }>
        {isPending ? (
          <ActivityIndicator size="large" />
        ) : error ? (
          <Text style={{ color: colors.danger }}>{String(error)}</Text>
        ) : sortedCategories.length === 0 ? (
          <EmptyState message={t("categories.empty")} />
        ) : (
          <View style={{ gap: spacing.md }}>
            {sortedCategories.map((category) => (
              <View
                key={category.id}
                style={{
                  borderWidth: 3,
                  borderColor: colors.text,
                  backgroundColor: colors.surface,
                  padding: spacing.md,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: spacing.md,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800" }}>{category.name}</Text>
                  {category.icon || category.color ? (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {category.icon ? `Icon: ${category.icon}` : ""}
                      {category.icon && category.color ? " · " : ""}
                      {category.color ? `Color: ${category.color}` : ""}
                    </Text>
                  ) : null}
                  {category.is_default && (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t("categories.default")}</Text>
                  )}
                  {category.is_archived && (
                    <Text style={{ color: colors.warning, fontSize: 12 }}>{t("categories.archived")}</Text>
                  )}
                </View>

                <View style={{ gap: spacing.sm }}>
                  {category.is_archived ? (
                    <Pressable
                      disabled={restoreMutation.isPending}
                      onPress={() => askRestore(category.id, category.name)}
                      style={{
                        borderWidth: 2,
                        borderColor: colors.text,
                        paddingVertical: spacing.xs,
                        paddingHorizontal: spacing.md,
                        backgroundColor: colors.surface,
                        opacity: restoreMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: "800" }}>{t("categories.restore")}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={archiveMutation.isPending}
                      onPress={() => askArchive(category.id, category.name)}
                      style={{
                        borderWidth: 2,
                        borderColor: colors.text,
                        paddingVertical: spacing.xs,
                        paddingHorizontal: spacing.md,
                        backgroundColor: colors.surface,
                        opacity: archiveMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: "800" }}>{t("categories.archive")}</Text>
                    </Pressable>
                  )}

                  <Pressable
                    disabled={deleteMutation.isPending}
                    onPress={() => askDelete(category.id, category.name)}
                    style={{
                      borderWidth: 2,
                      borderColor: colors.danger,
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.md,
                      backgroundColor: "#FFE8E8",
                      opacity: deleteMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: colors.danger, fontWeight: "800" }}>{t("categories.delete")}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </Section>
    </Screen>
  );
}