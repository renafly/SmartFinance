import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";

import {
  Badge,
  EmptyState,
  Table,
  TableCell,
  TableRow,
} from "@/components/data-surface";
import {
  Button,
  Card,
  Page,
  Pill,
  Section,
  formatCurrency,
  formatDate,
} from "@/components/migrated-page";
import { useAccountsWithBalances } from "@/features/accounts/hooks";
import { useCategories } from "@/features/categories/hooks";
import { useHouseholdMemberDetails } from "@/features/households/hooks";
import {
  useCreateRecurringTransaction,
  useDeleteRecurringTransaction,
  useRecurringExecutionHistory,
  useRecurringTransactionsInfinite,
  useToggleRecurringTransaction,
  useUpdateRecurringTransaction,
} from "@/features/recurring-transactions/hooks";
import {
  useSavingPotAccountAssignments,
  useSavingPots,
} from "@/features/saving-pots/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { useResponsiveMetrics } from "@/theme/responsive";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { typography } from "@/theme/typography";

import { styles } from "@/features/transfers/ui-styles";
import type { MovementDraft, ScheduledCategory } from "@/features/transfers/types";
import { emptyDraft, normalizeMonths, ruleKindOf, scheduledCategoryOf, today } from "@/features/transfers/utils";
import { KindPills } from "@/features/transfers/components/kind-pills";
import { MovementFields } from "@/features/transfers/components/movement-fields";
import { RuleMenu } from "@/features/transfers/components/rule-menu";

