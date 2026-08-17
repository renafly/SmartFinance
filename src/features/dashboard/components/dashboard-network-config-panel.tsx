import { useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { Button, formatCurrency } from "@/components/migrated-page";
import {
  SelectionOptionRow,
  SelectionShell,
  SelectionTrigger,
} from "@/components/selection-shell";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";

import type { DashboardNetworkConfig, DashboardNetworkConfigGroup } from "../network-config";

export type DashboardNetworkConfigOption = {
  id: string;
  name: string;
  subtitle?: string;
  balance: number;
};

export type DashboardNetworkConfigGroupDef = {
  group: DashboardNetworkConfigGroup;
  label: string;
  hint: string;
  emptyLabel: string;
  iconName: keyof typeof Ionicons.glyphMap;
  options: DashboardNetworkConfigOption[];
};

/** Human-readable summary of how many of a group's items are currently
 * selected, used both by the group's `SelectionTrigger` on the top-level
 * panel and (indirectly) exercised by unit tests -- kept as a pure function
 * so it doesn't need react-i18next to test. */
export function describeDashboardNetworkSelection(
  selectedCount: number,
  totalCount: number,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (totalCount === 0) return t("dashboard.networkConfigNoneAvailable");
  if (selectedCount === 0) return t("insights.wageFlow.noneSelected");
  if (selectedCount === totalCount) return t("dashboard.networkConfigAllSelected", { count: totalCount });
  return t("dashboard.networkConfigSomeSelected", { selected: selectedCount, total: totalCount });
}

/**
 * Settings panel for the Dashboard's 3D accounts network -- lets the user
 * choose exactly which accounts/pots show up as nodes, with one
 * independently configurable picker per group (Accounts, Investment
 * accounts, Savings accounts, Pots) so selecting/clearing one group never
 * touches another. Structurally mirrors the two-level
 * `WageFlowCategoryEditorModal` picker pattern (top-level shell with
 * `SelectionTrigger`s, each opening its own multi-select `SelectionShell`)
 * so the UX matches the Wage Flow config the user already knows.
 */
export function DashboardNetworkConfigPanel({
  visible,
  onClose,
  config,
  groups,
  onChangeGroup,
  onShowEverything,
}: {
  visible: boolean;
  onClose: () => void;
  config: DashboardNetworkConfig;
  groups: DashboardNetworkConfigGroupDef[];
  onChangeGroup: (group: DashboardNetworkConfigGroup, ids: string[]) => void;
  onShowEverything: () => void;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const [activeGroup, setActiveGroup] = useState<DashboardNetworkConfigGroup | null>(null);
  const [pickerDraftIds, setPickerDraftIds] = useState<string[]>([]);

  const activeGroupDef = groups.find((groupDef) => groupDef.group === activeGroup) ?? null;

  function openGroup(groupDef: DashboardNetworkConfigGroupDef) {
    setPickerDraftIds(config[groupDef.group]);
    setActiveGroup(groupDef.group);
  }

  function toggleDraftId(id: string) {
    setPickerDraftIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function confirmPicker() {
    if (activeGroup) onChangeGroup(activeGroup, pickerDraftIds);
    setActiveGroup(null);
  }

  return (
    <>
      <SelectionShell
        visible={visible && activeGroup === null}
        title={t("dashboard.networkConfigTitle")}
        subtitle={t("dashboard.networkConfigSubtitle")}
        closeLabel={t("insights.wageFlow.close")}
        onClose={onClose}
      >
        <View style={{ gap: spacing(3.5) }}>
          {groups.map((groupDef) => (
            <SelectionTrigger
              key={groupDef.group}
              label={groupDef.label}
              valueLabel={describeDashboardNetworkSelection(
                config[groupDef.group].length,
                groupDef.options.length,
                t,
              )}
              placeholder={t("dashboard.networkConfigNoneAvailable")}
              hint={groupDef.hint}
              iconName={groupDef.iconName}
              disabled={groupDef.options.length === 0}
              onPress={() => openGroup(groupDef)}
            />
          ))}
          <Button
            label={t("dashboard.networkConfigShowEverything")}
            variant="secondary"
            onPress={onShowEverything}
          />
        </View>
      </SelectionShell>

      <SelectionShell
        visible={visible && activeGroupDef !== null}
        title={activeGroupDef?.label ?? ""}
        subtitle={activeGroupDef?.hint}
        closeLabel={t("insights.wageFlow.close")}
        onClose={() => setActiveGroup(null)}
        primaryAction={{ label: t("insights.wageFlow.applySelection"), onPress: confirmPicker }}
      >
        <View style={{ gap: spacing(3) }}>
          {activeGroupDef && activeGroupDef.options.length > 0 ? (
            <View style={{ flexDirection: "row", gap: spacing(2) }}>
              <Button
                label={t("dashboard.networkConfigSelectAll")}
                variant="secondary"
                onPress={() =>
                  setPickerDraftIds(activeGroupDef.options.map((option) => option.id))
                }
              />
              <Button
                label={t("dashboard.networkConfigSelectNone")}
                variant="secondary"
                onPress={() => setPickerDraftIds([])}
              />
            </View>
          ) : null}
          {activeGroupDef && activeGroupDef.options.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{activeGroupDef.emptyLabel}</Text>
          ) : (
            activeGroupDef?.options.map((option) => (
              <SelectionOptionRow
                key={option.id}
                title={option.name}
                subtitle={
                  option.subtitle
                    ? `${option.subtitle} · ${displayCurrency(formatCurrency(option.balance), hideValues)}`
                    : displayCurrency(formatCurrency(option.balance), hideValues)
                }
                active={pickerDraftIds.includes(option.id)}
                onPress={() => toggleDraftId(option.id)}
                iconName={activeGroupDef.iconName}
              />
            ))
          )}
        </View>
      </SelectionShell>
    </>
  );
}
