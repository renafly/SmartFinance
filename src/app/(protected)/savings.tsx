import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { SavingPotForecastTimelineItem } from "@/features/saving-pots/services/saving-pot-forecast.service";

import { HouseholdMemberSelect } from "@/components/household-member-select";
import { MultiSelectShell, SelectionTrigger } from "@/components/selection-shell";
import {
  Button,
  Card,
  Field,
  formatCurrency,
  Page,
  Section,
} from "@/components/migrated-page";
import { typography } from "@/theme/typography";
import { useAccountsWithBalances } from "../../features/accounts/hooks";
import { useHouseholdMemberDetails } from "../../features/households/hooks";
import {
  useCreateSavingPot,
  useDeleteSavingPot,
  useSavingPotForecasts,
  useSavingPotAccountAssignments,
  useSavingPotBalances,
  useSavingPots,
  useUpdateSavingPot,
  useUpdateSavingPotAccounts,
} from "../../features/saving-pots/hooks";
import { useAuth } from "../../providers/AuthProvider";

type AccountOption = {
  id: string;
  name: string;
  type: string;
  owner_profile_id: string | null;
  current_balance: number;
};

type AccountGroup = {
  key: string;
  title: string;
  accounts: AccountOption[];
};

type AccountGroupView = AccountGroup & {
  accountCount: number;
};

type SelectionMode =
  { kind: "create" } | { kind: "edit"; potId: string; potName: string };

type PotDraft = {
  name: string;
  targetAmount: string;
  accountIds: string[];
};

type ForecastViewMode = "monthly" | "yearly";

type ForecastYearRow = {
  year: string;
  contribution: number;
  projectedAmount: number;
  remainingAmount: number;
};