export function RecurringTransferCreateForm({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const savingPotsQuery = useSavingPots();
  const savingPotAssignmentsQuery = useSavingPotAccountAssignments();
  const createRecurring = useCreateRecurringTransaction();
  const [draft, setDraft] = useState<MovementDraft>(() =>
    emptyDraft("recurring-transfer", profile?.id),
  );
  const [error, setError] = useState<string | null>(null);

  const accounts = accountsQuery.data ?? [];
  const members = (membersQuery.data ?? []).filter(
    (member) => member.status === "accepted",
  );
  const potNameByAccountId = useMemo(() => {
    const potNames = new Map(
      (savingPotsQuery.data ?? []).map((pot: any) => [pot.id, pot.name]),
    );
    return (savingPotAssignmentsQuery.data ?? []).reduce<
      Record<string, string>
    >((result, assignment: any) => {
      const potName = potNames.get(assignment.pot_id);
      if (potName) result[assignment.account_id] = potName;
      return result;
    }, {});
  }, [savingPotAssignmentsQuery.data, savingPotsQuery.data]);
  const typeLabels = useMemo(
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
  const isValid = Boolean(
    householdId &&
    profile?.id &&
    draft.sourceAccountId &&
    draft.destination &&
    draft.title.trim() &&
    Number.isFinite(Number(draft.amount)) &&
    Number(draft.amount) > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(draft.nextRun),
  );

  async function save() {
    if (!isValid || !householdId || !profile?.id || !draft.destination) {
      setError(
        !draft.destination
          ? t("transfers.requiresDestination")
          : t("transfers.invalidMovement"),
      );
      return;
    }

    setError(null);
    await createRecurring.mutateAsync({
      household_id: householdId,
      account_id: draft.sourceAccountId,
      destination_account_id: draft.destination.id,
      destination_pot_id: null,
      rule_kind: "transfer",
      category_id: null,
      title: draft.title.trim(),
      notes: draft.notes.trim() || null,
      amount: Number(draft.amount),
      type: "expense",
      frequency: draft.frequency,
      excluded_months:
        draft.frequency === "custom"
          ? normalizeMonths(draft.excludedMonths)
          : [],
      next_run: draft.nextRun,
      created_by: draft.createdById || profile.id,
    } as any);
    setDraft(emptyDraft("recurring-transfer", profile.id));
    onCreated?.();
  }

  return (
    <View style={styles.formFields}>
      {error ? (
        <Text style={{ color: colors.destructive }}>{error}</Text>
      ) : null}
      <MovementFields
        value={draft}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        accounts={accounts as any}
        potNameByAccountId={potNameByAccountId}
        members={members as any}
        categories={[]}
        typeLabels={typeLabels}
        t={t}
        lockKind
      />
      <Button
        label={
          createRecurring.isPending
            ? t("transfers.formCreating")
            : t("transfers.createRecurring")
        }
        onPress={() => void save()}
        disabled={!isValid || createRecurring.isPending}
      />
    </View>
  );
}

export function TransfersContent({
  embedded = false,
  showCreate = true,
}: {
  embedded?: boolean;
  showCreate?: boolean;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const { householdId, profile } = useAuth();
  const accountsQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const savingPotsQuery = useSavingPots();
  const savingPotAssignmentsQuery = useSavingPotAccountAssignments();
  const recurringQuery = useRecurringTransactionsInfinite(20);
  const createRecurring = useCreateRecurringTransaction();
  const updateRecurring = useUpdateRecurringTransaction();
  const toggleRecurring = useToggleRecurringTransaction();
  const deleteRecurring = useDeleteRecurringTransaction();

  const [draft, setDraft] = useState<MovementDraft>(() =>
    emptyDraft("recurring-transaction", profile?.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<ScheduledCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">(
    "all",
  );
  const [selectedRule, setSelectedRule] = useState<any | null>(null);
  const [editing, setEditing] = useState<MovementDraft | null>(null);
  const [historyRule, setHistoryRule] = useState<any | null>(null);
  const executionHistoryQuery = useRecurringExecutionHistory(historyRule?.id);

  const accounts = accountsQuery.data ?? [];
  const members = (membersQuery.data ?? []).filter(
    (member) => member.status === "accepted",
  );
  const categoriesQuery = useCategories(draft.transactionType);
  const editCategoriesQuery = useCategories(
    editing?.transactionType ?? "expense",
  );
  const potNameByAccountId = useMemo(() => {
    const potNames = new Map(
      (savingPotsQuery.data ?? []).map((pot: any) => [pot.id, pot.name]),
    );
    return (savingPotAssignmentsQuery.data ?? []).reduce<
      Record<string, string>
    >((result, assignment: any) => {
      const potName = potNames.get(assignment.pot_id);
      if (potName) result[assignment.account_id] = potName;
      return result;
    }, {});
  }, [savingPotAssignmentsQuery.data, savingPotsQuery.data]);
  const typeLabels = useMemo(
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
  const recurringRules = useMemo(
    () => recurringQuery.data?.pages.flatMap((page) => page) ?? [],
    [recurringQuery.data],
  );
  const visibleRules = useMemo(
    () =>
      recurringRules.filter((item: any) => {
        if (kindFilter !== "all" && scheduledCategoryOf(item) !== kindFilter)
          return false;
        if (statusFilter === "active" && !item.is_active) return false;
        if (statusFilter === "paused" && item.is_active) return false;
        return true;
      }),
    [kindFilter, recurringRules, statusFilter],
  );

  const updateDraft = (patch: Partial<MovementDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const updateEditing = (patch: Partial<MovementDraft>) =>
    setEditing((current) => (current ? { ...current, ...patch } : current));
  const currentTitle =
    draft.kind === "recurring-transfer"
      ? t("transfers.recurringTransferTitle")
      : t("transfers.recurringTransactionTitle");

  function validMovement(value: MovementDraft) {
    const amount = Number(value.amount);
    const requiredDestination =
      value.kind === "one-off" || value.kind === "recurring-transfer";
    return Boolean(
      householdId &&
      profile?.id &&
      value.sourceAccountId &&
      value.title.trim() &&
      Number.isFinite(amount) &&
      amount > 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.nextRun) &&
      (!requiredDestination || value.destination),
    );
  }

  function recurringPayload(value: MovementDraft) {
    const isTransfer = value.kind === "recurring-transfer";
    return {
      household_id: householdId,
      account_id: value.sourceAccountId,
      destination_account_id: isTransfer
        ? (value.destination?.id ?? null)
        : null,
      destination_pot_id: null,
      rule_kind: isTransfer ? "transfer" : "transaction",
      category_id: isTransfer ? null : value.categoryId,
      title: value.title.trim(),
      notes: value.notes.trim() || null,
      amount: Number(value.amount),
      type: isTransfer ? "expense" : value.transactionType,
      expense_kind:
        !isTransfer && value.transactionType === "expense"
          ? value.expenseKind
          : null,
      frequency: value.frequency,
      excluded_months:
        value.frequency === "custom"
          ? normalizeMonths(value.excludedMonths)
          : [],
      next_run: value.nextRun,
      created_by: value.createdById || profile?.id,
    };
  }

  async function saveDraft() {
    if (!validMovement(draft)) {
      setError(
        draft.kind === "recurring-transfer" && !draft.destination
          ? t("transfers.requiresDestination")
          : t("transfers.invalidMovement"),
      );
      return;
    }
    setError(null);
    await createRecurring.mutateAsync(recurringPayload(draft) as any);
    setDraft(emptyDraft(draft.kind, profile?.id));
  }

  function openEdit(item: any) {
    const kind = ruleKindOf(item);
    const destination = item.destination_account_id
      ? { kind: "account" as const, id: item.destination_account_id }
      : null;
    setEditing({
      id: item.id,
      kind,
      title: item.title ?? "",
      amount: String(item.amount ?? ""),
      notes: item.notes ?? "",
      sourceAccountId: item.account_id ?? "",
      destination,
      categoryId: item.category_id ?? null,
      transactionType: item.type === "income" ? "income" : "expense",
      expenseKind:
        item.expense_kind === "subscription" || item.expense_kind === "bill"
          ? item.expense_kind
          : "other",
      frequency: item.frequency ?? "monthly",
      excludedMonths: normalizeMonths(item.excluded_months),
      nextRun: item.next_run?.slice?.(0, 10) ?? today(),
      createdById: item.created_by ?? profile?.id ?? "",
    });
    setSelectedRule(null);
  }

  async function saveEdit() {
    if (!editing || !validMovement(editing)) return;
    const { household_id: _householdId, ...payload } =
      recurringPayload(editing);
    await updateRecurring.mutateAsync({ id: editing.id!, ...payload } as any);
    setEditing(null);
  }

  const selectedPending = createRecurring.isPending;

  const content = (
    <>
      {showCreate ? (
        <Card>
          <Section title={currentTitle}>
            {error ? (
              <Text style={{ color: colors.destructive }}>{error}</Text>
            ) : null}
            <KindPills
              value={draft.kind}
              onChange={(kind) => {
                setError(null);
                setDraft(emptyDraft(kind, profile?.id));
              }}
            />
            <MovementFields
              value={draft}
              onChange={updateDraft}
              accounts={accounts as any}
              potNameByAccountId={potNameByAccountId}
              members={members as any}
              categories={categoriesQuery.data ?? []}
              typeLabels={typeLabels}
              t={t}
            />
            <Button
              label={
                selectedPending
                  ? t("transfers.formCreating")
                  : t("transfers.createRecurring")
              }
              onPress={() => void saveDraft()}
              disabled={!validMovement(draft) || selectedPending}
            />
          </Section>
        </Card>
      ) : null}

      <Section
        title={t("transfers.scheduledTitle")}
        subtitle={t("transfers.scheduledSubtitle", {
          count: recurringRules.length,
        })}
      >
        <View style={styles.filters}>
          <View style={styles.pillRow}>
            <Pill
              label={t("transfers.filterAll")}
              active={kindFilter === "all"}
              onPress={() => setKindFilter("all")}
            />
            <Pill
              label={t("transfers.types.subscription")}
              active={kindFilter === "subscription"}
              onPress={() => setKindFilter("subscription")}
            />
            <Pill
              label={t("transfers.types.bill")}
              active={kindFilter === "bill"}
              onPress={() => setKindFilter("bill")}
            />
            <Pill
              label={t("transfers.types.recurringIncome")}
              active={kindFilter === "income"}
              onPress={() => setKindFilter("income")}
            />
            <Pill
              label={t("transfers.types.recurringTransfer")}
              active={kindFilter === "transfer"}
              onPress={() => setKindFilter("transfer")}
            />
          </View>
          <View style={styles.pillRow}>
            <Pill
              label={t("transfers.filterAll")}
              active={statusFilter === "all"}
              onPress={() => setStatusFilter("all")}
            />
            <Pill
              label={t("transfers.filterActive")}
              active={statusFilter === "active"}
              onPress={() => setStatusFilter("active")}
            />
            <Pill
              label={t("transfers.filterPaused")}
              active={statusFilter === "paused"}
              onPress={() => setStatusFilter("paused")}
            />
          </View>
        </View>
        {visibleRules.length ? (
          <Table
            columns={[
              { label: t("recurring.titleLabel"), flex: 2 },
              { label: t("transfers.route"), flex: 2.2 },
              { label: t("transfers.frequency"), flex: 1 },
              { label: t("transfers.nextRun"), flex: 1 },
              { label: t("recurring.amount"), align: "right" },
              { label: "", flex: 0.35, align: "right" },
            ]}
          >
            {visibleRules.map((item: any) => {
              const kind = ruleKindOf(item);
              const destinationName =
                item.destination_account?.name ??
                accounts.find(
                  (account: any) => account.id === item.destination_account_id,
                )?.name;
              const sourceName =
                item.account?.name ??
                accounts.find((account: any) => account.id === item.account_id)
                  ?.name ??
                t("transfers.sourceAccount");
              const route =
                kind === "recurring-transfer"
                  ? t("transfers.transferRoute", {
                      from: sourceName,
                      to: destinationName ?? t("transfers.destination"),
                    })
                  : sourceName;
              return (
                <TableRow key={item.id}>
                  <TableCell flex={2}>
                    <View style={styles.ruleTitle}>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: typography.fontWeight.bold as any,
                        }}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.ruleMeta}>
                        <Badge
                          label={item.is_active ? t("active") : t("inactive")}
                          tone={item.is_active ? "success" : "neutral"}
                        />
                        <Text
                          style={[
                            styles.ruleKind,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t(`transfers.types.${scheduledCategoryOf(item)}`)}
                        </Text>
                      </View>
                    </View>
                  </TableCell>
                  <TableCell flex={2.2}>
                    <View style={styles.routeCell}>
                      <Text
                        style={[styles.routeAccount, { color: colors.text }]}
                      >
                        {sourceName}
                      </Text>
                      {kind === "recurring-transfer" ? (
                        <Ionicons
                          name="arrow-forward-outline"
                          size={16}
                          color={colors.primary}
                        />
                      ) : null}
                      <Text
                        style={[styles.routeAccount, { color: colors.text }]}
                      >
                        {kind === "recurring-transfer"
                          ? (destinationName ?? t("transfers.destination"))
                          : route}
                      </Text>
                    </View>
                  </TableCell>
                  <TableCell flex={1}>
                    <Text style={{ color: colors.textSecondary }}>
                      {t(`recurring.frequencies.${item.frequency}`)}
                    </Text>
                  </TableCell>
                  <TableCell flex={1}>
                    <Text style={{ color: colors.textSecondary }}>
                      {formatDate(item.next_run)}
                    </Text>
                  </TableCell>
                  <TableCell align="right">
                    <Text
                      style={[styles.ruleAmount, { color: colors.primary }]}
                    >
                      {formatCurrency(item.amount)}
                    </Text>
                  </TableCell>
                  <TableCell flex={0.35} align="right" mobilePinned>
                    <Pressable
                      onPress={() => setSelectedRule(item)}
                      accessibilityRole="button"
                      accessibilityLabel={t("transfers.editScheduled")}
                      style={[
                        styles.menuButton,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surfaceMuted,
                        },
                      ]}
                    >
                      <Ionicons
                        name="ellipsis-vertical"
                        size={18}
                        color={colors.text}
                      />
                    </Pressable>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        ) : (
          <EmptyState
            title={t("transfers.emptyScheduled")}
            icon="repeat-outline"
          />
        )}
        {recurringQuery.isFetchingNextPage ? (
          <Text style={{ color: colors.textSecondary }}>{t("loading")}</Text>
        ) : recurringQuery.hasNextPage ? (
          <Button
            label={t("loadMore", { defaultValue: "Load more" })}
            variant="secondary"
            onPress={() => void recurringQuery.fetchNextPage()}
          />
        ) : null}
      </Section>

      <RuleMenu
        item={selectedRule}
        onClose={() => setSelectedRule(null)}
        onEdit={() => selectedRule && openEdit(selectedRule)}
        onHistory={() => {
          setHistoryRule(selectedRule);
          setSelectedRule(null);
        }}
        onToggle={() => {
          if (selectedRule)
            void toggleRecurring.mutateAsync({
              id: selectedRule.id,
              active: !selectedRule.is_active,
            });
          setSelectedRule(null);
        }}
        onDelete={() => {
          if (selectedRule) void deleteRecurring.mutateAsync(selectedRule.id);
          setSelectedRule(null);
        }}
        t={t}
        colors={colors}
        responsive={responsive}
      />

      <Modal
        visible={editing !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <View
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEditing(null)}
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
          />
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.modalCard,
                {
                  width: responsive.isPhone ? "100%" : spacing(150),
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("transfers.editScheduled")}
              </Text>
              {editing ? (
                <MovementFields
                  value={editing}
                  onChange={updateEditing}
                  accounts={accounts as any}
                  potNameByAccountId={potNameByAccountId}
                  members={members as any}
                  categories={editCategoriesQuery.data ?? []}
                  typeLabels={typeLabels}
                  t={t}
                  lockKind
                />
              ) : null}
              <View style={styles.modalActions}>
                <Button
                  label={t("cancel")}
                  variant="secondary"
                  onPress={() => setEditing(null)}
                />
                <Button
                  label={
                    updateRecurring.isPending
                      ? t("saving")
                      : t("transfers.saveRecurring")
                  }
                  onPress={() => void saveEdit()}
                  disabled={
                    !editing ||
                    !validMovement(editing) ||
                    updateRecurring.isPending
                  }
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={historyRule !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryRule(null)}
      >
        <View
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setHistoryRule(null)}
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
          />
          <View
            style={[
              styles.historyCard,
              {
                width: responsive.isPhone ? "100%" : spacing(110),
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("transfers.executionHistoryTitle")}
            </Text>
            {executionHistoryQuery.isLoading ? (
              <Text style={{ color: colors.textSecondary }}>
                {t("loading")}
              </Text>
            ) : null}
            {executionHistoryQuery.data?.length ? (
              executionHistoryQuery.data.map((execution: any) => (
                <View
                  key={execution.id}
                  style={[styles.historyRow, { borderColor: colors.border }]}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: typography.fontWeight.bold as any,
                    }}
                  >
                    {formatDate(execution.scheduled_for)}
                  </Text>
                  <Badge
                    label={t(`transfers.executionStatuses.${execution.status}`)}
                    tone={
                      execution.status === "completed"
                        ? "success"
                        : execution.status === "failed"
                          ? "destructive"
                          : "neutral"
                    }
                  />
                  {execution.skip_reason || execution.error_message ? (
                    <Text style={{ color: colors.textSecondary }}>
                      {execution.skip_reason ?? execution.error_message}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : !executionHistoryQuery.isLoading ? (
              <Text style={{ color: colors.textSecondary }}>
                {t("transfers.executionHistoryUnavailable")}
              </Text>
            ) : null}
            <Button
              label={t("close")}
              variant="secondary"
              onPress={() => setHistoryRule(null)}
            />
          </View>
        </View>
      </Modal>
    </>
  );

  if (embedded) return content;

  return (
    <Page title={t("transfers.title")} subtitle={t("transfers.subtitle")}>
      {content}
    </Page>
  );
}

export default function TransfersRedirect() {
  return <Redirect href="/(protected)/transactions" />;
}
