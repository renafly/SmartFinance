import { normalizeTransactionTitle } from "@/features/transactions/category-suggestions";
import type { InsightTransaction } from "./types";

export type DateRange = { from?: string; to?: string };

export type MonthlyFinancialReport = {
  month: string;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number | null;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function included(transactions: InsightTransaction[], range: DateRange) {
  return transactions.filter(
    (item) =>
      !item.transfer_group_id &&
      (!range.from || item.transaction_date.slice(0, 10) >= range.from) &&
      (!range.to || item.transaction_date.slice(0, 10) <= range.to),
  );
}

export function calculateCashFlowReport(
  transactions: InsightTransaction[],
  range: DateRange = {},
) {
  const rows = included(transactions, range);
  const income = rows
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = rows
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  return {
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    net: Math.round((income - expenses) * 100) / 100,
    transactionCount: rows.length,
  };
}

export function calculateCategorySpending(
  transactions: InsightTransaction[],
  range: DateRange = {},
) {
  const rows = included(transactions, range).filter(
    (item) => item.type === "expense",
  );
  const total = rows.reduce((sum, item) => sum + item.amount, 0);
  const groups = new Map<
    string,
    { id: string | null; amount: number; transactionCount: number }
  >();
  rows.forEach((item) => {
    const key = item.category_id ?? "__uncategorized__";
    const group = groups.get(key) ?? {
      id: item.category_id ?? null,
      amount: 0,
      transactionCount: 0,
    };
    group.amount += item.amount;
    group.transactionCount += 1;
    groups.set(key, group);
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      amount: Math.round(group.amount * 100) / 100,
      share: total ? Math.round((group.amount / total) * 10_000) / 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function calculateMerchantSpending(
  transactions: InsightTransaction[],
  range: DateRange = {},
) {
  const groups = new Map<
    string,
    {
      merchant: string;
      amount: number;
      transactionCount: number;
      lastTransactionDate: string;
    }
  >();
  included(transactions, range)
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      const merchant =
        normalizeTransactionTitle(item.title) ||
        item.title.trim().toLocaleLowerCase("pt-PT");
      const group = groups.get(merchant) ?? {
        merchant,
        amount: 0,
        transactionCount: 0,
        lastTransactionDate: "",
      };
      group.amount += item.amount;
      group.transactionCount += 1;
      group.lastTransactionDate =
        group.lastTransactionDate > item.transaction_date
          ? group.lastTransactionDate
          : item.transaction_date;
      groups.set(merchant, group);
    });
  return [...groups.values()]
    .map((item) => ({ ...item, amount: Math.round(item.amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);
}

/** Returns a continuous month series, including empty months, for trend charts. */
export function calculateMonthlyFinancialReport(
  transactions: InsightTransaction[],
  range: Required<DateRange>,
): MonthlyFinancialReport[] {
  const first = new Date(`${range.from.slice(0, 7)}-01T00:00:00`);
  const last = new Date(`${range.to.slice(0, 7)}-01T00:00:00`);
  const groups = new Map<string, { income: number; expenses: number }>();

  included(transactions, range).forEach((item) => {
    const month = item.transaction_date.slice(0, 7);
    const group = groups.get(month) ?? { income: 0, expenses: 0 };
    if (item.type === "income") group.income += item.amount;
    if (item.type === "expense") group.expenses += item.amount;
    groups.set(month, group);
  });

  const result: MonthlyFinancialReport[] = [];
  for (
    const cursor = new Date(first);
    cursor <= last;
    cursor.setMonth(cursor.getMonth() + 1)
  ) {
    const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const group = groups.get(month) ?? { income: 0, expenses: 0 };
    const income = roundMoney(group.income);
    const expenses = roundMoney(group.expenses);
    const net = roundMoney(income - expenses);
    result.push({
      month,
      income,
      expenses,
      net,
      savingsRate:
        income > 0 ? Math.round((net / income) * 10_000) / 100 : null,
    });
  }
  return result;
}
