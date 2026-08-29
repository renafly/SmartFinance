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

  // A split transaction's own `account_id`/`amount` are only a
  // representative/display value (the largest allocation, set by
  // save_transaction_allocations) -- transaction_allocations is
  // authoritative for balance math (see
  // 20260819120000_transaction_allocations.sql). list_transaction_movements
  // includes a split row here as soon as ANY of its allocations touches one
  // of `replenishAccountIds` (see
  // 20260901000500_transaction_movements_allocation_account_filter.sql),
  // but never adjusts the row's own account_id/amount to match it -- so
  // naively using them (as this file used to) credits the *representative*
  // account with the split's *entire* total, even though part of that
  // total never left that account's own balance (it was funded directly by
  // whichever other account backed the other allocation(s)). Expanding into
  // one entry per matching account allocation keeps every entry's
  // amount/accountId equal to what actually left that specific account for
  // this expense, so it's the only part that's real debt owed back to it.
  function expandRow(row: any): { key: string; transaction: ReplenishableTransaction }[] {
    if (!row.is_split) {
      return [
        {
          key: row.movement_id,
          transaction: {
            id: row.movement_id,
            accountId: row.account_id,
            accountName: row.account?.name ?? "",
            amount: row.amount,
            categoryId: row.category_id,
            title: row.title,
            transactionDate: row.transaction_date,
          },
        },
      ];
    }

    const replenishSet = new Set(replenishAccountIds);
    const allocations: any[] = Array.isArray(row.allocations) ? row.allocations : [];
    return allocations
      .filter(
        (allocation) => allocation.source_type === "account" && replenishSet.has(allocation.account_id),
      )
      .map((allocation) => ({
        key: `${row.movement_id}:${allocation.account_id}`,
        transaction: {
          id: row.movement_id,
          accountId: allocation.account_id,
          accountName: allocation.account_name ?? "",
          amount: allocation.amount,
          categoryId: row.category_id,
          title: row.title,
          transactionDate: row.transaction_date,
        },
      }));
  }

  function isRowSelected(row: any): boolean {
    const expanded = expandRow(row);
    return expanded.length > 0 && expanded.every((entry) => selected.has(entry.key));
  }

  /** What selecting this row actually adds to the replenishment total --
   * shown in the list so it matches what appears in the summary above once
   * toggled on, instead of the split's unrelated full total. */
  function rowReplenishAmount(row: any): number {
    return expandRow(row).reduce((sum, entry) => sum + entry.transaction.amount, 0);
  }

  /** The account(s) this row will actually credit -- usually the same as
   * row.account (the representative account), but not always: a split row
   * shows up here whenever ANY of its allocations touches one of
   * replenishAccountIds, even one that isn't the representative account,
   * so row.account?.name alone can name the wrong account (or the right
   * one but imply it alone, when two of the selected accounts both share
   * this expense). */
  function rowAccountLabel(row: any): string {
    const names = [...new Set(expandRow(row).map((entry) => entry.transaction.accountName))].filter(Boolean);
    return names.length > 0 ? names.join(" + ") : (row.account?.name ?? "");
  }

  function toggleRow(row: any) {
    const expanded = expandRow(row);
    if (expanded.length === 0) return;
    onChangeSelected((current) => {
      const next = new Map(current);
      const allSelected = expanded.every((entry) => next.has(entry.key));
      for (const entry of expanded) {
        if (allSelected) next.delete(entry.key);
        else next.set(entry.key, entry.transaction);
      }
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
        for (const row of byId.values()) {
          for (const entry of expandRow(row)) next.set(entry.key, entry.transaction);
        }
        return next;
      });
    } finally {
      setIsSelectingAll(false);
    }
  }

  function clearSelection() {
    onChangeSelected((current) => {
      const next = new Map(current);
      for (const row of rows) {
        for (const entry of expandRow(row)) next.delete(entry.key);
      }
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
          subtitle: `${rowAccountLabel(row)} · ${formatDate(row.transaction_date)}`,
          rightLabel: displayCurrency(formatCurrency(rowReplenishAmount(row)), hideValues),
          active: isRowSelected(row),
          iconName: isRowSelected(row) ? "checkmark-circle" : "ellipse-outline",
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
