import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
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
import Button from "@/shared/components/ui/Button";
import { colors, spacing, typography } from "@/shared/theme";

type SheetType = "account" | "member" | "customDate" | null;

const DEFAULT_FILTERS: TransactionFilterState = {
  type: "all",
  datePreset: "this_month",
  accountIds: [],
  createdByIds: [],
};

function toDateRange(
  preset: TransactionFilterState["datePreset"],
  customRange?: { from: Date; to: Date }
): { from?: string; to?: string } {
  if (preset === "all_time") return {};

  if (preset === "custom") {
    if (!customRange) return {};
    return {
      from: formatLocalDate(customRange.from),
      to: formatLocalDate(customRange.to),
    };
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
  const [filterState, setFilterState] =
    useState<TransactionFilterState>(DEFAULT_FILTERS);
  const [openSheet, setOpenSheet] = useState<SheetType>(null);
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | undefined>();

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
  const memberOptions = members.map((m) => ({
    id: m.id,
    label: m.full_name ?? m.id,
  }));

  const toggleId = (key: "accountIds" | "createdByIds", id: string) => {
    setFilterState((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id],
      };
    });
  };

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{String(error)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transactions</Text>

      <Button
        title="+ New Transaction"
        onPress={() => router.push("/transactions/new")}
      />

      <TransactionFilters
        value={filterState}
        onChange={setFilterState}
        accounts={accountOptions}
        members={memberOptions}
        onOpenAccountSheet={() => setOpenSheet("account")}
        onOpenMemberSheet={() => setOpenSheet("member")}
        onOpenCustomDate={() => setOpenSheet("customDate")}
      />

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {transactions?.length === 0 ? (
          <Text style={styles.empty}>No transactions found.</Text>
        ) : (
          transactions?.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onPress={() => router.push(`/transactions/${transaction.id}`)}
            />
          ))
        )}
      </ScrollView>

      <MultiSelectSheet
        visible={openSheet === "account"}
        title="Account"
        options={accountOptions}
        selected={filterState.accountIds}
        onToggle={(id) => toggleId("accountIds", id)}
        onClear={() => setFilterState((prev) => ({ ...prev, accountIds: [] }))}
        onClose={() => setOpenSheet(null)}
      />

      <MultiSelectSheet
        visible={openSheet === "member"}
        title="Person"
        options={memberOptions}
        selected={filterState.createdByIds}
        onToggle={(id) => toggleId("createdByIds", id)}
        onClear={() =>
          setFilterState((prev) => ({ ...prev, createdByIds: [] }))
        }
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
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { ...typography.h2, color: colors.text },
  list: { gap: spacing.md, paddingBottom: spacing.lg },
  empty: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  errorText: { ...typography.body, color: colors.danger },
});