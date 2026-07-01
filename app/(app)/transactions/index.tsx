import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { useAccounts } from "@/features/accounts/hooks";
import { useHouseholdMembers } from "@/features/households/hooks/useHouseholdMembers";
import { TransactionCard } from "@/features/transactions/components/transaction-card";
import {
  TransactionFilters,
  type TransactionFilterState,
} from "@/features/transactions/components/transaction.filters";
import { MultiSelectSheet } from "@/shared/components/ui/MultiSelectSheet";
import { CustomDateRangeSheet } from "@/shared/components/ui/CustomDateRangeSheet";
import { useI18n } from "@/shared/i18n";
import { colors, spacing, typography, radius } from "@/shared/theme";

type SheetType = "account" | "member" | "customDate" | null;

const DEFAULT_FILTERS: TransactionFilterState = {
  type: "all",
  datePreset: "this_month",
  accountIds: [],
  createdByIds: [],
};

function toDateRange(
  preset: TransactionFilterState["datePreset"],
  customRange?: { from: string; to: string }
): { from?: string; to?: string } {
  if (preset === "all_time") return {};
  if (preset === "custom") {
    if (!customRange) return {};
    return { from: customRange.from, to: customRange.to };
  }
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: formatLocalDate(firstDay), to: formatLocalDate(lastDay) };
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TransactionsScreen() {
  const { t } = useI18n();
  const [filterState, setFilterState] = useState<TransactionFilterState>(DEFAULT_FILTERS);
  const [openSheet, setOpenSheet] = useState<SheetType>(null);
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | undefined>();

  const { data: accounts = [] } = useAccounts();
  const { data: members = [] } = useHouseholdMembers();

  const queryFilters = useMemo(() => {
    const { from, to } = toDateRange(filterState.datePreset, customRange);
    return {
      type: filterState.type === "all" ? undefined : filterState.type,
      accountId: filterState.accountIds[0],
      createdBy: filterState.createdByIds[0],
      from,
      to,
    };
  }, [filterState, customRange]);

  const { data: transactions, isPending, error } = useTransactions(queryFilters);

  const accountOptions = accounts.map((a) => ({ id: a.id, label: a.name }));
  const memberOptions = members.map((m) => ({ id: m.id, label: m.full_name ?? m.id }));

  const toggleId = (key: "accountIds" | "createdByIds", id: string) => {
    setFilterState((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
      };
    });
  };

  const activeFilterCount =
    (filterState.type !== "all" ? 1 : 0) +
    (filterState.datePreset !== "this_month" ? 1 : 0) +
    filterState.accountIds.length +
    filterState.createdByIds.length;

  const Header = (
    <View>
      {/* Title row */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t("transactions.title")}</Text>
        <Pressable style={styles.newButton} onPress={() => router.push("/transactions/new")}>
          <Text style={styles.newButtonText}>{t("transactions.new")}</Text>
        </Pressable>
      </View>

      {/* Filters */}
      <TransactionFilters
        value={filterState}
        onChange={setFilterState}
        accounts={accountOptions}
        members={memberOptions}
        onOpenAccountSheet={() => setOpenSheet("account")}
        onOpenMemberSheet={() => setOpenSheet("member")}
        onOpenCustomDate={() => setOpenSheet("customDate")}
      />

      {/* Active filter summary */}
      {activeFilterCount > 0 && (
        <Pressable
          style={styles.clearRow}
          onPress={() => { setFilterState(DEFAULT_FILTERS); setCustomRange(undefined); }}
        >
          <Text style={styles.clearText}>
            {t("transactions.activeFilters", { count: String(activeFilterCount) })}
          </Text>
        </Pressable>
      )}
    </View>
  );

  if (isPending) {
    return (
      <View style={styles.screen}>
        {Header}
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        {Header}
        <View style={styles.center}>
          <Text style={styles.errorText}>{String(error)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={transactions ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            onPress={() => router.push(`/transactions/${item.id}`)}
          />
        )}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          <Text style={styles.empty}>{t("transactions.empty")}</Text>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <MultiSelectSheet
        visible={openSheet === "account"}
        title={t("transactions.accountFilter")}
        options={accountOptions}
        selected={filterState.accountIds}
        onToggle={(id) => toggleId("accountIds", id)}
        onClear={() => setFilterState((prev) => ({ ...prev, accountIds: [] }))}
        onClose={() => setOpenSheet(null)}
      />

      <MultiSelectSheet
        visible={openSheet === "member"}
        title={t("transactions.personFilter")}
        options={memberOptions}
        selected={filterState.createdByIds}
        onToggle={(id) => toggleId("createdByIds", id)}
        onClear={() => setFilterState((prev) => ({ ...prev, createdByIds: [] }))}
        onClose={() => setOpenSheet(null)}
      />

      <CustomDateRangeSheet
        visible={openSheet === "customDate"}
        initialFrom={customRange?.from}
        initialTo={customRange?.to}
        onApply={(range) => setCustomRange(range)}
        onClose={() => setOpenSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: { ...typography.h2, color: colors.text },
  newButton: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  newButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: "700",
  },
  clearRow: {
    marginTop: spacing.sm,
    alignItems: "center",
  },
  clearText: {
    ...typography.caption,
    color: colors.textMuted,
    textDecorationLine: "underline",
  },
  empty: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  errorText: { ...typography.body, color: colors.danger },
});