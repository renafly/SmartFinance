import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

import { Page, Section, Field, Button, Pill, formatCurrency } from "@/components/migrated-page";
import { Badge, EmptyState, MetricCard, Table, TableCell, TableRow } from "@/components/data-surface";
import { HouseholdMemberSelect } from "@/components/household-member-select";
import { useAuth } from "../../providers/AuthProvider";
import { useAccountsWithBalances, useCreateAccount, useArchiveAccount, useDeleteAccount, useUpdateAccount } from "../../features/accounts/hooks";
import { useHouseholdMemberDetails, useMyHouseholds } from "../../features/households/hooks";
import { useSavingPotAccountAssignments, useSavingPotBalances } from "../../features/saving-pots/hooks";
import { usePreferencesStore, type AppCurrency } from "@/stores/preferencesStore";
import { typography } from "@/theme/typography";
import { useTransactionsInfinite } from "../../features/transactions/hooks/useTransactions";
import { ACCOUNT_TYPE_ORDER, SHARED_ACCOUNT_OWNER_KEY, compareAccountsByOwnerThenType, getAccountOwnerKey } from "../../features/accounts/account-ordering";

const accountTypes = ACCOUNT_TYPE_ORDER;
const currencyOptions: AppCurrency[] = ["EUR", "USD", "GBP"];
const ACCOUNT_HISTORY_PAGE_SIZE = 20;

type EditMode = {
  id: string;
  name: string;
};

type AccountHistoryMode = {
  id: string;
  name: string;
};