function buildAccountGroups(
  accounts: AccountOption[],
  members: { userId: string; fullName: string | null; email: string | null }[],
  sharedLabel: string,
  unnamedLabel: string,
) {
  const memberLabels = new Map(
    members.map((member) => [
      member.userId,
      member.fullName?.trim() || member.email || unnamedLabel,
    ]),
  );

  const groupMap = new Map<string, AccountGroup>();

  for (const account of accounts) {
    const key = account.owner_profile_id ?? "__shared__";
    const title = account.owner_profile_id
      ? memberLabels.get(account.owner_profile_id) || unnamedLabel
      : sharedLabel;

    const existing = groupMap.get(key);
    if (existing) {
      existing.accounts.push(account);
      continue;
    }

    groupMap.set(key, {
      key,
      title,
      accounts: [account],
    });
  }

  return [...groupMap.values()].map((group) => ({
    ...group,
    accounts: [...group.accounts].sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

function buildSelectionMap(rows: { pot_id: string; account_id: string }[]) {
  const map = new Map<string, string[]>();

  for (const row of rows) {
    const current = map.get(row.pot_id) ?? [];
    current.push(row.account_id);
    map.set(row.pot_id, current);
  }

  return map;
}

function getAccountSummary(account: AccountOption, memberLabelMap: Map<string, string>, sharedLabel: string) {
  const ownerLabel = account.owner_profile_id
    ? memberLabelMap.get(account.owner_profile_id) ?? sharedLabel
    : sharedLabel;

  return `${account.type} · ${ownerLabel}`;
}

function buildForecastYearRows(timeline: SavingPotForecastTimelineItem[]) {
  const rows = new Map<string, ForecastYearRow>();

  for (const item of timeline) {
    const year = item.month.slice(0, 4);
    const current = rows.get(year) ?? {
      year,
      contribution: 0,
      projectedAmount: 0,
      remainingAmount: 0,
    };

    current.contribution += item.contribution;
    current.projectedAmount = item.projectedAmount;
    current.remainingAmount = item.remainingAmount;
    rows.set(year, current);
  }

  return [...rows.values()];
}

function formatForecastMonth(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export default function SavingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation("common");
  const { householdId, profile } = useAuth();
  const savingPotsQuery = useSavingPots();
  const balancesQuery = useSavingPotBalances();
  const assignmentsQuery = useSavingPotAccountAssignments();
  const accountsQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const savingPotForecasts = useSavingPotForecasts();
  const createSavingPot = useCreateSavingPot();
  const deleteSavingPot = useDeleteSavingPot();
  const updateSavingPot = useUpdateSavingPot();
  const updateSavingPotAccounts = useUpdateSavingPotAccounts();

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [createdById, setCreatedById] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSelectedAccountIds, setCreateSelectedAccountIds] = useState<
    string[]
  >([]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode | null>(
    null,
  );
  const [draftAccountIds, setDraftAccountIds] = useState<string[]>([]);
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<string[]>([]);
  const [hasLoadedCollapsedGroups, setHasLoadedCollapsedGroups] = useState(false);
  const [draftPotValues, setDraftPotValues] = useState<Record<string, PotDraft>>({});
  const [activePotMenu, setActivePotMenu] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingPotId, setEditingPotId] = useState<string | null>(null);
  const [expandedForecastPotId, setExpandedForecastPotId] = useState<string | null>(null);
  const [forecastViewMode, setForecastViewMode] = useState<ForecastViewMode>("monthly");

  const parsedTargetAmount = targetAmount.trim() ? Number(targetAmount) : null;
  const canCreateSavingPot =
    !createSavingPot.isPending &&
    name.trim().length > 0 &&
    (parsedTargetAmount === null || Number.isFinite(parsedTargetAmount)) &&
    createSelectedAccountIds.length > 0;

  const accounts = (accountsQuery.data ?? []) as AccountOption[];
  const memberLabelMap = new Map(
    (membersQuery.data ?? [])
      .filter((member) => member.status === "accepted")
      .map((member) => [
        member.userId,
        member.fullName?.trim() || member.email || member.userId,
      ]),
  );
  const currentUserLabel =
    profile?.full_name?.trim() || profile?.email?.trim() || t("settings.you");
  const groups = buildAccountGroups(
    accounts,
    membersQuery.data ?? [],
    t("savings.sharedAccounts"),
    t("settings.unnamedUser"),
  );
  const balanceMap = new Map(
    (balancesQuery.data ?? []).map((pot: any) => [pot.id, pot]),
  );
  const selectionMap = buildSelectionMap(assignmentsQuery.data ?? []);
  const assignedPotByAccount = useMemo(
    () => new Map((assignmentsQuery.data ?? []).map((assignment) => [assignment.account_id, assignment.pot_id])),
    [assignmentsQuery.data],
  );
  const collapsedGroupsKey = householdId ? `smartfinance:savings:collapsed-groups:${householdId}` : null;
  const hydratedCollapsedGroupsKey = useRef<string | null>(null);
  const createSelectedAccountsLabel =
    createSelectedAccountIds.length > 0
      ? t("savings.selectedAccountsSummary", { count: createSelectedAccountIds.length })
      : t("savings.noAccountsSelected");
  const editingDraft = editingPotId ? draftPotValues[editingPotId] : null;
  const editingSelectedAccountsLabel =
    editingDraft && editingDraft.accountIds.length > 0
      ? t("savings.selectedAccountsSummary", { count: editingDraft.accountIds.length })
      : t("savings.noAccountsSelected");

  useEffect(() => {
    if (!collapsedGroupsKey || typeof window === "undefined") return;
    if (hydratedCollapsedGroupsKey.current === collapsedGroupsKey) return;

    const raw = window.localStorage.getItem(collapsedGroupsKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCollapsedGroupKeys(parsed.filter((item) => typeof item === "string"));
        }
      } catch {
        setCollapsedGroupKeys([]);
      }
    } else {
      setCollapsedGroupKeys([]);
    }

    hydratedCollapsedGroupsKey.current = collapsedGroupsKey;
    setHasLoadedCollapsedGroups(true);
  }, [collapsedGroupsKey]);

  useEffect(() => {
    if (!collapsedGroupsKey || typeof window === "undefined" || !hasLoadedCollapsedGroups) return;
    window.localStorage.setItem(collapsedGroupsKey, JSON.stringify(collapsedGroupKeys));
  }, [collapsedGroupKeys, collapsedGroupsKey, hasLoadedCollapsedGroups]);

  const toggleCollapsedGroup = (groupKey: string) => {
    setCollapsedGroupKeys((current) =>
      current.includes(groupKey) ? current.filter((item) => item !== groupKey) : [...current, groupKey],
    );
  };

  const groupedAccounts = useMemo<AccountGroupView[]>(
    () =>
      groups
        .map((group) => ({
          ...group,
          accounts: group.accounts.filter((account) => {
            const assignedPotId = assignedPotByAccount.get(account.id);
            return !assignedPotId || (selectionMode?.kind === "edit" && assignedPotId === selectionMode.potId);
          }),
        }))
        .filter((group) => group.accounts.length > 0)
        .map((group) => ({ ...group, accountCount: group.accounts.length })),
    [assignedPotByAccount, groups, selectionMode],
  );

  async function handleCreate() {
    if (
      !householdId ||
      !profile?.id ||
      !name.trim() ||
      (parsedTargetAmount !== null && !Number.isFinite(parsedTargetAmount))
    ) {
      return;
    }

    await createSavingPot.mutateAsync({
      household_id: householdId,
      created_by: createdById || profile.id,
      name: name.trim(),
      target_amount: parsedTargetAmount,
      selected_account_ids: createSelectedAccountIds,
    } as any);

    setName("");
    setTargetAmount("");
    setCreateSelectedAccountIds([]);
    setCreateDialogOpen(false);
  }

  function openCreateModal() {
    setName("");
    setTargetAmount("");
    setCreateSelectedAccountIds([]);
    setCreatedById(profile?.id ?? "");
    setCreateDialogOpen(true);
  }

  function openCreatePicker() {
    setDraftAccountIds(createSelectedAccountIds);
    setSelectionMode({ kind: "create" });
  }

  function updateDraftPotField(
    potId: string,
    field: "name" | "targetAmount",
    value: string,
  ) {
    setDraftPotValues((current) => ({
      ...current,
      [potId]: {
        name: current[potId]?.name ?? "",
        targetAmount: current[potId]?.targetAmount ?? "",
        accountIds: current[potId]?.accountIds ?? [],
        [field]: value,
      },
    }));
  }

  function openEditDetails(
    potId: string,
    potName: string,
    potTargetAmount?: number | null,
  ) {
    const current = draftPotValues[potId];
    const selectedAccountIds = selectionMap.get(potId) ?? [];
    setDraftPotValues((drafts) => ({
      ...drafts,
      [potId]: {
        name: current?.name ?? potName ?? "",
        targetAmount:
          current?.targetAmount ??
          (potTargetAmount !== null && potTargetAmount !== undefined
            ? String(potTargetAmount)
            : ""),
        accountIds: current?.accountIds ?? selectedAccountIds,
      },
    }));
    setEditingPotId(potId);
    setActivePotMenu(null);
  }

  function openEditAccountPickerFromDraft(potId: string, potName: string) {
    const draft = draftPotValues[potId];
    setDraftAccountIds(draft?.accountIds ?? selectionMap.get(potId) ?? []);
    setSelectionMode({ kind: "edit", potId, potName });
  }

  function closePicker() {
    setSelectionMode(null);
    setDraftAccountIds([]);
  }

  function toggleDraftAccount(accountId: string) {
    setDraftAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((item) => item !== accountId)
        : [...current, accountId],
    );
  }

  async function savePickerSelection() {
    if (!selectionMode) return;

    if (selectionMode.kind === "create") {
      setCreateSelectedAccountIds(draftAccountIds);
      closePicker();
      return;
    }

    if (editingPotId === selectionMode.potId) {
      setDraftPotValues((current) => {
        const currentDraft = current[selectionMode.potId] ?? {
          name: selectionMode.potName,
          targetAmount: "",
          accountIds: [],
        };

        return {
          ...current,
          [selectionMode.potId]: {
            ...currentDraft,
            accountIds: draftAccountIds,
          },
        };
      });
    } else {
      await updateSavingPotAccounts.mutateAsync({
        potId: selectionMode.potId,
        accountIds: draftAccountIds,
      });
    }

    closePicker();
  }

  async function savePot(potId: string) {
    const draft = draftPotValues[potId];
    if (!draft) return;

    const nextTargetAmount = draft.targetAmount.trim()
      ? Number(draft.targetAmount)
      : null;
    if (draft.name.trim().length === 0) return;
    if (nextTargetAmount !== null && !Number.isFinite(nextTargetAmount)) return;
    if (draft.accountIds.length === 0) return;

    await updateSavingPot.mutateAsync({
      id: potId,
      name: draft.name.trim(),
      target_amount: nextTargetAmount,
    });

    await updateSavingPotAccounts.mutateAsync({
      potId,
      accountIds: draft.accountIds,
    });

    setEditingPotId(null);
  }

  const selectionModalTitle =
    selectionMode?.kind === "edit"
      ? `${t("savings.editAccounts")}: ${selectionMode.potName}`
      : t("savings.selectAccounts");

  return (
    <Page
      title={t("savings.title")}
      subtitle={t("savings.subtitle")}
      actions={<Button label={t("savings.addPot")} onPress={openCreateModal} />}
    >
      <Section
        title={t("savings.currentTitle")}
        subtitle={t("savings.currentSubtitle")}
      >
        <View style={{ gap: spacing(2.5) }}>
          {(savingPotsQuery.data ?? []).map((pot: any) => {
            const balance = balanceMap.get(pot.id);
            const selectedCount = Number(balance?.selected_account_count ?? 0);
            const forecast = savingPotForecasts.get(pot.id);
            const targetValue = Number(
              balance?.target_amount ?? pot.target_amount ?? 0,
            );
            const currentValue = Number(balance?.balance ?? 0);
            const remainingValue = Math.max(0, targetValue - currentValue);
            const selectedAccounts = accounts.filter((account) =>
              (selectionMap.get(pot.id) ?? []).includes(account.id),
            );
            const sharedAccountCount = selectedAccounts.filter((account) => account.owner_profile_id === null).length;
            const personalAccountCount = selectedAccounts.length - sharedAccountCount;
            const isForecastExpanded = expandedForecastPotId === pot.id;
            const forecastYears = forecast ? buildForecastYearRows(forecast.timeline) : [];
            const percent =
              balance?.target_amount && Number(balance.target_amount) > 0
                ? Math.min(
                    100,
                    Math.round(
                      (Number(balance.balance ?? 0) /
                        Number(balance.target_amount)) *
                        100,
                    ),
                  )
                : null;

            return (
              <Card key={pot.id}>
                <View style={styles.potHeader}>
                  <View style={styles.potTitleRow}>
                    <Text style={styles.potName}>
                      {balance?.name ?? pot.name}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setActivePotMenu({ id: pot.id, name: pot.name })
                      }
                      style={({ pressed }) => [
                        styles.menuButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.menuButtonText}>⋮</Text>
                    </Pressable>
                  </View>
                  <View style={{ gap: spacing(1) }}>
                    <Text style={styles.potMeta}>
                      {t("savings.createdBy")}:{" "}
                      {pot.created_by === profile?.id
                        ? currentUserLabel
                        : (memberLabelMap.get(pot.created_by) ??
                          t("settings.unnamedUser"))}
                    </Text>
                    <View style={styles.goalAmountGrid}>
                      <View style={styles.goalAmountCell}>
                        <Text style={styles.goalAmountLabel}>{t("savings.balance")}</Text>
                        <Text style={styles.goalBalanceValue}>{formatCurrency(currentValue)}</Text>
                      </View>
                      <View style={styles.goalAmountCell}>
                        <Text style={styles.goalAmountLabel}>{t("savings.targetAmount")}</Text>
                        <Text style={styles.goalAmountValue}>{targetValue > 0 ? formatCurrency(targetValue) : t("savings.noTarget")}</Text>
                      </View>
                      {targetValue > 0 ? (
                        <View style={styles.goalAmountCell}>
                          <Text style={styles.goalAmountLabel}>{t("budgets.remaining", { value: "" })}</Text>
                          <Text style={styles.goalAmountValue}>{formatCurrency(remainingValue)}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.potMeta}>
                      {t("savings.saved")} {formatCurrency(balance?.saved ?? 0)}{" "}
                      · {t("savings.spent")}{" "}
                      {formatCurrency(balance?.spent ?? 0)}
                    </Text>
                    <Text style={styles.potMeta}>
                      {t("savings.accountsUsed")}:{" "}
                      {t("savings.scopeAccountSpecific", { count: selectedCount })}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${percent ?? 0}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.progressCaption}>
                    <Text style={styles.progressText}>{percent !== null ? t("savings.progress", { percent }) : t("savings.noTarget")}</Text>
                    {targetValue > 0 ? <Text style={styles.progressText}>{t("budgets.remaining", { value: formatCurrency(remainingValue) })}</Text> : null}
                  </View>
                  <View style={styles.scopeRow}>
                    {sharedAccountCount > 0 ? <Text style={styles.scopeChip}>{t("savings.scopeShared")} · {sharedAccountCount}</Text> : null}
                    {personalAccountCount > 0 ? <Text style={styles.scopeChip}>{t("budget.incomeModes.individual")} · {personalAccountCount}</Text> : null}
                    <Text style={styles.scopeChip}>{t("savings.scopeAccountSpecific", { count: selectedCount })}</Text>
                  </View>
                  {forecast?.completionDate ? (
                    <Text style={styles.potMeta}>
                      {t("savings.estimatedFinish", {
                        value: new Date(`${forecast.completionDate}T12:00:00`).toLocaleDateString(),
                      })}
                    </Text>
                  ) : (
                    <Text style={styles.potMeta}>
                      {forecast?.unavailableReason === "missing_target"
                        ? t("savings.forecastUnavailableNoTarget")
                        : forecast?.unavailableReason === "beyond_horizon"
                          ? t("savings.forecastUnavailableBeyondHorizon")
                          : t("savings.forecastUnavailableNoContributions")}
                    </Text>
                  )}
                  {forecast?.monthlyContribution ? (
                    <View style={{ gap: spacing(0.5) }}>
                      <Text style={styles.potMeta}>
                        {t("savings.forecastMonthlyContribution", {
                          value: formatCurrency(forecast.monthlyContribution),
                        })}
                      </Text>
                      {forecast.sources.map((source) => (
                        <Text key={source.kind} style={styles.potMeta}>
                          {source.kind === "recurring_transfer"
                            ? t("savings.forecastRecurringTransfers", {
                                value: formatCurrency(source.monthlyContribution),
                              })
                            : t("savings.forecastMonthlyBudget", {
                                value: formatCurrency(source.monthlyContribution),
                              })}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {forecast && forecast.timeline.length > 0 ? (
                    <>
                      <Pressable
                        onPress={() => setExpandedForecastPotId((current) => current === pot.id ? null : pot.id)}
                        style={({ pressed }) => [styles.forecastToggle, pressed && styles.pressed]}
                      >
                        <Text style={styles.forecastToggleText}>
                          {isForecastExpanded ? t("savings.hideForecast") : t("savings.showForecast")}
                        </Text>
                        <Text style={styles.forecastToggleChevron}>{isForecastExpanded ? "▴" : "▾"}</Text>
                      </Pressable>
                      {isForecastExpanded ? (
                        <View style={styles.forecastPanel}>
                          <View style={styles.forecastPanelHeader}>
                            <Text style={styles.forecastPanelTitle}>{t("savings.forecastTimeline")}</Text>
                            <View style={styles.forecastViewToggle}>
                              {(["monthly", "yearly"] as const).map((mode) => (
                                <Pressable
                                  key={mode}
                                  onPress={() => setForecastViewMode(mode)}
                                  style={({ pressed }) => [
                                    styles.forecastViewButton,
                                    forecastViewMode === mode && styles.forecastViewButtonActive,
                                    pressed && styles.pressed,
                                  ]}
                                >
                                  <Text style={forecastViewMode === mode ? styles.forecastViewButtonTextActive : styles.forecastViewButtonText}>
                                    {mode === "monthly" ? t("savings.forecastMonthlyView") : t("savings.forecastYearlyView")}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                          </View>
                          <View style={styles.forecastColumnLabels}>
                            <Text style={[styles.forecastColumnLabel, styles.forecastLabelPrimary]}>
                              {forecastViewMode === "monthly" ? t("savings.forecastMonth") : t("savings.forecastYear")}
                            </Text>
                            <Text style={styles.forecastColumnLabel}>{t("savings.forecastContributionShort")}</Text>
                            <Text style={styles.forecastColumnLabel}>{t("savings.forecastBalanceShort")}</Text>
                          </View>
                          {forecastViewMode === "monthly" ? (
                            <FlatList
                              data={forecast.timeline}
                              keyExtractor={(item) => item.month}
                              nestedScrollEnabled
                              style={styles.forecastTimelineScroll}
                              contentContainerStyle={styles.forecastTimelineContent}
                              initialNumToRender={12}
                              windowSize={5}
                              renderItem={({ item }) => (
                                <View style={[styles.forecastRow, item.reachedTarget && styles.forecastRowComplete]}>
                                  <Text style={[styles.forecastRowText, styles.forecastLabelPrimary]}>{formatForecastMonth(item.month)}</Text>
                                  <Text style={styles.forecastRowText}>{formatCurrency(item.contribution)}</Text>
                                  <Text style={styles.forecastRowBalance}>{formatCurrency(item.projectedAmount)}</Text>
                                </View>
                              )}
                            />
                          ) : (
                            <FlatList
                              data={forecastYears}
                              keyExtractor={(item) => item.year}
                              scrollEnabled={false}
                              contentContainerStyle={styles.forecastYearRows}
                              renderItem={({ item }) => (
                                <View style={[styles.forecastRow, item.remainingAmount === 0 && styles.forecastRowComplete]}>
                                  <Text style={[styles.forecastRowText, styles.forecastLabelPrimary]}>{item.year}</Text>
                                  <Text style={styles.forecastRowText}>{formatCurrency(item.contribution)}</Text>
                                  <Text style={styles.forecastRowBalance}>{formatCurrency(item.projectedAmount)}</Text>
                                </View>
                              )}
                            />
                          )}
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      </Section>

      <Modal
        visible={editingPotId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingPotId(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEditingPotId(null)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("savings.editDetails")}</Text>
            <Text style={styles.modalSubtitle}>
              {t("savings.editPotSubtitle")}
            </Text>
            {editingPotId ? (
              <>
                <ScrollView
                  style={styles.editModalScroll}
                  contentContainerStyle={styles.editModalContent}
                >
                  <Field
                    label={t("savings.name")}
                    value={draftPotValues[editingPotId]?.name ?? ""}
                    onChangeText={(value) =>
                      updateDraftPotField(editingPotId, "name", value)
                    }
                    placeholder={t("savings.namePlaceholder")}
                  />
                  <Field
                    label={t("savings.targetAmount")}
                    value={draftPotValues[editingPotId]?.targetAmount ?? ""}
                    onChangeText={(value) =>
                      updateDraftPotField(editingPotId, "targetAmount", value)
                    }
                    keyboardType="numeric"
                    placeholder="1000"
                  />
                  <View style={styles.editSection}>
                    <SelectionTrigger
                      label={t("savings.selectAccounts")}
                      valueLabel={editingSelectedAccountsLabel}
                      hint={t("savings.selectAccountsRequiredHint")}
                      placeholder={t("savings.selectAccounts")}
                      iconName="wallet-outline"
                      onPress={() => openEditAccountPickerFromDraft(
                        editingPotId,
                        draftPotValues[editingPotId]?.name || t("savings.editDetails"),
                      )}
                    />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <Button
                    label={t("savings.closeAccounts")}
                    variant="secondary"
                    onPress={() => setEditingPotId(null)}
                  />
                  <Button
                    label={
                      updateSavingPot.isPending || updateSavingPotAccounts.isPending
                        ? t("saving")
                        : t("savings.savePot")
                    }
                    onPress={() => void savePot(editingPotId)}
                    disabled={
                      updateSavingPot.isPending ||
                      updateSavingPotAccounts.isPending ||
                      !draftPotValues[editingPotId]?.name.trim() ||
                      draftPotValues[editingPotId]?.accountIds.length === 0
                    }
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={createDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateDialogOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCreateDialogOpen(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("savings.addPot")}</Text>
            <Text style={styles.modalSubtitle}>
              {t("savings.selectedAccountsHint")}
            </Text>
            <Field
              label={t("savings.name")}
              value={name}
              onChangeText={setName}
              placeholder={t("savings.namePlaceholder")}
            />
            <Field
              label={t("savings.targetAmount")}
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="numeric"
              placeholder="1000"
            />
            <SelectionTrigger
              label={t("savings.selectAccounts")}
              valueLabel={createSelectedAccountsLabel}
              hint={t("savings.selectAccountsRequiredHint")}
              placeholder={t("savings.selectAccounts")}
              iconName="wallet-outline"
              onPress={openCreatePicker}
            />
            <HouseholdMemberSelect
              label={t("savings.createdBy")}
              members={(membersQuery.data ?? []).filter(
                (member) => member.status === "accepted",
              )}
              value={createdById || profile?.id || ""}
              placeholder={t("savings.createdByPlaceholder")}
              hint={t("savings.createdByPlaceholder")}
              onChange={setCreatedById}
            />
            <View style={styles.modalActions}>
              <Button
                label={t("savings.closeAccounts")}
                variant="secondary"
                onPress={() => setCreateDialogOpen(false)}
              />
              <Button
                label={
                  createSavingPot.isPending
                    ? t("creating")
                    : t("savings.create")
                }
                onPress={() => void handleCreate()}
                disabled={!canCreateSavingPot}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activePotMenu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePotMenu(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActivePotMenu(null)}
          />
          <View style={styles.menuCard}>
            <Text style={styles.modalTitle}>{t("savings.actions")}</Text>
            <Pressable
              onPress={() => {
                if (activePotMenu) {
                  const pot = (savingPotsQuery.data ?? []).find(
                    (item: any) => item.id === activePotMenu.id,
                  );
                  openEditDetails(
                    activePotMenu.id,
                    activePotMenu.name,
                    pot?.target_amount ?? null,
                  );
                }
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.menuItemText}>
                {t("savings.editDetails")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (activePotMenu) {
                  void deleteSavingPot.mutateAsync(activePotMenu.id);
                }
                setActivePotMenu(null);
              }}
              style={({ pressed }) => [
                styles.menuItemDanger,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.menuItemTextDanger}>
                {t("savings.removePot")}
              </Text>
            </Pressable>
            <Button
              label={t("savings.closeAccounts")}
              variant="secondary"
              onPress={() => setActivePotMenu(null)}
            />
          </View>
        </View>
      </Modal>

      <MultiSelectShell
        visible={selectionMode !== null}
        title={selectionModalTitle}
        subtitle={t("savings.selectedAccountsHint")}
        closeLabel={t("savings.closeAccounts")}
        confirmLabel={updateSavingPotAccounts.isPending ? t("saving") : t("savings.saveAccounts")}
        onClose={closePicker}
        onConfirm={() => void savePickerSelection()}
        confirmDisabled={updateSavingPotAccounts.isPending}
      >
        {groupedAccounts.length === 0 ? (
          <Text style={styles.modalEmpty}>
            {t("savings.noAccountsAvailable")}
          </Text>
        ) : (
          <ScrollView
            style={styles.modalList}
            contentContainerStyle={{ gap: spacing(3.5) }}
          >
            {groupedAccounts.map((group) => {
              const isCollapsed = !hasLoadedCollapsedGroups || collapsedGroupKeys.includes(group.key);

              return (
                <View key={group.key} style={styles.group}>
                  <Pressable
                    onPress={() => toggleCollapsedGroup(group.key)}
                    style={({ pressed }) => [
                      styles.groupHeader,
                      { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupTitle}>{group.title}</Text>
                      <Text style={styles.groupSubtitle}>
                        {t("savings.groupCount", { count: group.accountCount })}
                      </Text>
                    </View>
                    <Text style={styles.groupChevron}>{isCollapsed ? "▸" : "▾"}</Text>
                  </Pressable>
                  {!isCollapsed ? (
                    <View style={{ gap: spacing(2.5), paddingLeft: spacing(1) }}>
                      {group.accounts.map((account) => {
                        const selected = draftAccountIds.includes(account.id);

                        return (
                          <Pressable
                            key={account.id}
                            onPress={() => toggleDraftAccount(account.id)}
                            style={({ pressed }) => [
                              styles.accountRow,
                              selected && styles.accountRowSelected,
                              pressed && styles.pressed,
                            ]}
                          >
                            <View style={{ flex: 1, gap: spacing(1) }}>
                              <Text style={styles.accountName}>{account.name}</Text>
                              <Text style={styles.accountMeta}>
                                {getAccountSummary(account, memberLabelMap, t("dashboard.shared"))} · {formatCurrency(account.current_balance)}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.checkbox,
                                selected && styles.checkboxSelected,
                              ]}
                            >
                              <Text style={styles.checkboxLabel}>
                                {selected ? "✓" : ""}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )}
      </MultiSelectShell>
    </Page>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    scopePill: {
      paddingHorizontal: spacing(3),
      paddingVertical: spacing(1.5),
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    scopePillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    scopePillText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.semibold,
    },
    scopePillTextActive: {
      color: colors.primaryForeground,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.semibold,
    },
    sectionLabel: {
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.semibold,
    },
    pillWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing(1.5),
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing(2),
      paddingHorizontal: spacing(3),
      paddingVertical: spacing(2.5),
      borderRadius: radius.lg,
      borderWidth: 1,
    },
    groupSubtitle: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      marginTop: spacing(0.5),
    },
    groupChevron: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[18],
      fontWeight: typography.fontWeight.bold,
      paddingLeft: spacing(1),
    },
    selector: {
      gap: spacing(1.5),
      padding: spacing(3.5),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    selectorLabel: {
      color: colors.primary,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: typography.letterSpacing[11],
    },
    selectorValue: {
      color: colors.text,
      fontSize: typography.fontSize[14],
      fontWeight: typography.fontWeight.bold,
    },
    selectorHint: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      lineHeight: typography.lineHeight[17],
    },
    menuButton: {
      alignSelf: "flex-start",
      width: spacing(10.5),
      height: spacing(10.5),
      borderRadius: radius.mdPlus,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    menuButtonText: {
      color: colors.text,
      fontSize: typography.fontSize[22],
      fontWeight: typography.fontWeight.extraBold,
      lineHeight: typography.lineHeight[22],
    },
    menuCard: {
      width: "100%",
      maxWidth: spacing(96),
      alignSelf: "center",
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing(4.5),
      gap: spacing(3),
    },
    menuItem: {
      paddingVertical: spacing(3.5),
      paddingHorizontal: spacing(3.5),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    menuItemDanger: {
      paddingVertical: spacing(3.5),
      paddingHorizontal: spacing(3.5),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.destructiveBorder,
      backgroundColor: colors.destructiveSoft,
    },
    menuItemText: {
      color: colors.text,
      fontSize: typography.fontSize[14],
      fontWeight: typography.fontWeight.bold,
    },
    menuItemTextDanger: {
      color: colors.destructive,
      fontSize: typography.fontSize[14],
      fontWeight: typography.fontWeight.bold,
    },
    potHeader: {
      gap: spacing(2.5),
    },
    goalAmountGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing(2),
    },
    goalAmountCell: {
      flexGrow: 1,
      minWidth: spacing(28),
      gap: spacing(0.5),
      padding: spacing(2.5),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    goalAmountLabel: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.semibold,
    },
    goalBalanceValue: {
      color: colors.success,
      fontSize: typography.fontSize[18],
      fontWeight: typography.fontWeight.extraBold,
    },
    goalAmountValue: {
      color: colors.text,
      fontSize: typography.fontSize[16],
      fontWeight: typography.fontWeight.extraBold,
    },
    potTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing(3),
    },
    potName: {
      color: colors.text,
      fontSize: typography.fontSize[18],
      fontWeight: typography.fontWeight.extraBold,
      flex: 1,
    },
    potTarget: {
      color: colors.surfaceSelected,
      fontSize: typography.fontSize[13],
      fontWeight: typography.fontWeight.bold,
    },
    potBalance: {
      color: colors.primary,
      fontSize: typography.fontSize[15],
      fontWeight: typography.fontWeight.extraBold,
    },
    potMeta: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      lineHeight: typography.lineHeight[17],
    },
    progressTrack: {
      marginTop: spacing(1.5),
      height: spacing(2.5),
      borderRadius: radius.full,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: radius.full,
      backgroundColor: colors.success,
    },
    progressCaption: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing(2),
    },
    progressText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.semibold,
    },
    scopeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing(1.5),
    },
    scopeChip: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.semibold,
      paddingHorizontal: spacing(2),
      paddingVertical: spacing(1),
      borderRadius: radius.full,
      backgroundColor: colors.surfaceMuted,
    },
    forecastToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing(2),
      marginTop: spacing(1),
      paddingHorizontal: spacing(3),
      paddingVertical: spacing(2),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    forecastToggleText: {
      color: colors.primary,
      fontSize: typography.fontSize[13],
      fontWeight: typography.fontWeight.extraBold,
    },
    forecastToggleChevron: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[16],
      fontWeight: typography.fontWeight.bold,
    },
    forecastPanel: {
      gap: spacing(2),
      padding: spacing(3),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    forecastPanelHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing(2),
    },
    forecastPanelTitle: {
      color: colors.text,
      fontSize: typography.fontSize[13],
      fontWeight: typography.fontWeight.extraBold,
    },
    forecastViewToggle: {
      flexDirection: "row",
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    forecastViewButton: {
      paddingHorizontal: spacing(2),
      paddingVertical: spacing(1),
    },
    forecastViewButtonActive: {
      backgroundColor: colors.primary,
    },
    forecastViewButtonText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.bold,
    },
    forecastViewButtonTextActive: {
      color: colors.primaryForeground,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.bold,
    },
    forecastColumnLabels: {
      flexDirection: "row",
      gap: spacing(1),
      paddingHorizontal: spacing(2),
    },
    forecastColumnLabel: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.bold,
      textAlign: "right",
      textTransform: "uppercase",
    },
    forecastLabelPrimary: {
      flex: 1.25,
      textAlign: "left",
    },
    forecastTimelineScroll: {
      maxHeight: spacing(80),
    },
    forecastTimelineContent: {
      gap: spacing(1),
    },
    forecastYearRows: {
      gap: spacing(1),
    },
    forecastRow: {
      flexDirection: "row",
      gap: spacing(1),
      paddingHorizontal: spacing(2),
      paddingVertical: spacing(1.5),
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    forecastRowComplete: {
      backgroundColor: colors.successSoft,
    },
    forecastRowText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.semibold,
      textAlign: "right",
    },
    forecastRowBalance: {
      flex: 1,
      color: colors.text,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.extraBold,
      textAlign: "right",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(2, 6, 23, 0.82)",
      justifyContent: "center",
      padding: spacing(5),
    },
    modalCard: {
      width: "100%",
      maxWidth: spacing(160),
      alignSelf: "center",
      maxHeight: "90%",
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing(4.5),
      gap: spacing(3.5),
    },
    modalTitle: {
      color: colors.text,
      fontSize: typography.fontSize[20],
      fontWeight: typography.fontWeight.extraBold,
    },
    modalSubtitle: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[13],
      lineHeight: typography.lineHeight[18],
    },
    modalEmpty: {
      color: colors.textSecondary,
      paddingVertical: spacing(3),
    },
    modalList: {
      maxHeight: spacing(105),
    },
    editModalScroll: {
      maxHeight: spacing(118),
    },
    editModalContent: {
      gap: spacing(3.5),
      paddingBottom: spacing(1),
    },
    editSection: {
      gap: spacing(2),
    },
    group: {
      gap: spacing(2.5),
    },
    groupTitle: {
      color: colors.primary,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.extraBold,
      textTransform: "uppercase",
      letterSpacing: typography.letterSpacing[10],
    },
    accountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing(3),
      padding: spacing(3.5),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    accountRowSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceSelected,
    },
    accountName: {
      color: colors.text,
      fontSize: typography.fontSize[14],
      fontWeight: typography.fontWeight.bold,
    },
    accountMeta: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
    },
    checkbox: {
      width: spacing(7),
      height: spacing(7),
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
    },
    checkboxSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    checkboxLabel: {
      color: colors.text,
      fontWeight: "900",
    },
    modalActions: {
      flexDirection: "row",
      gap: spacing(2.5),
      justifyContent: "flex-end",
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
