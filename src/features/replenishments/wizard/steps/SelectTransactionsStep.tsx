import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { CategoryPicker } from "@/components/category-picker";
import { EmptyState } from "@/components/data-surface";
import { Button, Card, Field, Section, formatCurrency, formatDate } from "@/components/migrated-page";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";
import { useCategories } from "@/features/categories/hooks";
import { DateFilterField } from "@/features/transactions/components/transaction-date-field";
import {
  useTransactionMovementsInfinite,
  useTransactionMovementsSummary,
} from "@/features/transactions/hooks/useTransactions";

import { MemberGroupedList, type MemberGroup } from "../../components/MemberGroupedList";
import { accountMemberKey, orderMemberSections } from "../../member-grouping";
import type { ReplenishableTransaction } from "../../types";

const PAGE_SIZE = 25;

export function SelectTransactionsStep({
  replenishAccountIds,
  selected,
  onChangeSelected,
  memberLabelMap,
}: {
  replenishAccountIds: string[];
  selected: Map<string, ReplenishableTransaction>;
  onChangeSelected: (updater: (current: Map<string, ReplenishableTransaction>) => Map<string, ReplenishableTransaction>) => void;
  memberLabelMap: Map<string, string>;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [isSelectingAll, setIsSelectingAll] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const parsedMin = useMemo(() => {
    const value = Number(minAmount.trim());
    return minAmount.trim() && Number.isFinite(value) ? value : undefined;
  }, [minAmount]);
  const parsedMax = useMemo(() => {
    const value = Number(maxAmount.trim());
    return maxAmount.trim() && Number.isFinite(value) ? value : undefined;
  }, [maxAmount]);

  // Both fields are plain YYYY-MM-DD strings (see formatDateInputValue in
  // transaction-date-field.tsx), so a lexical comparison is also a
  // chronological one -- no Date parsing needed.
  const dateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const filters = useMemo(
    () => ({
      accountIds: replenishAccountIds,
      excludeTransfers: true,
      categoryId: categoryId === "all" ? undefined : categoryId,
      // While the range is invalid, drop both bounds rather than sending a
      // from > to query -- the inline warning below tells the user why
      // nothing changed until they fix it.
      from: !dateRangeInvalid && dateFrom ? dateFrom : undefined,
      to: !dateRangeInvalid && dateTo ? dateTo : undefined,
      search: debouncedSearch || undefined,
      minAmount: parsedMin,
      maxAmount: parsedMax,
      sortBy: "newest" as const,
    }),
    [replenishAccountIds, categoryId, dateFrom, dateTo, dateRangeInvalid, debouncedSearch, parsedMin, parsedMax],
  );

  const enabled = replenishAccountIds.length > 0;
  const transactionsQuery = useTransactionMovementsInfinite(filters, PAGE_SIZE, { enabled });
  const summaryQuery = useTransactionMovementsSummary(filters, { enabled });

  const rows = useMemo(() => {
    const byId = new Map<string, any>();
    for (const page of transactionsQuery.data?.pages ?? []) {
      for (const item of page ?? []) byId.set(item.movement_id, item);
    }
    return [...byId.values()];
  }, [transactionsQuery.data]);

  function toRepleshable(row: any): ReplenishableTransaction {
    return {
      id: row.movement_id,
      accountId: row.account_id,
      accountName: row.account?.name ?? "",
      amount: row.amount,
      categoryId: row.category_id,
      title: row.title,
      transactionDate: row.transaction_date,
    };
  }

  function toggleRow(row: any) {
    onChangeSelected((current) => {
      const next = new Map(current);
      if (next.has(row.movement_id)) next.delete(row.movement_id);
      else next.set(row.movement_id, toRepleshable(row));
      return next;
    });
  }

  async function selectAllFiltered() {
    setIsSelectingAll(true);
    try {
      while (transactionsQuery.hasNextPage) {
        await transactionsQuery.fetchNextPage();
      }
      const byId = new Map<string, any>();
      for (const page of transactionsQuery.data?.pages ?? []) {
        for (const item of page ?? []) byId.set(item.movement_id, item);
      }
      onChangeSelected((current) => {
        const next = new Map(current);
        for (const row of byId.values()) next.set(row.movement_id, toRepleshable(row));
        return next;
      });
    } finally {
      setIsSelectingAll(false);
    }
  }

  function clearSelection() {
    onChangeSelected((current) => {
      const next = new Map(current);
      for (const row of rows) next.delete(row.movement_id);
      return next;
    });
  }

  const transactionGroups = useMemo<MemberGroup[]>(() => {
    const keys = rows.map((row) => accountMemberKey(row.account ?? {}));
    const sections = orderMemberSections(keys, memberLabelMap, t("savings.sharedAccounts"));

    return sections.map((section) => ({
      key: section.key,
      label: section.label,
      primary: rows
        .filter((row) => accountMemberKey(row.account ?? {}) === section.key)
        .map((row) => ({
          id: row.movement_id,
          title: row.title,
          subtitle: `${row.account?.name ?? ""} · ${formatDate(row.transaction_date)}`,
          rightLabel: displayCurrency(formatCurrency(row.amount), hideValues),
          active: selected.has(row.movement_id),
          iconName: selected.has(row.movement_id) ? "checkmark-circle" : "ellipse-outline",
          onPress: () => toggleRow(row),
        })),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, memberLabelMap, selected, hideValues, t]);

  const totalsByAccount = useMemo(() => {
    const totals = new Map<string, { name: string; amount: number }>();
    for (const transaction of selected.values()) {
      const existing = totals.get(transaction.accountId);
      if (existing) existing.amount += transaction.amount;
      else totals.set(transaction.accountId, { name: transaction.accountName, amount: transaction.amount });
    }
    return [...totals.entries()];
  }, [selected]);
  const selectedTotal = totalsByAccount.reduce((sum, [, value]) => sum + value.amount, 0);

  if (!enabled) {
    return (
      <Card>
        <EmptyState title={t("replenishments.pickAccountsFirst")} icon="wallet-outline" />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Section title={t("replenishments.selectedSummaryTitle")}>
          <View style={{ gap: spacing(1.5) }}>
            <Text style={[styles.selectedTotal, { color: colors.text }]}>
              {t("replenishments.selectedCount", { count: selected.size })} ·{" "}
              {displayCurrency(formatCurrency(selectedTotal), hideValues)}
            </Text>
            {totalsByAccount.map(([accountId, value]) => (
              <View key={accountId} style={styles.accountTotalRow}>
                <Text style={{ color: colors.textSecondary }}>{value.name}</Text>
                <Text style={{ color: colors.text, fontWeight: typography.fontWeight.bold as any }}>
                  {displayCurrency(formatCurrency(value.amount), hideValues)}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      </Card>

      <Card>
        <Section title={t("replenishments.filtersTitle")}>
          <View style={{ gap: spacing(3) }}>
            <Field
              label={t("transactions.searchLabel")}
              value={search}
              onChangeText={setSearch}
              placeholder={t("transactions.searchPlaceholder")}
            />
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <DateFilterField
                  label={t("transactions.dateFrom")}
                  value={dateFrom}
                  onChange={setDateFrom}
                  placeholder={t("transactions.dateFromPlaceholder")}
                />
              </View>
              <View style={styles.filterField}>
                <DateFilterField
                  label={t("transactions.dateTo")}
                  value={dateTo}
                  onChange={setDateTo}
                  placeholder={t("transactions.dateToPlaceholder")}
                />
              </View>
            </View>
            {dateRangeInvalid ? (
              <Text style={[styles.dateRangeError, { color: colors.destructive }]}>
                {t("replenishments.dateRangeInvalid")}
              </Text>
            ) : null}
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <Field
                  label={t("transactions.minAmountLabel")}
                  value={minAmount}
                  onChangeText={setMinAmount}
                  placeholder={t("transactions.minAmountPlaceholder")}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.filterField}>
                <Field
                  label={t("transactions.maxAmountLabel")}
                  value={maxAmount}
                  onChangeText={setMaxAmount}
                  placeholder={t("transactions.maxAmountPlaceholder")}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <CategoryPicker
              label={t("transactions.categoryFilter")}
              placeholder={t("transactions.allCategories")}
              hint={t("transactions.categoryFilterHint")}
              categories={categories.filter((category: any) => category.type === "expense")}
              selectedId={categoryId === "all" ? null : categoryId}
              clearLabel={t("transactions.allCategories")}
              onChange={(value) => setCategoryId(value ?? "all")}
            />
          </View>
        </Section>
      </Card>

      <Card>
        <Section
          title={t("replenishments.transactionsTitle")}
          subtitle={t("replenishments.transactionsSubtitle", { count: summaryQuery.data?.movement_count ?? 0 })}
          action={
            <View style={{ flexDirection: "row", gap: spacing(2) }}>
              <Button
                label={t("replenishments.selectAllFiltered")}
                variant="secondary"
                onPress={() => void selectAllFiltered()}
                disabled={isSelectingAll || rows.length === 0}
              />
              <Button label={t("replenishments.clearVisible")} variant="secondary" onPress={clearSelection} />
            </View>
          }
        >
          {null}
        </Section>
      </Card>

      <MemberGroupedList
        groups={transactionGroups}
        emptyLabel={t("replenishments.noTransactions")}
        emptyIcon="receipt-outline"
      />

      {transactionsQuery.hasNextPage ? (
        <Button
          label={transactionsQuery.isFetchingNextPage ? t("loading") : t("loadMore")}
          variant="secondary"
          onPress={() => void transactionsQuery.fetchNextPage()}
          disabled={transactionsQuery.isFetchingNextPage}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  selectedTotal: {
    fontSize: typography.fontSize[16],
    fontWeight: typography.fontWeight.extraBold,
  },
  accountTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing(3),
  },
  filterField: {
    flex: 1,
  },
  dateRangeError: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.semibold as any,
  },
});
