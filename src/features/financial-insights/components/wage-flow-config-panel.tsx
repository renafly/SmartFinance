import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { EmptyState, Table, TableCell, TableRow } from "@/components/data-surface";
import { Button, Field, Pill, formatCurrency } from "@/components/migrated-page";
import {
  SelectionOptionRow,
  SelectionShell,
  SelectionTrigger,
} from "@/components/selection-shell";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

import {
  WAGE_FLOW_COLOR_PALETTE,
  createWageFlowCategoryId,
  resolveWageFlowColor,
  type WageFlowCategoryConfig,
} from "@/features/financial-insights/wage-flow";

const ICON_PRESET: (keyof typeof Ionicons.glyphMap)[] = [
  "cart-outline",
  "card-outline",
  "flag-outline",
  "sparkles-outline",
  "home-outline",
  "car-outline",
  "restaurant-outline",
  "medkit-outline",
  "school-outline",
  "airplane-outline",
  "gift-outline",
  "construct-outline",
  "business-outline",
  "phone-portrait-outline",
  "paw-outline",
  "ellipse-outline",
];

export type WageFlowAccountOption = {
  id: string;
  name: string;
  type: string;
  potLabel?: string | null;
  ownerLabel: string;
  currentBalance: number;
};

export type WageFlowCategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
};

export type WageFlowConfigTableRow = {
  config: WageFlowCategoryConfig;
  amount: number;
  share: number;
};

/** Flattens a category list (main categories + their subcategories) into
 * the shape the Categories & subcategories picker needs: each main
 * category followed immediately by its own subcategories, alphabetically
 * sorted within each level. Shared by every screen that hosts the Wage
 * Flow category editor (Insights, Dashboard) so they build the same
 * option list from the same raw category rows. */
