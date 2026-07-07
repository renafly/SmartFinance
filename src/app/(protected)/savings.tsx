import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { HouseholdMemberSelect } from "@/components/household-member-select";
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
import { useRecurringTransactions } from "../../features/recurring-transactions/hooks";
import {
  useCreateSavingPot,
  useDeleteSavingPot,
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
  owner_profile_id: string | null;
  current_balance: number;
};

type AccountGroup = {
  key: string;
  title: string;
  accounts: AccountOption[];
};

type SelectionMode =
  { kind: "create" } | { kind: "edit"; potId: string; potName: string };

type RecurringRule = {
  account_id: string;
  amount: number;
  type: "income" | "expense";
  frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  excluded_months?: number[] | null;
  is_active: boolean;
};

function getMonthlyRecurringAmount(rule: RecurringRule, month = new Date()) {
  const monthNumber = month.getMonth() + 1;
  if (rule.frequency === "custom" && Array.isArray(rule.excluded_months)) {
    const excluded = rule.excluded_months
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    if (excluded.includes(monthNumber)) {
      return 0;
    }
  }

  const multiplier = {
    daily: 30,
    weekly: 52 / 12,
    monthly: 1,
    yearly: 1 / 12,
    custom: 1,
  }[rule.frequency];

  const signedAmount = rule.type === "income" ? rule.amount : -rule.amount;
  return signedAmount * multiplier;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

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
  const recurringQuery = useRecurringTransactions();
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
  const [draftPotValues, setDraftPotValues] = useState<
    Record<string, { name: string; targetAmount: string }>
  >({});
  const [activePotMenu, setActivePotMenu] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingPotId, setEditingPotId] = useState<string | null>(null);

  const parsedTargetAmount = targetAmount.trim() ? Number(targetAmount) : null;
  const canCreateSavingPot =
    !createSavingPot.isPending &&
    name.trim().length > 0 &&
    (parsedTargetAmount === null || Number.isFinite(parsedTargetAmount));

  const accounts = (accountsQuery.data ?? []) as AccountOption[];
  const recurringRules = (recurringQuery.data ?? []) as RecurringRule[];
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

  function openEditPicker(potId: string, potName: string) {
    setDraftAccountIds(selectionMap.get(potId) ?? []);
    setSelectionMode({ kind: "edit", potId, potName });
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
    setDraftPotValues((drafts) => ({
      ...drafts,
      [potId]: {
        name: current?.name ?? potName ?? "",
        targetAmount:
          current?.targetAmount ??
          (potTargetAmount !== null && potTargetAmount !== undefined
            ? String(potTargetAmount)
            : ""),
      },
    }));
    setEditingPotId(potId);
    setActivePotMenu(null);
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

    await updateSavingPotAccounts.mutateAsync({
      potId: selectionMode.potId,
      accountIds: draftAccountIds,
    });

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

    await updateSavingPot.mutateAsync({
      id: potId,
      name: draft.name.trim(),
      target_amount: nextTargetAmount,
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
            const selectedAccountIds = selectionMap.get(pot.id) ?? [];
            const estimateAccountIds =
              selectedAccountIds.length > 0
                ? selectedAccountIds
                : accounts.map((account) => account.id);
            const accountIdSet = new Set(estimateAccountIds);
            const monthlyRecurringNet = recurringRules
              .filter(
                (rule) => rule.is_active && accountIdSet.has(rule.account_id),
              )
              .reduce((sum, rule) => sum + getMonthlyRecurringAmount(rule), 0);
            const targetValue = Number(
              balance?.target_amount ?? pot.target_amount ?? 0,
            );
            const currentValue = Number(balance?.balance ?? 0);
            const remainingValue = Math.max(0, targetValue - currentValue);
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
                    <Text style={styles.potTarget}>
                      {t("savings.targetAmount")}:{" "}
                      {balance?.target_amount
                        ? formatCurrency(balance.target_amount)
                        : t("savings.noTarget")}
                    </Text>
                    <Text style={styles.potBalance}>
                      {t("savings.balance")}{" "}
                      {formatCurrency(balance?.balance ?? 0)}
                    </Text>
                    <Text style={styles.potMeta}>
                      {t("savings.saved")} {formatCurrency(balance?.saved ?? 0)}{" "}
                      · {t("savings.spent")}{" "}
                      {formatCurrency(balance?.spent ?? 0)}
                    </Text>
                    <Text style={styles.potMeta}>
                      {t("savings.accountsUsed")}:{" "}
                      {selectedCount > 0
                        ? t("savings.selectedAccountsSummary", {
                            count: selectedCount,
                          })
                        : t("savings.allAccountsUsed")}
                    </Text>
                    {percent !== null ? (
                      <Text style={styles.potMeta}>
                        {t("savings.progress", { percent })}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${percent ?? 0}%` },
                      ]}
                    />
                  </View>
                  {remainingValue > 0 && monthlyRecurringNet > 0 ? (
                    <Text style={styles.potMeta}>
                      {t("savings.estimatedFinish", {
                        value: addMonths(
                          new Date(),
                          Math.max(
                            1,
                            Math.ceil(remainingValue / monthlyRecurringNet),
                          ),
                        ).toLocaleDateString(),
                      })}
                    </Text>
                  ) : (
                    <Text style={styles.potMeta}>
                      {t("savings.estimateUnavail")}
                    </Text>
                  )}
                  <Text style={styles.potMeta}>
                    {t("savings.estimateNote")}
                  </Text>
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
              {t("savings.selectedAccountsHint")}
            </Text>
            {editingPotId ? (
              <>
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
                <View style={styles.modalActions}>
                  <Button
                    label={t("savings.closeAccounts")}
                    variant="secondary"
                    onPress={() => setEditingPotId(null)}
                  />
                  <Button
                    label={
                      updateSavingPot.isPending
                        ? t("saving")
                        : t("savings.savePot")
                    }
                    onPress={() => void savePot(editingPotId)}
                    disabled={updateSavingPot.isPending}
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
            <Pressable
              onPress={openCreatePicker}
              style={({ pressed }) => [
                styles.selector,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.selectorLabel}>
                {t("savings.selectAccounts")}
              </Text>
              <Text style={styles.selectorValue}>
                {createSelectedAccountIds.length > 0
                  ? t("savings.selectedAccountsSummary", {
                      count: createSelectedAccountIds.length,
                    })
                  : t("savings.allAccountsUsed")}
              </Text>
              <Text style={styles.selectorHint}>
                {t("savings.selectedAccountsHint")}
              </Text>
            </Pressable>
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
                  openEditPicker(activePotMenu.id, activePotMenu.name);
                }
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.menuItemText}>
                {t("savings.editAccounts")}
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

      <Modal
        visible={selectionMode !== null}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closePicker} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectionModalTitle}</Text>
            <Text style={styles.modalSubtitle}>
              {t("savings.selectedAccountsHint")}
            </Text>

            {accounts.length === 0 ? (
              <Text style={styles.modalEmpty}>
                {t("savings.noAccountsAvailable")}
              </Text>
            ) : (
              <ScrollView
                style={styles.modalList}
                contentContainerStyle={{ gap: spacing(3.5) }}
              >
                {groups.map((group) => (
                  <View key={group.key} style={styles.group}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <View style={{ gap: spacing(2.5) }}>
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
                              <Text style={styles.accountName}>
                                {account.name}
                              </Text>
                              <Text style={styles.accountMeta}>
                                {formatCurrency(account.current_balance)}
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
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Button
                label={t("savings.closeAccounts")}
                variant="secondary"
                onPress={closePicker}
              />
              <Button
                label={
                  updateSavingPotAccounts.isPending
                    ? t("saving")
                    : t("savings.saveAccounts")
                }
                onPress={() => void savePickerSelection()}
                disabled={updateSavingPotAccounts.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(2, 6, 23, 0.82)",
      justifyContent: "center",
      padding: spacing(5),
    },
    modalCard: {
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
      maxHeight: 420,
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