export default function AccountsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]) as any;
  const { t } = useTranslation("common");
  const { householdId, profile } = useAuth();
  const preferredCurrency = usePreferencesStore((state) => state.currency) as AppCurrency;
  const accountsQuery = useAccountsWithBalances();
  const membersQuery = useHouseholdMemberDetails();
  const householdsQuery = useMyHouseholds();
  const savingPotBalancesQuery = useSavingPotBalances();
  const savingPotAssignmentsQuery = useSavingPotAccountAssignments();
  const createAccount = useCreateAccount();
  const archiveAccount = useArchiveAccount();
  const deleteAccount = useDeleteAccount();
  const updateAccount = useUpdateAccount();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [menuAccount, setMenuAccount] = useState<EditMode | null>(null);
  const [accountHistory, setAccountHistory] = useState<AccountHistoryMode | null>(null);
  const [editAccount, setEditAccount] = useState<{
    id: string;
    name: string;
    type: (typeof accountTypes)[number];
    currency: AppCurrency;
    initialBalance: string;
    ownerProfileId: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof accountTypes)[number]>("bank");
  const [currency, setCurrency] = useState<AppCurrency>(preferredCurrency);
  const [initialBalance, setInitialBalance] = useState("0");
  const [ownerProfileId, setOwnerProfileId] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "shared" | string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | (typeof accountTypes)[number]>("all");
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedAccountGroupKeys, setExpandedAccountGroupKeys] = useState<string[]>([]);
  const [selectedBalanceSliceKey, setSelectedBalanceSliceKey] = useState<string | null>(null);

  const accounts = useMemo(
    () => (accountsQuery.data ?? []) as any[],
    [accountsQuery.data],
  );
  const members = (membersQuery.data ?? []).filter((member) => member.status === "accepted");
  const currentUserLabel = profile?.full_name?.trim() || profile?.email?.trim() || t("settings.you");
  const memberLabelMap = new Map(members.map((member) => [member.userId, member.fullName?.trim() || member.email || member.userId]));
  const householdName = (householdsQuery.data ?? []).find((item: any) => item.id === householdId)?.name?.trim() || t("settings.currentHouseholdLabel");
  const getOwnerLabel = (ownerProfileId?: string | null) => (ownerProfileId === profile?.id ? currentUserLabel : (memberLabelMap.get(ownerProfileId ?? "") ?? t("dashboard.shared", { defaultValue: householdName })));
  const getAccountTypeIcon = (accountType: (typeof accountTypes)[number]) => {
    switch (accountType) {
      case "bank":
        return "business-outline";
      case "cash":
        return "cash-outline";
      case "savings":
        return "file-tray-full-outline";
      case "credit_card":
        return "card-outline";
      case "investment":
        return "trending-up-outline";
      case "ppr":
        return "shield-checkmark-outline";
      default:
        return "layers-outline";
    }
  };
  const getAccountTypeTone = (accountType: (typeof accountTypes)[number]) => {
    switch (accountType) {
      case "savings":
        return "success";
      case "credit_card":
        return "warning";
      case "investment":
      case "ppr":
        return "primary";
      default:
        return "neutral";
    }
  };
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account: any) => {
      const matchesOwner = ownerFilter === "all" ? true : ownerFilter === "shared" ? !account.owner_profile_id : account.owner_profile_id === ownerFilter;
      const matchesType = typeFilter === "all" ? true : account.type === typeFilter;
      return matchesOwner && matchesType;
    });
  }, [accounts, ownerFilter, typeFilter]);
  const ownerOrder = [...members.map((member) => member.userId), SHARED_ACCOUNT_OWNER_KEY];
  const orderedFilteredAccounts = [...filteredAccounts].sort((left, right) => compareAccountsByOwnerThenType(left, right, ownerOrder));
  const accountGroups = orderedFilteredAccounts.reduce<{ key: string; title: string; accounts: any[] }[]>((groups, account) => {
    const key = getAccountOwnerKey(account);
    const lastGroup = groups.at(-1);

    if (lastGroup?.key === key) {
      lastGroup.accounts.push(account);
    } else {
      groups.push({
        key,
        title: getOwnerLabel(account.owner_profile_id),
        accounts: [account],
      });
    }

    return groups;
  }, []);
  const accountGroupTones = [
    { accent: colors.primary, surface: colors.primarySoft },
    { accent: colors.financialPositive, surface: colors.financialPositiveSoft },
    { accent: colors.financialNeutral, surface: colors.financialNeutralSoft },
    {
      accent: colors.financialAttention,
      surface: colors.financialAttentionSoft,
    },
    { accent: colors.financialGoal, surface: colors.financialGoalSoft },
  ];
  const accountChartColors = [
    colors.primary,
    colors.financialPositive,
    colors.financialNeutral,
    colors.financialGoal,
    colors.financialAttention,
    colors.info,
    colors.warning,
    colors.destructive,
  ];
  const archivedCount = accounts.filter((item: any) => item.is_archived).length;
  const activeFilterCount = Number(ownerFilter !== "all") + Number(typeFilter !== "all");
  const visibleAccountsById = new Map(orderedFilteredAccounts.map((account: any) => [account.id, account]));
  const savingPotAssignments = (savingPotAssignmentsQuery.data ?? []) as any[];
  const visibleSavingPots = ((savingPotBalancesQuery.data ?? []) as any[]).filter((pot) =>
    savingPotAssignments.some((assignment) => assignment.pot_id === pot.id && visibleAccountsById.has(assignment.account_id)),
  );
  const visibleSavingPotIds = new Set(visibleSavingPots.map((pot) => pot.id));
  const savingPotAccountIds = new Set(
    savingPotAssignments
      .filter((assignment) => visibleSavingPotIds.has(assignment.pot_id))
      .map((assignment) => assignment.account_id),
  );
  const unassignedVisibleAccounts = orderedFilteredAccounts.filter(
    (account: any) => !savingPotAccountIds.has(account.id),
  );
  const accountTypeTotals = new Map<string, number>();
  unassignedVisibleAccounts.forEach((account: any) => {
    const balance = Math.max(0, Number(account.current_balance ?? account.balance ?? 0));
    accountTypeTotals.set(account.type, (accountTypeTotals.get(account.type) ?? 0) + balance);
  });

  const accountBalanceSlices = [
    ...accountTypes.flatMap((accountType) => {
      const value = accountTypeTotals.get(accountType) ?? 0;
      return value > 0
        ? [{
            key: `type-${accountType}`,
            label: t(`accounts.types.${accountType}`),
            value,
            details: unassignedVisibleAccounts
              .filter((account: any) => account.type === accountType)
              .map((account: any) => ({
                key: account.id,
                name: account.name,
                owner: getOwnerLabel(account.owner_profile_id),
                value: Number(account.current_balance ?? account.balance ?? 0),
              })),
          }]
        : [];
    }),
    ...visibleSavingPots.flatMap((pot) => {
      const visibleAssignedAccounts = savingPotAssignments
        .filter((assignment) => assignment.pot_id === pot.id)
        .flatMap((assignment) => {
          const account: any = visibleAccountsById.get(assignment.account_id);
          return account ? [account] : [];
        });
      const value = visibleAssignedAccounts.reduce(
        (sum, account) => sum + Math.max(0, Number(account.current_balance ?? account.balance ?? 0)),
        0,
      );
      return value > 0
        ? [{
            key: `pot-${pot.id}`,
            label: t("accounts.savingPotSlice", { defaultValue: "Pot · {{name}}", name: pot.name }),
            value,
            details: visibleAssignedAccounts.map((account) => ({
              key: account.id,
              name: account.name,
              owner: getOwnerLabel(account.owner_profile_id),
              value: Number(account.current_balance ?? account.balance ?? 0),
            })),
          }]
        : [];
    }),
  ];
  const accountBalanceSliceTotal = accountBalanceSlices.reduce((sum, slice) => sum + slice.value, 0);
  const selectedBalanceSlice = accountBalanceSlices.find((slice) => slice.key === selectedBalanceSliceKey) ?? null;
  const parsedInitialBalance = Number(initialBalance);
  const accountTransfersQuery = useTransactionsInfinite(
    accountHistory ? { accountId: accountHistory.id } : {},
    ACCOUNT_HISTORY_PAGE_SIZE,
    { enabled: Boolean(accountHistory?.id) },
  );
  const accountTransactions = useMemo(
    () => accountTransfersQuery.data?.pages.flat() ?? [],
    [accountTransfersQuery.data],
  );
  const accountTransfers = useMemo(
    () =>
      accountTransactions
        .sort((a: any, b: any) => {
          const dateA = new Date(a.transaction_date ?? 0).getTime();
          const dateB = new Date(b.transaction_date ?? 0).getTime();
          return dateB - dateA || String(b.id ?? "").localeCompare(String(a.id ?? ""));
        }),
    [accountTransactions],
  );
  const canCreateAccount = !createAccount.isPending && name.trim().length > 0 && Number.isFinite(parsedInitialBalance);

  function toggleAccountGroup(groupKey: string) {
    setExpandedAccountGroupKeys((current) =>
      current.includes(groupKey)
        ? current.filter((key) => key !== groupKey)
        : [...current, groupKey],
    );
  }

  async function handleCreate() {
    if (!householdId || !profile?.id || !name.trim() || !Number.isFinite(parsedInitialBalance) || parsedInitialBalance < 0) {
      setFormError(
        t("accounts.createError", {
          defaultValue: t("accounts.initialBalance"),
        }),
      );
      return;
    }

    setFormError(null);
    await createAccount.mutateAsync({
      household_id: householdId,
      owner_profile_id: ownerProfileId === "" ? null : ownerProfileId || profile.id,
      name: name.trim(),
      type,
      currency: currency,
      initial_balance: parsedInitialBalance,
    });

    setName("");
    setType("bank");
    setCurrency(preferredCurrency);
    setInitialBalance("0");
    setOwnerProfileId(profile?.id ?? "");
    setCreateDialogOpen(false);
  }

  function openCreateDialog() {
    setFormError(null);
    setName("");
    setType("bank");
    setCurrency(preferredCurrency);
    setInitialBalance("0");
    setOwnerProfileId(profile?.id ?? "");
    setCreateDialogOpen(true);
  }

  function resetFilters() {
    setOwnerFilter("all");
    setTypeFilter("all");
  }

  function openEditAccount(account: any) {
    setEditAccount({
      id: account.id,
      name: account.name ?? "",
      type: account.type ?? "bank",
      currency: (account.currency ?? preferredCurrency) as AppCurrency,
      initialBalance: String(account.initial_balance ?? 0),
      ownerProfileId: account.owner_profile_id ?? "",
    });
    setMenuAccount(null);
  }

  async function handleSaveAccount() {
    if (!editAccount) return;

    const nextInitialBalance = Number(editAccount.initialBalance);
    if (!editAccount.name.trim() || !Number.isFinite(nextInitialBalance) || nextInitialBalance < 0) {
      setFormError(t("accounts.saveError", { defaultValue: t("accounts.initialBalance") }));
      return;
    }

    setFormError(null);
    await updateAccount.mutateAsync({
      id: editAccount.id,
      data: {
        name: editAccount.name.trim(),
        type: editAccount.type,
        currency: editAccount.currency,
        initial_balance: nextInitialBalance,
        owner_profile_id: editAccount.ownerProfileId || null,
      } as any,
    });

    setEditAccount(null);
  }

  const loadMoreAccountTransfers = useCallback(
    (event: any) => {
      if (!accountTransfersQuery.hasNextPage || accountTransfersQuery.isFetchingNextPage) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
      const preloadDistance = layoutMeasurement.height * 0.25;

      if (distanceFromBottom <= preloadDistance) {
        void accountTransfersQuery.fetchNextPage();
      }
    },
    [accountTransfersQuery],
  );

  return (
    <Page title={t("accounts.title")} subtitle={t("accounts.subtitle")} actions={<Button label={t("accounts.create")} onPress={openCreateDialog} />}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(3) }}>
        <MetricCard
          label={t("accounts.currentTitle")}
          value={String(filteredAccounts.length)}
          icon="wallet-outline"
          hint={t("accounts.currentSubtitle", {
            count: filteredAccounts.length,
            archived: archivedCount,
          })}
        />
        <MetricCard label={t("accounts.allTypes")} value={String(accounts.length)} icon="layers-outline" hint={t("accounts.filtersByType")} />
      </View>

      {accountBalanceSlices.length ? (
        <Section
          title={t("accounts.balanceChartTitle", { defaultValue: "Account balance overview" })}
          subtitle={t("accounts.balanceChartSubtitle", {
            defaultValue: "Current balances grouped by account type, with each saving pot kept separate.",
          })}
        >
          <View style={styles.balanceChartLayout}>
            <View accessibilityRole="image" accessibilityLabel={t("accounts.balancePieChart", { defaultValue: "Account balance distribution pie chart" })}>
              <Svg width={200} height={200} viewBox="0 0 200 200">
                <Circle cx="100" cy="100" r="70" fill="none" stroke={colors.surfaceMuted} strokeWidth="36" />
                {accountBalanceSlices.map((slice, index) => {
                  const circumference = 2 * Math.PI * 70;
                  const previousValue = accountBalanceSlices.slice(0, index).reduce((sum, item) => sum + item.value, 0);
                  const sliceLength = accountBalanceSliceTotal > 0 ? (slice.value / accountBalanceSliceTotal) * circumference : 0;
                  const offset = accountBalanceSliceTotal > 0 ? (previousValue / accountBalanceSliceTotal) * circumference : 0;
                  const sliceColor = accountChartColors[index % accountChartColors.length];

                  return (
                    <Circle
                      key={slice.key}
                      cx="100"
                      cy="100"
                      r="70"
                      fill="none"
                      stroke={sliceColor}
                      strokeWidth="36"
                      strokeDasharray={`${sliceLength} ${circumference - sliceLength}`}
                      strokeDashoffset={-offset}
                      rotation={-90}
                      origin="100, 100"
                      onPress={() => setSelectedBalanceSliceKey(slice.key)}
                    />
                  );
                })}
              </Svg>
              <View pointerEvents="none" style={styles.balanceChartCenter}>
                <Text style={styles.balanceChartCenterLabel}>{t("dashboard.total")}</Text>
                <Text style={styles.balanceChartCenterValue}>{formatCurrency(accountBalanceSliceTotal)}</Text>
              </View>
            </View>
            <View style={styles.balanceChartLegend}>
              {accountBalanceSlices.map((slice, index) => {
                const sliceColor = accountChartColors[index % accountChartColors.length];
                const percentage = accountBalanceSliceTotal > 0 ? (slice.value / accountBalanceSliceTotal) * 100 : 0;

                return (
                  <Pressable
                    key={slice.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedBalanceSliceKey === slice.key }}
                    accessibilityLabel={`${slice.label}: ${formatCurrency(slice.value)}`}
                    onPress={() => setSelectedBalanceSliceKey(slice.key)}
                    style={({ pressed }) => [
                      styles.balanceChartLegendRow,
                      selectedBalanceSliceKey === slice.key && { backgroundColor: colors.surfaceSelected },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.balanceChartSwatch, { backgroundColor: sliceColor }]} />
                    <View style={styles.balanceChartLegendCopy}>
                      <Text style={styles.balanceChartName} numberOfLines={1}>{slice.label}</Text>
                      <Text style={styles.balanceChartPercentage}>{percentage.toFixed(1)}%</Text>
                    </View>
                    <Text style={[styles.balanceChartValue, { color: sliceColor }]}>{formatCurrency(slice.value)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {selectedBalanceSlice ? (
            <View style={[styles.balanceChartTooltip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.balanceChartTooltipHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.balanceChartTooltipTitle}>{selectedBalanceSlice.label}</Text>
                  <Text style={styles.balanceChartTooltipTotal}>{formatCurrency(selectedBalanceSlice.value)}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("close", { defaultValue: "Close" })}
                  onPress={() => setSelectedBalanceSliceKey(null)}
                  style={({ pressed }) => [styles.balanceChartTooltipClose, pressed && styles.pressed]}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
              {selectedBalanceSlice.details.map((detail) => (
                <View key={detail.key} style={styles.balanceChartTooltipRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.balanceChartTooltipAccount} numberOfLines={1}>{detail.name}</Text>
                    <Text style={styles.balanceChartTooltipOwner} numberOfLines={1}>{detail.owner}</Text>
                  </View>
                  <Text style={styles.balanceChartTooltipValue}>{formatCurrency(detail.value)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Section>
      ) : null}

      <Section
        title={t("accounts.currentTitle")}
        subtitle={t("accounts.currentSubtitle", {
          count: filteredAccounts.length,
          archived: archivedCount,
        })}
      >
        <View style={{ gap: spacing(3), marginBottom: spacing(3) }}>
          <View style={{ gap: spacing(2) }}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.sectionLabel}>{t("accounts.filtersByUser")}</Text>
            </View>
            <View style={styles.pillWrap}>
              <Pill label={t("accounts.allUsers")} active={ownerFilter === "all"} onPress={() => setOwnerFilter("all")} />
              {members.map((member) => (
                <Pill key={member.userId} label={memberLabelMap.get(member.userId) ?? member.userId} active={ownerFilter === member.userId} onPress={() => setOwnerFilter(member.userId)} />
              ))}
              <Pill label={t("dashboard.shared")} active={ownerFilter === "shared"} onPress={() => setOwnerFilter("shared")} />
            </View>
          </View>

          <View style={{ gap: spacing(2) }}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="funnel-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.sectionLabel}>{t("accounts.filtersByType")}</Text>
            </View>
            <View style={styles.pillWrap}>
              <Pill label={t("accounts.allTypes")} active={typeFilter === "all"} onPress={() => setTypeFilter("all")} />
              {accountTypes.map((item) => (
                <Pill key={item} label={t(`accounts.types.${item}`)} active={typeFilter === item} onPress={() => setTypeFilter(item)} />
              ))}
            </View>
          </View>

          {activeFilterCount > 0 ? <Button label={t("accounts.clearFilters")} variant="secondary" onPress={resetFilters} /> : null}
        </View>

        {accountGroups.length ? (
          <View style={styles.accountGroups}>
            {accountGroups.map((group, groupIndex) => {
              const tone = accountGroupTones[groupIndex % accountGroupTones.length];
              const isCollapsed = !expandedAccountGroupKeys.includes(group.key);

              return (
                <View key={group.key} style={[styles.accountGroup, { borderColor: tone.accent, backgroundColor: tone.surface }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: !isCollapsed }}
                    accessibilityLabel={`${group.title}: ${isCollapsed ? t("expand", { defaultValue: "Expand" }) : t("collapse", { defaultValue: "Collapse" })}`}
                    onPress={() => toggleAccountGroup(group.key)}
                    style={({ pressed }) => [styles.accountGroupHeader, pressed && styles.pressed]}
                  >
                    <View style={[styles.accountGroupMarker, { backgroundColor: tone.accent }]} />
                    <Ionicons name="person-outline" size={18} color={tone.accent} />
                    <Text style={[styles.accountGroupTitle, { color: tone.accent }]}>{group.title}</Text>
                    <Badge label={String(group.accounts.length)} tone="neutral" />
                    <Ionicons name={isCollapsed ? "chevron-down" : "chevron-up"} size={18} color={tone.accent} />
                  </Pressable>
                  {!isCollapsed ? <Table
                    columns={[
                      { label: t("accounts.name"), flex: 2.6 },
                      { label: t("accounts.typeLabel"), flex: 1 },
                      { label: t("accounts.initialBalance"), align: "right" },
                      { label: t("dashboard.total"), align: "right" },
                      { label: "", flex: 0.35, align: "right" },
                    ]}
                  >
                    {group.accounts.map((account: any) => {
                      const balance = account.current_balance ?? account.balance ?? 0;
                      const isArchived = Boolean(account.is_archived);

                      return (
                        <TableRow
                          key={account.id}
                          onPress={() =>
                            setAccountHistory({
                              id: account.id,
                              name: account.name,
                            })
                          }
                        >
                          <TableCell flex={2.6}>
                            <View style={styles.accountIdentity}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: spacing(1.5),
                                }}
                              >
                                <Ionicons name={getAccountTypeIcon(account.type)} size={18} color={tone.accent} />
                                <View style={{ flex: 1, gap: spacing(0.5) }}>
                                  <Text style={styles.accountName}>{account.name}</Text>
                                  <Text style={styles.accountMeta}>{account.currency}</Text>
                                </View>
                              </View>
                              {isArchived ? <Badge label={t("accounts.archived")} tone="destructive" /> : null}
                            </View>
                          </TableCell>
                          <TableCell flex={1}>
                            <Badge
                              label={t(`accounts.types.${account.type}`, {
                                defaultValue: account.type,
                              })}
                              tone={getAccountTypeTone(account.type)}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Text style={styles.openingBalance}>{formatCurrency(account.initial_balance ?? 0)}</Text>
                          </TableCell>
                          <TableCell align="right">
                            <Text style={styles.accountBalance}>{formatCurrency(balance)}</Text>
                          </TableCell>
                          <TableCell flex={0.35} align="right" mobilePinned>
                            <Pressable
                              onPress={(event: any) => {
                                event.stopPropagation?.();
                                setMenuAccount({
                                  id: account.id,
                                  name: account.name,
                                });
                              }}
                              style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
                            >
                              <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
                            </Pressable>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Table> : null}
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            title={t("accounts.emptyTitle", {
              defaultValue: t("accounts.currentTitle"),
            })}
            description={t("accounts.emptySubtitle", {
              defaultValue: t("accounts.subtitle"),
            })}
            icon="wallet-outline"
            actionLabel={t("accounts.create")}
            onAction={openCreateDialog}
          />
        )}
      </Section>

      <Modal visible={createDialogOpen} transparent animationType="fade" onRequestClose={() => setCreateDialogOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressable} onPress={() => setCreateDialogOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("accounts.createTitle")}</Text>
            <View style={styles.modalTitleRow}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.modalSubtitle}>{t("accounts.createSubtitle")}</Text>
            </View>
            {formError ? (
              <Text
                style={
                  {
                    color: colors.destructive,
                    fontWeight: String(typography.fontWeight.semibold),
                  } as any
                }
              >
                {formError}
              </Text>
            ) : null}
            <Field label={t("accounts.name")} value={name} onChangeText={setName} placeholder={t("accounts.namePlaceholder")} />
            <Text style={styles.sectionLabel}>{t("accounts.typeLabel")}</Text>
            <View style={styles.pillWrap}>
              {accountTypes.map((item) => (
                <Pill key={item} label={t(`accounts.types.${item}`)} active={type === item} onPress={() => setType(item)} />
              ))}
            </View>
            <Text style={styles.sectionLabel}>{t("accounts.currency")}</Text>
            <View style={styles.pillWrap}>
              {currencyOptions.map((item) => (
                <Pill key={item} label={item} active={currency === item} onPress={() => setCurrency(item)} />
              ))}
            </View>
            <HouseholdMemberSelect
              label={t("accounts.owner")}
              members={members}
              value={ownerProfileId}
              placeholder={t("accounts.ownerPlaceholder")}
              hint={t("accounts.ownerPlaceholder")}
              onChange={setOwnerProfileId}
              showSharedOption
              sharedLabel={t("dashboard.shared")}
              sharedDescription={t("accounts.sharedOwnerDescription", {
                defaultValue: t("dashboard.shared"),
              })}
            />
            <Field label={t("accounts.initialBalance")} value={initialBalance} onChangeText={setInitialBalance} placeholder="0" keyboardType="numeric" />
            <View style={styles.modalActions}>
              <Button label={t("cancel")} variant="secondary" onPress={() => setCreateDialogOpen(false)} />
              <Button label={createAccount.isPending ? t("creating") : t("accounts.create")} onPress={() => void handleCreate()} disabled={!canCreateAccount} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={menuAccount !== null} transparent animationType="fade" onRequestClose={() => setMenuAccount(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressable} onPress={() => setMenuAccount(null)} />
          <View style={styles.menuCard}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
              <Text style={styles.modalTitle}>{menuAccount?.name ?? t("accounts.title")}</Text>
            </View>
            <Pressable
              onPress={() => {
                if (!menuAccount) return;
                const account = accounts.find((item: any) => item.id === menuAccount.id);
                if (account) openEditAccount(account);
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            >
              <Ionicons name="create-outline" size={16} color={colors.text} />
              <Text style={styles.menuItemText}>{t("settings.editDetails")}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!menuAccount) return;
                const account = accounts.find((item: any) => item.id === menuAccount.id);
                if (!account) return;
                void archiveAccount.mutateAsync({ id: account.id });
                setMenuAccount(null);
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            >
              <Ionicons name={accounts.find((item: any) => item.id === menuAccount?.id)?.is_archived ? "refresh-outline" : "archive-outline"} size={16} color={colors.text} />
              <Text style={styles.menuItemText}>{accounts.find((item: any) => item.id === menuAccount?.id)?.is_archived ? t("accounts.unarchive") : t("accounts.archive")}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!menuAccount) return;
                void deleteAccount.mutateAsync(menuAccount.id);
                setMenuAccount(null);
              }}
              style={({ pressed }) => [styles.menuItemDanger, pressed && styles.pressed]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.destructive} />
              <Text style={styles.menuItemTextDanger}>{t("delete")}</Text>
            </Pressable>
            <Button label={t("cancel")} variant="secondary" onPress={() => setMenuAccount(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={editAccount !== null} transparent animationType="fade" onRequestClose={() => setEditAccount(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressable} onPress={() => setEditAccount(null)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("settings.editDetails")}</Text>
            <View style={styles.modalTitleRow}>
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              <Text style={styles.modalSubtitle}>
                {t("settings.selectedAccountsHint", {
                  defaultValue: t("accounts.subtitle"),
                })}
              </Text>
            </View>
            {formError ? (
              <Text
                style={
                  {
                    color: colors.destructive,
                    fontWeight: String(typography.fontWeight.semibold),
                  } as any
                }
              >
                {formError}
              </Text>
            ) : null}
            {editAccount ? (
              <>
                <Field label={t("accounts.name")} value={editAccount.name} onChangeText={(value) => setEditAccount((current) => (current ? { ...current, name: value } : current))} />
                <Text style={styles.sectionLabel}>{t("accounts.typeLabel")}</Text>
                <View style={styles.pillWrap}>
                  {accountTypes.map((item) => (
                    <Pill key={item} label={t(`accounts.types.${item}`)} active={editAccount.type === item} onPress={() => setEditAccount((current) => (current ? { ...current, type: item } : current))} />
                  ))}
                </View>
                <Text style={styles.sectionLabel}>{t("accounts.currency")}</Text>
                <View style={styles.pillWrap}>
                  {currencyOptions.map((item) => (
                    <Pill key={item} label={item} active={editAccount.currency === item} onPress={() => setEditAccount((current) => (current ? { ...current, currency: item } : current))} />
                  ))}
                </View>
                <HouseholdMemberSelect
                  label={t("accounts.owner")}
                  members={members}
                  value={editAccount.ownerProfileId}
                  placeholder={t("accounts.ownerPlaceholder")}
                  hint={t("accounts.ownerPlaceholder")}
                  onChange={(value) => setEditAccount((current) => (current ? { ...current, ownerProfileId: value } : current))}
                  showSharedOption
                  sharedLabel={t("dashboard.shared")}
                  sharedDescription={t("accounts.sharedOwnerDescription", {
                    defaultValue: t("dashboard.shared"),
                  })}
                />
                <Field label={t("accounts.initialBalance")} value={editAccount.initialBalance} onChangeText={(value) => setEditAccount((current) => (current ? { ...current, initialBalance: value } : current))} keyboardType="numeric" />
                <View style={styles.modalActions}>
                  <Button label={t("cancel")} variant="secondary" onPress={() => setEditAccount(null)} />
                  <Button
                    label={
                      updateAccount.isPending
                        ? t("saving")
                        : t("accounts.saveChanges", {
                            defaultValue: t("settings.saveChanges"),
                          })
                    }
                    onPress={() => void handleSaveAccount()}
                    disabled={updateAccount.isPending}
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={accountHistory !== null} transparent animationType="fade" onRequestClose={() => setAccountHistory(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropPressable} onPress={() => setAccountHistory(null)} />
          <View style={styles.historyModalCard}>
            <Text style={styles.modalTitle}>{accountHistory?.name ?? t("accounts.title")}</Text>
            <View style={styles.modalTitleRow}>
              <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
              <Text style={styles.modalSubtitle}>
                {t("accounts.accountTransfersSubtitle", {
                  defaultValue: "Transfers for this account, newest first.",
                })}
              </Text>
            </View>
            <ScrollView
              style={styles.historyScroll}
              contentContainerStyle={{ gap: spacing(3) }}
              onScroll={loadMoreAccountTransfers}
              scrollEventThrottle={16}
            >
              {accountTransfersQuery.isPending ? (
                <Text style={styles.accountMeta}>
                  {t("accounts.accountTransfersLoading", { defaultValue: "Loading transfers..." })}
                </Text>
              ) : accountTransfersQuery.error ? (
                <View style={{ gap: spacing(2) }}>
                  <Text style={styles.transferAmountExpense}>
                    {t("accounts.accountTransfersError", { defaultValue: "Could not load transfers for this account." })}
                  </Text>
                  <Button label={t("retry", { defaultValue: "Retry" })} variant="secondary" onPress={() => void accountTransfersQuery.refetch()} />
                </View>
              ) : accountTransfers.length ? (
                <Table
                  columns={[
                    { label: t("transactions.dateLabel"), flex: 1 },
                    { label: t("transactions.titleLabel"), flex: 2 },
                    {
                      label: t("transactions.typeLabel", {
                        defaultValue: "Type",
                      }),
                      flex: 1,
                    },
                    { label: t("transactions.amountLabel"), align: "right" },
                  ]}
                >
                  {accountTransfers.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell flex={1}><Text style={styles.accountMeta}>{new Date(item.transaction_date).toLocaleDateString()}</Text></TableCell>
                      <TableCell flex={2}><Text style={styles.accountName}>{item.title}</Text></TableCell>
                      <TableCell flex={1}><Badge label={t(`transactions.types.${item.type}`, { defaultValue: item.type })} tone={item.type === "expense" ? "destructive" : "success"} /></TableCell>
                      <TableCell align="right">
                        <Text style={item.type === "expense" ? styles.transferAmountExpense : styles.transferAmountIncome}>
                          {item.type === "expense" ? "-" : "+"}{formatCurrency(item.amount)}
                        </Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              ) : (
                <EmptyState
                  title={t("accounts.accountTransfersEmptyTitle", {
                    defaultValue: "No transfers yet",
                  })}
                  description={t("accounts.accountTransfersEmptySubtitle", {
                    defaultValue: "This account does not have any transfer records yet.",
                  })}
                  icon="swap-horizontal-outline"
                />
              )}
              {accountTransfersQuery.isFetchingNextPage ? (
                <Text style={styles.accountMeta}>{t("accounts.accountTransfersLoadingMore")}</Text>
              ) : accountTransfersQuery.hasNextPage ? (
                <Button
                  label={t("transactions.loadMore", { defaultValue: "Load more" })}
                  variant="secondary"
                  onPress={() => void accountTransfersQuery.fetchNextPage()}
                />
              ) : null}
            </ScrollView>
            <Button label={t("close", { defaultValue: "Close" })} variant="secondary" onPress={() => setAccountHistory(null)} />
          </View>
        </View>
      </Modal>
    </Page>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    accountHeader: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: spacing(3),
    },
    accountName: {
      color: colors.text,
      fontWeight: String(typography.fontWeight.bold),
      fontSize: typography.fontSize[16],
    },
    accountMeta: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
    },
    openingBalance: {
      color: colors.textSecondary,
      fontWeight: String(typography.fontWeight.semibold),
    },
    accountBalance: {
      color: colors.primary,
      fontWeight: String(typography.fontWeight.extraBold),
      fontSize: typography.fontSize[18],
    },
    accountIdentity: {
      gap: spacing(1),
    },
    accountGroups: {
      gap: spacing(4),
    },
    balanceChartLayout: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      flexWrap: "wrap" as const,
      gap: spacing(6),
    },
    balanceChartCenter: {
      ...StyleSheet.absoluteFill,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: spacing(8),
    },
    balanceChartCenterLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: String(typography.fontWeight.semibold),
    },
    balanceChartCenterValue: {
      color: colors.text,
      fontSize: typography.fontSize[14],
      fontWeight: String(typography.fontWeight.extraBold),
      textAlign: "center" as const,
    },
    balanceChartLegend: {
      flex: 1,
      minWidth: spacing(55),
      gap: spacing(2.5),
    },
    balanceChartLegendRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing(2),
      padding: spacing(2),
      borderRadius: radius.md,
    },
    balanceChartSwatch: {
      width: spacing(3),
      height: spacing(3),
      borderRadius: radius.full,
    },
    balanceChartLegendCopy: {
      flex: 1,
      minWidth: 0,
    },
    balanceChartName: {
      color: colors.text,
      fontSize: typography.fontSize[13],
      fontWeight: String(typography.fontWeight.semibold),
    },
    balanceChartPercentage: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    balanceChartValue: {
      fontSize: typography.fontSize[13],
      fontWeight: String(typography.fontWeight.extraBold),
      fontVariant: ["tabular-nums"],
    },
    balanceChartTooltip: {
      marginTop: spacing(4),
      padding: spacing(3),
      gap: spacing(2),
      borderWidth: 1,
      borderRadius: radius.lg,
    },
    balanceChartTooltipHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing(3),
    },
    balanceChartTooltipTitle: {
      color: colors.text,
      fontSize: typography.fontSize[15],
      fontWeight: String(typography.fontWeight.extraBold),
    },
    balanceChartTooltipTotal: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[12],
    },
    balanceChartTooltipClose: {
      width: spacing(8),
      height: spacing(8),
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderRadius: radius.full,
    },
    balanceChartTooltipRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing(3),
      paddingTop: spacing(2),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    balanceChartTooltipAccount: {
      color: colors.text,
      fontSize: typography.fontSize[13],
      fontWeight: String(typography.fontWeight.bold),
    },
    balanceChartTooltipOwner: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    balanceChartTooltipValue: {
      color: colors.text,
      fontSize: typography.fontSize[13],
      fontWeight: String(typography.fontWeight.extraBold),
      fontVariant: ["tabular-nums"],
    },
    accountGroup: {
      gap: spacing(2.5),
      padding: spacing(3),
      borderWidth: 1,
      borderLeftWidth: spacing(1),
      borderRadius: radius.lg,
    },
    accountGroupHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing(2),
      paddingHorizontal: spacing(1),
    },
    accountGroupMarker: {
      width: spacing(1.5),
      height: spacing(6),
      borderRadius: radius.full,
    },
    accountGroupTitle: {
      flex: 1,
      fontSize: typography.fontSize[15],
      fontWeight: String(typography.fontWeight.extraBold),
    },
    transferAmountIncome: {
      color: colors.success,
      fontWeight: String(typography.fontWeight.extraBold),
    },
    transferAmountExpense: {
      color: colors.destructive,
      fontWeight: String(typography.fontWeight.extraBold),
    },
    menuButton: {
      width: spacing(10.5),
      height: spacing(10.5),
      borderRadius: radius.mdPlus,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    menuButtonText: {
      color: colors.text,
      fontSize: typography.fontSize[22],
      fontWeight: String(typography.fontWeight.extraBold),
      lineHeight: typography.lineHeight[22],
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "center" as const,
      padding: spacing(5),
      backgroundColor: "rgba(2, 6, 23, 0.82)",
    },
    backdropPressable: StyleSheet.absoluteFill,
    modalCard: {
      width: "100%",
      maxWidth: spacing(160),
      alignSelf: "center" as const,
      gap: spacing(3.5),
      padding: spacing(4.5),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
    },
    historyModalCard: {
      width: "100%",
      maxWidth: spacing(180),
      height: "82%",
      alignSelf: "center" as const,
      gap: spacing(3.5),
      padding: spacing(4.5),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
    },
    historyScroll: {
      flex: 1,
      minHeight: 0,
    },
    menuCard: {
      width: "100%",
      maxWidth: spacing(96),
      alignSelf: "center" as const,
      gap: spacing(3),
      padding: spacing(4.5),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
    },
    modalTitle: {
      color: colors.text,
      fontSize: typography.fontSize[20],
      fontWeight: String(typography.fontWeight.extraBold),
    },
    modalTitleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing(2),
    },
    modalSubtitle: {
      color: colors.textSecondary,
      fontSize: typography.fontSize[13],
      lineHeight: typography.lineHeight[18],
    },
    sectionHeaderRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing(1.5),
    },
    accountLeading: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: spacing(3),
      flex: 1,
    },
    accountIconBadge: {
      width: spacing(10.5),
      height: spacing(10.5),
      borderRadius: radius.lg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing(1.25),
    },
    sectionLabel: {
      color: colors.textSecondary,
      fontWeight: String(typography.fontWeight.semibold),
    },
    pillWrap: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing(2),
    },
    modalActions: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing(2.5),
      justifyContent: "flex-end" as const,
    },
    menuItem: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing(2),
      paddingVertical: spacing(3.5),
      paddingHorizontal: spacing(3.5),
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    menuItemDanger: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing(2),
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
      fontWeight: String(typography.fontWeight.bold),
    },
    menuItemTextDanger: {
      color: colors.destructive,
      fontSize: typography.fontSize[14],
      fontWeight: String(typography.fontWeight.bold),
    },
    pressed: {
      opacity: 0.85,
    },
  } as any);
}