export function buildHierarchicalCategoryOptions(
  categories: { id: string; name: string; parent_id?: string | null }[],
): WageFlowCategoryOption[] {
  const byParent = new Map<string, typeof categories>();
  const roots: typeof categories = [];
  for (const category of categories) {
    if (category.parent_id) {
      const list = byParent.get(category.parent_id) ?? [];
      list.push(category);
      byParent.set(category.parent_id, list);
    } else {
      roots.push(category);
    }
  }
  const result: WageFlowCategoryOption[] = [];
  for (const root of [...roots].sort((a, b) => a.name.localeCompare(b.name))) {
    result.push({ id: root.id, name: root.name, parentId: null });
    for (const child of (byParent.get(root.id) ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
      result.push({ id: child.id, name: child.name, parentId: root.id });
    }
  }
  return result;
}

/** A fresh, empty Wage Flow category draft for the "add category" flow --
 * shared so every screen that can create one starts from the same
 * defaults (blue, a neutral dot icon, every criterion empty/off). */
export function blankWageFlowCategory(): WageFlowCategoryConfig {
  return {
    id: createWageFlowCategoryId(),
    name: "",
    colorToken: "#3B82F6",
    icon: "ellipse-outline",
    includeAllTransactions: false,
    accountIds: [],
    categoryIds: [],
    potAccountIds: [],
    includeTransfersBetweenAccounts: false,
    includeTransfersIntoPots: false,
  };
}

function accountOptionSubtitle(account: WageFlowAccountOption, includePotLabel: boolean): string {
  const parts: string[] = [];
  if (includePotLabel && account.potLabel) parts.push(account.potLabel);
  parts.push(account.ownerLabel);
  parts.push(formatCurrency(account.currentBalance));
  return parts.join(" · ");
}

type WageFlowAccountTypeGroup = {
  type: string;
  typeLabel: string;
  accounts: WageFlowAccountOption[];
};

type WageFlowAccountOwnerGroup = {
  ownerLabel: string;
  typeGroups: WageFlowAccountTypeGroup[];
};

/** Groups accounts first by owner (member name, or "Shared"), then by
 * account type within each owner -- "Shared" is always sorted last. */
function groupAccountsByOwnerAndType(
  accounts: WageFlowAccountOption[],
  sharedLabel: string,
  typeLabelFor: (type: string) => string,
): WageFlowAccountOwnerGroup[] {
  const byOwner = new Map<string, WageFlowAccountOption[]>();
  for (const account of accounts) {
    const list = byOwner.get(account.ownerLabel) ?? [];
    list.push(account);
    byOwner.set(account.ownerLabel, list);
  }

  const ownerLabels = [...byOwner.keys()].sort((a, b) => {
    if (a === sharedLabel) return 1;
    if (b === sharedLabel) return -1;
    return a.localeCompare(b);
  });

  return ownerLabels.map((ownerLabel) => {
    const ownerAccounts = byOwner.get(ownerLabel)!;
    const byType = new Map<string, WageFlowAccountOption[]>();
    for (const account of ownerAccounts) {
      const list = byType.get(account.type) ?? [];
      list.push(account);
      byType.set(account.type, list);
    }

    const typeGroups = [...byType.keys()]
      .sort((a, b) => typeLabelFor(a).localeCompare(typeLabelFor(b)))
      .map((type) => ({
        type,
        typeLabel: typeLabelFor(type),
        accounts: [...byType.get(type)!].sort((a, b) => a.name.localeCompare(b.name)),
      }));

    return { ownerLabel, typeGroups };
  });
}

function iconButtonStyle(colors: any, disabled: boolean) {
  return {
    width: spacing(8),
    height: spacing(8),
    borderRadius: radius.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    opacity: disabled ? 0.4 : 1,
  };
}

/** Builds a short, human-readable summary of a flow category's active
 * matching rules, e.g. "All transactions" or "2 accounts, 3 categories,
 * transfers into pots". */
export function summarizeWageFlowRules(
  config: WageFlowCategoryConfig,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  const parts: string[] = [];
  if (config.includeAllTransactions) parts.push(t("insights.wageFlow.rules.allTransactions"));
  if (config.accountIds.length > 0)
    parts.push(t("insights.wageFlow.rules.accounts", { count: config.accountIds.length }));
  if (config.categoryIds.length > 0)
    parts.push(t("insights.wageFlow.rules.categories", { count: config.categoryIds.length }));
  if (config.potAccountIds.length > 0)
    parts.push(t("insights.wageFlow.rules.pots", { count: config.potAccountIds.length }));
  if (config.includeTransfersBetweenAccounts)
    parts.push(t("insights.wageFlow.rules.transfersBetweenAccounts"));
  if (config.includeTransfersIntoPots) parts.push(t("insights.wageFlow.rules.transfersIntoPots"));
  return parts.length > 0 ? parts.join(", ") : t("insights.wageFlow.rules.none");
}

export function WageFlowConfigTable({
  rows,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAdd,
  onAddAllMainCategories,
}: {
  rows: WageFlowConfigTableRow[];
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onAdd: () => void;
  /** Bulk-adds one new Wage Flow category per main transaction category that
   * doesn't already have one -- a one-time snapshot, not a standing rule
   * (see `buildOneWageFlowCategoryPerMainCategory`). */
  onAddAllMainCategories: () => void;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing(3) }}>
      <View style={{ gap: spacing(2) }}>
        <Button label={t("insights.wageFlow.addCategory")} variant="secondary" onPress={onAdd} />
        <Button
          label={t("insights.wageFlow.addAllMainCategories")}
          variant="secondary"
          onPress={onAddAllMainCategories}
        />
      </View>
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} />
      {rows.length === 0 ? (
        <EmptyState title={t("insights.wageFlow.configEmpty")} />
      ) : (
        <Table
          columns={[
            { label: t("insights.wageFlow.tableName"), flex: 1.6 },
            { label: t("insights.wageFlow.tableRules"), flex: 2.2 },
            { label: t("insights.wageFlow.tableAmount"), flex: 1, align: "right" },
            { label: t("insights.wageFlow.tableShare"), flex: 0.7, align: "right" },
            { label: t("insights.wageFlow.tableActions"), flex: 1.8, align: "right" },
          ]}
        >
          {rows.map((row, index) => (
            <TableRow key={row.config.id}>
              <TableCell flex={1.6}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2) }}>
                  <View
                    style={{
                      width: spacing(3),
                      height: spacing(3),
                      borderRadius: radius.full,
                      backgroundColor: resolveWageFlowColor(
                        row.config.colorToken,
                        colors as unknown as Record<string, string>,
                        colors.financialNeutral,
                      ),
                    }}
                  />
                  <Text
                    style={{ color: colors.text, fontWeight: typography.fontWeight.semibold }}
                    numberOfLines={1}
                  >
                    {row.config.name}
                  </Text>
                </View>
              </TableCell>
              <TableCell flex={2.2} muted>
                {summarizeWageFlowRules(row.config, t)}
              </TableCell>
              <TableCell flex={1} align="right">
                <Text
                  style={{
                    color: row.amount < 0 ? colors.financialNegative : colors.financialPositive,
                    fontSize: typography.fontSize[13],
                    fontWeight: typography.fontWeight.semibold,
                  }}
                >
                  {row.amount < 0 ? "" : "+"}
                  {formatCurrency(row.amount)}
                </Text>
              </TableCell>
              <TableCell flex={0.7} align="right" muted>
                {`${row.share}%`}
              </TableCell>
              <TableCell flex={1.8} align="right">
                <View style={{ flexDirection: "row", gap: spacing(1.5), justifyContent: "flex-end" }}>
                  <Pressable
                    onPress={() => onMoveUp(row.config.id)}
                    disabled={index === 0}
                    style={iconButtonStyle(colors, index === 0)}
                  >
                    <Ionicons name="arrow-up-outline" size={14} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => onMoveDown(row.config.id)}
                    disabled={index === rows.length - 1}
                    style={iconButtonStyle(colors, index === rows.length - 1)}
                  >
                    <Ionicons name="arrow-down-outline" size={14} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => onEdit(row.config.id)} style={iconButtonStyle(colors, false)}>
                    <Ionicons name="create-outline" size={14} color={colors.text} />
                  </Pressable>
                  <Pressable onPress={() => onRemove(row.config.id)} style={iconButtonStyle(colors, false)}>
                    <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                  </Pressable>
                </View>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}
    </View>
  );
}

type PickerKind = "accounts" | "categories" | "pots" | null;

export function WageFlowCategoryEditorModal({
  visible,
  draft,
  accounts,
  potAccounts,
  categoryOptions,
  isNew,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  draft: WageFlowCategoryConfig | null;
  accounts: WageFlowAccountOption[];
  potAccounts: WageFlowAccountOption[];
  categoryOptions: WageFlowCategoryOption[];
  isNew: boolean;
  onChange: (patch: Partial<WageFlowCategoryConfig>) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const [activePicker, setActivePicker] = useState<PickerKind>(null);
  const [pickerDraftIds, setPickerDraftIds] = useState<string[]>([]);
  const [expandedCategoryGroupIds, setExpandedCategoryGroupIds] = useState<Set<string>>(
    () => new Set(),
  );

  const accountNameById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const potNameById = useMemo(() => new Map(potAccounts.map((a) => [a.id, a.potLabel || a.name])), [potAccounts]);
  const categoryNameById = useMemo(
    () => new Map(categoryOptions.map((c) => [c.id, c.name])),
    [categoryOptions],
  );
  const categoryById = useMemo(
    () => new Map(categoryOptions.map((c) => [c.id, c])),
    [categoryOptions],
  );
  // Same two-level grouping as the shared CategoryPicker used in
  // transactions -- main categories as expandable groups, subcategories
  // nested/indented underneath -- but toggling rather than single-select,
  // since a wage flow category can include several categories at once.
  const { categoryMainList, categoryChildrenByParent } = useMemo(() => {
    const childrenMap = new Map<string, WageFlowCategoryOption[]>();
    const mains: WageFlowCategoryOption[] = [];
    for (const category of categoryOptions) {
      if (category.parentId && categoryById.has(category.parentId)) {
        const list = childrenMap.get(category.parentId) ?? [];
        list.push(category);
        childrenMap.set(category.parentId, list);
      } else {
        mains.push(category);
      }
    }
    return { categoryMainList: mains, categoryChildrenByParent: childrenMap };
  }, [categoryOptions, categoryById]);

  function toggleCategoryGroupExpanded(id: string) {
    setExpandedCategoryGroupIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const accountTypeLabels = useMemo(
    () => ({
      bank: t("accounts.types.bank"),
      cash: t("accounts.types.cash"),
      savings: t("accounts.types.savings"),
      credit_card: t("accounts.types.credit_card"),
      investment: t("accounts.types.investment"),
      ppr: t("accounts.types.ppr"),
    }),
    [t],
  );
  const typeLabelFor = useMemo(
    () => (type: string) => (accountTypeLabels as Record<string, string>)[type] ?? type,
    [accountTypeLabels],
  );
  const sharedLabel = t("dashboard.shared");
  const groupedAccounts = useMemo(
    () => groupAccountsByOwnerAndType(accounts, sharedLabel, typeLabelFor),
    [accounts, sharedLabel, typeLabelFor],
  );
  const groupedPotAccounts = useMemo(
    () => groupAccountsByOwnerAndType(potAccounts, sharedLabel, typeLabelFor),
    [potAccounts, sharedLabel, typeLabelFor],
  );

  if (!draft) return null;

  function openPicker(kind: Exclude<PickerKind, null>) {
    if (kind === "accounts") setPickerDraftIds(draft!.accountIds);
    if (kind === "categories") {
      setPickerDraftIds(draft!.categoryIds);
      // Auto-expand any group that already has a selected subcategory, so
      // reopening the picker never hides the current selection.
      setExpandedCategoryGroupIds((current) => {
        const next = new Set(current);
        for (const id of draft!.categoryIds) {
          const parentId = categoryById.get(id)?.parentId;
          if (parentId) next.add(parentId);
        }
        return next;
      });
    }
    if (kind === "pots") setPickerDraftIds(draft!.potAccountIds);
    setActivePicker(kind);
  }

  function toggleDraftId(id: string) {
    setPickerDraftIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function confirmPicker() {
    if (activePicker === "accounts") onChange({ accountIds: pickerDraftIds });
    if (activePicker === "categories") onChange({ categoryIds: pickerDraftIds });
    if (activePicker === "pots") onChange({ potAccountIds: pickerDraftIds });
    setActivePicker(null);
  }

  const accountsLabel =
    draft.accountIds.length > 0
      ? draft.accountIds.map((id) => accountNameById.get(id) ?? id).join(", ")
      : t("insights.wageFlow.noneSelected");
  const categoriesLabel =
    draft.categoryIds.length > 0
      ? draft.categoryIds.map((id) => categoryNameById.get(id) ?? id).join(", ")
      : t("insights.wageFlow.noneSelected");
  const potsLabel =
    draft.potAccountIds.length > 0
      ? draft.potAccountIds.map((id) => potNameById.get(id) ?? id).join(", ")
      : t("insights.wageFlow.noneSelected");

  return (
    <>
      <SelectionShell
        visible={visible && activePicker === null}
        title={isNew ? t("insights.wageFlow.addCategory") : t("insights.wageFlow.editCategory")}
        subtitle={t("insights.wageFlow.editCategorySubtitle")}
        closeLabel={t("insights.wageFlow.close")}
        onClose={onClose}
        primaryAction={{
          label: t("insights.wageFlow.save"),
          onPress: onSave,
          disabled: draft.name.trim().length === 0,
        }}
      >
        <View style={{ gap: spacing(3.5) }}>
          <Field
            label={t("insights.wageFlow.categoryName")}
            value={draft.name}
            onChangeText={(value) => onChange({ name: value })}
            placeholder={t("insights.wageFlow.categoryNamePlaceholder")}
          />

          <View style={{ gap: spacing(2) }}>
            <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold, fontSize: 13 }}>
              {t("insights.wageFlow.color")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(2) }}>
              {WAGE_FLOW_COLOR_PALETTE.map((hex) => (
                <Pressable
                  key={hex}
                  onPress={() => onChange({ colorToken: hex })}
                  style={{
                    width: spacing(9),
                    height: spacing(9),
                    borderRadius: radius.full,
                    backgroundColor: hex,
                    borderWidth: draft.colorToken === hex ? 3 : 0,
                    borderColor: colors.text,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {draft.colorToken === hex ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: spacing(2) }}>
            <Text style={{ color: colors.textSecondary, fontWeight: typography.fontWeight.semibold, fontSize: 13 }}>
              {t("insights.wageFlow.icon")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(2) }}>
              {ICON_PRESET.map((icon) => {
                const active = draft.icon === icon;
                return (
                  <Pressable
                    key={icon}
                    onPress={() => onChange({ icon })}
                    style={{
                      width: spacing(9),
                      height: spacing(9),
                      borderRadius: radius.md,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primarySoft : colors.surfaceMuted,
                    }}
                  >
                    <Ionicons name={icon} size={16} color={active ? colors.primary : colors.textSecondary} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: spacing(1.5) }}>
            <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold }}>
              {t("insights.wageFlow.whatToInclude")}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>
              {t("insights.wageFlow.whatToIncludeHint")}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: colors.text, fontWeight: typography.fontWeight.semibold }}>
              {t("insights.wageFlow.allTransactions")}
            </Text>
            <View style={{ flexDirection: "row", gap: spacing(1.5) }}>
              <Pill
                label={t("insights.wageFlow.on")}
                active={draft.includeAllTransactions}
                onPress={() => onChange({ includeAllTransactions: true })}
              />
              <Pill
                label={t("insights.wageFlow.off")}
                active={!draft.includeAllTransactions}
                onPress={() => onChange({ includeAllTransactions: false })}
              />
            </View>
          </View>

          <SelectionTrigger
            label={t("insights.wageFlow.specificAccounts")}
            valueLabel={accountsLabel}
            placeholder={t("insights.wageFlow.noneSelected")}
            hint={t("insights.wageFlow.specificAccountsHint")}
            iconName="wallet-outline"
            onPress={() => openPicker("accounts")}
          />

          <SelectionTrigger
            label={t("insights.wageFlow.categoriesAndSubcategories")}
            valueLabel={categoriesLabel}
            placeholder={t("insights.wageFlow.noneSelected")}
            hint={t("insights.wageFlow.categoriesHint")}
            iconName="pricetag-outline"
            onPress={() => openPicker("categories")}
          />

          <SelectionTrigger
            label={t("insights.wageFlow.specificPots")}
            valueLabel={potsLabel}
            placeholder={t("insights.wageFlow.noneSelected")}
            hint={t("insights.wageFlow.specificPotsHint")}
            iconName="flag-outline"
            onPress={() => openPicker("pots")}
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: colors.text, fontWeight: typography.fontWeight.semibold, flex: 1 }}>
              {t("insights.wageFlow.transfersBetweenAccounts")}
            </Text>
            <View style={{ flexDirection: "row", gap: spacing(1.5) }}>
              <Pill
                label={t("insights.wageFlow.on")}
                active={draft.includeTransfersBetweenAccounts}
                onPress={() => onChange({ includeTransfersBetweenAccounts: true })}
              />
              <Pill
                label={t("insights.wageFlow.off")}
                active={!draft.includeTransfersBetweenAccounts}
                onPress={() => onChange({ includeTransfersBetweenAccounts: false })}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: colors.text, fontWeight: typography.fontWeight.semibold, flex: 1 }}>
              {t("insights.wageFlow.transfersIntoPots")}
            </Text>
            <View style={{ flexDirection: "row", gap: spacing(1.5) }}>
              <Pill
                label={t("insights.wageFlow.on")}
                active={draft.includeTransfersIntoPots}
                onPress={() => onChange({ includeTransfersIntoPots: true })}
              />
              <Pill
                label={t("insights.wageFlow.off")}
                active={!draft.includeTransfersIntoPots}
                onPress={() => onChange({ includeTransfersIntoPots: false })}
              />
            </View>
          </View>

          {!isNew ? (
            <View style={{ flexDirection: "row", justifyContent: "flex-start", marginTop: spacing(2) }}>
              <Button label={t("insights.wageFlow.removeCategory")} variant="secondary" onPress={onDelete} />
            </View>
          ) : null}
        </View>
      </SelectionShell>

      <SelectionShell
        visible={visible && activePicker === "accounts"}
        title={t("insights.wageFlow.specificAccounts")}
        subtitle={t("insights.wageFlow.specificAccountsHint")}
        closeLabel={t("insights.wageFlow.close")}
        onClose={() => setActivePicker(null)}
        primaryAction={{ label: t("insights.wageFlow.applySelection"), onPress: confirmPicker }}
      >
        <View style={{ gap: spacing(3) }}>
          {accounts.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t("insights.wageFlow.noAccounts")}</Text>
          ) : (
            <View style={{ gap: spacing(4) }}>
              {groupedAccounts.map((ownerGroup) => (
                <View key={ownerGroup.ownerLabel} style={{ gap: spacing(2.5) }}>
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 12,
                      fontWeight: typography.fontWeight.extraBold,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {ownerGroup.ownerLabel}
                  </Text>
                  {ownerGroup.typeGroups.map((typeGroup) => (
                    <View key={typeGroup.type} style={{ gap: spacing(1.5), paddingLeft: spacing(1) }}>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 11,
                          fontWeight: typography.fontWeight.semibold,
                        }}
                      >
                        {typeGroup.typeLabel}
                      </Text>
                      {typeGroup.accounts.map((account) => (
                        <SelectionOptionRow
                          key={account.id}
                          title={account.name}
                          subtitle={accountOptionSubtitle(account, true)}
                          active={pickerDraftIds.includes(account.id)}
                          onPress={() => toggleDraftId(account.id)}
                          iconName="wallet-outline"
                        />
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </SelectionShell>

      <SelectionShell
        visible={visible && activePicker === "categories"}
        title={t("insights.wageFlow.categoriesAndSubcategories")}
        subtitle={t("insights.wageFlow.categoriesHint")}
        closeLabel={t("insights.wageFlow.close")}
        onClose={() => setActivePicker(null)}
        primaryAction={{ label: t("insights.wageFlow.applySelection"), onPress: confirmPicker }}
      >
        <View style={{ gap: spacing(3) }}>
          {categoryOptions.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t("insights.wageFlow.noCategories")}</Text>
          ) : (
            <View style={{ gap: spacing(2) }}>
              {categoryMainList.map((main) => {
                const children = categoryChildrenByParent.get(main.id) ?? [];
                const isExpanded = expandedCategoryGroupIds.has(main.id);
                return (
                  <View key={main.id} style={{ gap: spacing(2) }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(2) }}>
                      <View style={{ flex: 1 }}>
                        <SelectionOptionRow
                          title={main.name}
                          active={pickerDraftIds.includes(main.id)}
                          onPress={() => toggleDraftId(main.id)}
                          iconName="pricetag-outline"
                        />
                      </View>
                      {children.length > 0 ? (
                        <Pressable
                          onPress={() => toggleCategoryGroupExpanded(main.id)}
                          hitSlop={8}
                          style={({ pressed }) => [
                            {
                              width: spacing(9),
                              height: spacing(9),
                              borderRadius: radius.lg,
                              borderWidth: 1,
                              alignItems: "center",
                              justifyContent: "center",
                              borderColor: colors.border,
                              backgroundColor: colors.surfaceMuted,
                            },
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Ionicons
                            name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"}
                            size={16}
                            color={colors.textSecondary}
                          />
                        </Pressable>
                      ) : (
                        <View style={{ width: spacing(9) }} />
                      )}
                    </View>
                    {isExpanded
                      ? children.map((child) => (
                          <View key={child.id} style={{ marginLeft: spacing(6) }}>
                            <SelectionOptionRow
                              title={child.name}
                              active={pickerDraftIds.includes(child.id)}
                              onPress={() => toggleDraftId(child.id)}
                              iconName="pricetag-outline"
                            />
                          </View>
                        ))
                      : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </SelectionShell>

      <SelectionShell
        visible={visible && activePicker === "pots"}
        title={t("insights.wageFlow.specificPots")}
        subtitle={t("insights.wageFlow.specificPotsHint")}
        closeLabel={t("insights.wageFlow.close")}
        onClose={() => setActivePicker(null)}
        primaryAction={{ label: t("insights.wageFlow.applySelection"), onPress: confirmPicker }}
      >
        <View style={{ gap: spacing(3) }}>
          {potAccounts.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t("insights.wageFlow.noPots")}</Text>
          ) : (
            <View style={{ gap: spacing(4) }}>
              {groupedPotAccounts.map((ownerGroup) => (
                <View key={ownerGroup.ownerLabel} style={{ gap: spacing(2.5) }}>
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 12,
                      fontWeight: typography.fontWeight.extraBold,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {ownerGroup.ownerLabel}
                  </Text>
                  {ownerGroup.typeGroups.map((typeGroup) => (
                    <View key={typeGroup.type} style={{ gap: spacing(1.5), paddingLeft: spacing(1) }}>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 11,
                          fontWeight: typography.fontWeight.semibold,
                        }}
                      >
                        {typeGroup.typeLabel}
                      </Text>
                      {typeGroup.accounts.map((account) => {
                        const subtitle = account.potLabel
                          ? `${account.name} · ${accountOptionSubtitle(account, false)}`
                          : accountOptionSubtitle(account, false);
                        return (
                          <SelectionOptionRow
                            key={account.id}
                            title={account.potLabel || account.name}
                            subtitle={subtitle}
                            active={pickerDraftIds.includes(account.id)}
                            onPress={() => toggleDraftId(account.id)}
                            iconName="flag-outline"
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </SelectionShell>
    </>
  );
}
