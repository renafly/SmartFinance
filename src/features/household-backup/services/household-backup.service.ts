import * as Crypto from "expo-crypto";
import { z } from "zod";

import { householdsService } from "@/features/households/services/households.service";
import { supabase } from "@/shared/lib/supabase/client";
import type { Database, Json } from "@/types/database.types";

type TableName = keyof Database["public"]["Tables"];
type TableRow<T extends TableName> = Database["public"]["Tables"][T]["Row"];
type InsertRow<T extends TableName> = Database["public"]["Tables"][T]["Insert"];

type Account = TableRow<"accounts">;
type Attachment = TableRow<"attachments">;
type BudgetConfig = TableRow<"budget_configs">;
type BudgetRule = TableRow<"budget_rules">;
type BudgetRuleAllocation = TableRow<"budget_rule_allocations">;
type Category = TableRow<"categories">;
type Household = TableRow<"households">;
type HouseholdMember = TableRow<"household_members">;
type MonthlyBudgetRun = TableRow<"monthly_budget_runs">;
type MonthlyIncomeInput = TableRow<"monthly_income_inputs">;
type RecurringTransaction = TableRow<"recurring_transactions">;
type RecurringRunExecution = TableRow<"recurring_run_executions">;
type SavingPot = TableRow<"saving_pots">;
type SavingPotAccount = TableRow<"saving_pot_accounts">;
type Transaction = TableRow<"transactions">;

type MemberWithProfile = HouseholdMember & {
  profile?: {
    email?: string | null;
    full_name?: string | null;
  } | null;
};

type BackupKey =
  | "account"
  | "budget_config"
  | "budget_rule"
  | "budget_run"
  | "category"
  | "member"
  | "pot"
  | "recurring"
  | "recurring_execution"
  | "transaction"
  | "transfer_group";

type CleanHousehold = {
  name: string;
  incomeMode: Database["public"]["Enums"]["household_income_mode"];
  remainingCashStrategy: Database["public"]["Enums"]["remaining_cash_strategy"];
  fixedRemainingCashAmount: number;
  excessCashDistributionMethod: Database["public"]["Enums"]["excess_cash_distribution_method"];
};

type CleanMember = {
  key: string;
  email: string | null;
  fullName: string | null;
  role: Database["public"]["Enums"]["household_role"];
  status: Database["public"]["Enums"]["household_member_status"];
  isOwner: boolean;
  joinedAt: string | null;
};

type CleanAccount = {
  key: string;
  ownerMemberKey: string | null;
  name: string;
  type: Database["public"]["Enums"]["account_type"];
  currency: Database["public"]["Enums"]["currency_code"];
  initialBalance: number;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type CleanCategory = {
  key: string;
  parentKey: string | null;
  name: string;
  type: Database["public"]["Enums"]["category_type"];
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  isDiscretionary: boolean;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type CleanSavingPot = {
  key: string;
  createdByMemberKey: string | null;
  name: string;
  targetAmount: number | null;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
};

type CleanSavingPotAccount = {
  potKey: string;
  accountKey: string;
  createdAt: string;
};

type CleanBudgetConfig = {
  key: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CleanBudgetRuleAllocation = {
  destinationAccountKey: string;
  amount: number;
  /** Optional category tag for this allocation's generated transaction —
   * null/absent on older backups, which is exactly the "no category"
   * behavior that already existed before categories could be assigned. */
  categoryKey?: string | null;
  sortOrder: number;
};

type CleanBudgetRule = {
  key: string;
  budgetConfigKey: string;
  sourceAccountKey: string;
  ownerMemberKey: string | null;
  name: string;
  section: Database["public"]["Enums"]["monthly_budget_section"];
  /** The rule's total amount, distributed across `allocations`. */
  amount: number;
  allocationMode: Database["public"]["Enums"]["budget_rule_allocation_mode"];
  allocations: CleanBudgetRuleAllocation[];
  frequency: Database["public"]["Enums"]["recurring_frequency"];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Legacy v1 field: rules exported before multi-account allocations existed. Accepted during import (converted into a single allocation) but never written by new exports. */
  destinationAccountKey?: string;
  /** Legacy v1 field accepted during import but omitted from new exports. */
  destinationPotKey?: string | null;
  activeMonths: number[] | null;
  activeFromMonth: number | null;
  activeToMonth: number | null;
};

type CleanMonthlyBudgetRun = {
  key: string;
  budgetConfigKey: string;
  month: string;
  status: Database["public"]["Enums"]["monthly_budget_run_status"];
  incomeModeSnapshot: Database["public"]["Enums"]["household_income_mode"];
  remainingCashStrategySnapshot: Database["public"]["Enums"]["remaining_cash_strategy"];
  previewSnapshot: Json;
  createdAt: string;
  updatedAt: string;
};

type CleanMonthlyIncomeInput = {
  monthlyBudgetRunKey: string;
  memberKey: string | null;
  cashAccountKey: string;
  amount: number;
  availableMonth?: string;
  createdAt: string;
  updatedAt: string;
};

type CleanRecurringTransaction = {
  key: string;
  accountKey: string;
  categoryKey: string | null;
  potKey: string | null;
  ruleKind: Database["public"]["Enums"]["recurring_rule_kind"];
  expenseKind?: Database["public"]["Enums"]["recurring_expense_kind"] | null;
  destinationAccountKey: string | null;
  /** Legacy v1 field accepted during import but omitted from new exports. */
  destinationPotKey?: string | null;
  createdByMemberKey: string | null;
  title: string;
  notes: string | null;
  amount: number;
  type: Database["public"]["Enums"]["transaction_type"];
  frequency: Database["public"]["Enums"]["recurring_frequency"];
  excludedMonths: number[] | null;
  nextRun: string;
  lastRun: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CleanRecurringRunExecution = {
  key: string;
  recurringTransactionKey: string;
  scheduledFor: string;
  status: Database["public"]["Enums"]["recurring_execution_status"];
  skipReason: string | null;
  errorMessage: string | null;
  attemptedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CleanTransaction = {
  key: string;
  accountKey: string;
  categoryKey: string | null;
  potKey: string | null;
  transferGroupKey: string | null;
  monthlyBudgetRunKey: string | null;
  generatedByRuleKey: string | null;
  recurringExecutionKey: string | null;
  createdByMemberKey: string | null;
  budgetSection: Database["public"]["Enums"]["monthly_budget_section"] | null;
  title: string;
  merchantName: string | null;
  notes: string | null;
  amount: number;
  type: Database["public"]["Enums"]["transaction_type"];
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
};

type CleanAttachment = {
  transactionKey: string | null;
  uploadedByMemberKey: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

type CleanMonthlyBudget = {
  configs: CleanBudgetConfig[];
  rules: CleanBudgetRule[];
  runs: CleanMonthlyBudgetRun[];
  incomeInputs: CleanMonthlyIncomeInput[];
};

export type HouseholdBackupFile = {
  schemaVersion: 1;
  exportedAt: string;
  sourceApp: "Kintally";
  household: CleanHousehold;
  members: CleanMember[];
  accounts: CleanAccount[];
  categories: CleanCategory[];
  savingPots: CleanSavingPot[];
  savingPotAccounts: CleanSavingPotAccount[];
  transactions: CleanTransaction[];
  recurringTransactions: CleanRecurringTransaction[];
  recurringRunExecutions: CleanRecurringRunExecution[];
  monthlyBudget: CleanMonthlyBudget;
  attachments: CleanAttachment[];
};

export type HouseholdBackupImportSummary = {
  householdId: string;
  householdName: string;
  accounts: number;
  categories: number;
  transactions: number;
  savingPots: number;
  savingPotAccounts: number;
  recurringTransactions: number;
  recurringRunExecutions: number;
  budgetConfigs: number;
  budgetRules: number;
  budgetRuns: number;
  incomeInputs: number;
  skippedAttachments: number;
};

const rowSchema = z.record(z.string(), z.unknown());

const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  // Accept backups exported before the app was renamed from SmartFinance to Kintally.
  sourceApp: z.union([z.literal("Kintally"), z.literal("SmartFinance")]),
  household: rowSchema,
  members: z.array(rowSchema),
  accounts: z.array(rowSchema),
  categories: z.array(rowSchema),
  savingPots: z.array(rowSchema),
  savingPotAccounts: z.array(rowSchema),
  transactions: z.array(rowSchema),
  recurringTransactions: z.array(rowSchema),
  recurringRunExecutions: z.array(rowSchema).default([]),
  monthlyBudget: z.object({
    configs: z.array(rowSchema),
    rules: z.array(rowSchema),
    runs: z.array(rowSchema),
    incomeInputs: z.array(rowSchema),
  }),
  attachments: z.array(rowSchema),
});

function newId() {
  return Crypto.randomUUID();
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

function safeNamePart(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "household"
  );
}

function makeKey(prefix: BackupKey, index: number) {
  return `${prefix}_${index + 1}`;
}

function buildKeyMap<T extends { id: string }>(rows: T[], prefix: BackupKey) {
  return new Map(rows.map((row, index) => [row.id, makeKey(prefix, index)]));
}

function buildTransferGroupKeyMap(rows: Transaction[]) {
  const ids = [
    ...new Set(
      rows
        .map((row) => row.transfer_group_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  return new Map(
    ids.map((id, index) => [id, makeKey("transfer_group", index)]),
  );
}

function keyFor(map: Map<string, string>, id: string | null | undefined) {
  if (!id) return null;
  return map.get(id) ?? null;
}

function newIdMap(rows: Array<{ key: string }>) {
  return new Map(rows.map((row) => [row.key, newId()]));
}

function idFor(map: Map<string, string>, key: string | null | undefined) {
  if (!key) return null;
  return map.get(key) ?? null;
}

function requireIdFor(map: Map<string, string>, key: string, label: string) {
  const id = map.get(key);
  if (!id) throw new Error(`Backup import could not map ${label}.`);
  return id;
}

function asBackupFile(input: unknown): HouseholdBackupFile {
  const parsed = backupSchema.parse(input);
  return parsed as unknown as HouseholdBackupFile;
}

function scrubJsonIds(value: Json, idToKey: Map<string, string>): Json {
  if (typeof value === "string") return idToKey.get(value) ?? value;
  if (Array.isArray(value))
    return value.map((item) => scrubJsonIds(item, idToKey));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        item === undefined ? item : scrubJsonIds(item, idToKey),
      ]),
    ) as Json;
  }
  return value;
}

async function throwIfError<T>(
  promise: PromiseLike<{ data: T | null; error: unknown }>,
) {
  const result = await promise;
  if (result.error) throw result.error;
  return result.data;
}

async function fetchPaged<T>(
  buildQuery: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

async function insertMany<T extends TableName>(table: T, rows: InsertRow<T>[]) {
  if (rows.length === 0) return [];

  const inserted: TableRow<T>[] = [];
  const batchSize = 500;

  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const data = await throwIfError(
      supabase
        .from(table)
        .insert(batch as any)
        .select("*"),
    );
    inserted.push(...((data ?? []) as TableRow<T>[]));
  }

  return inserted;
}

async function getCurrentProfile(userId: string) {
  const data = await throwIfError(
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", userId)
      .maybeSingle() as any,
  );

  return data as {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
}

function getMemberFallbackMap(
  backup: HouseholdBackupFile,
  currentUserId: string,
  currentEmail: string | null,
) {
  const map = new Map<string, string>();

  for (const member of backup.members) {
    const memberEmail = normalizeEmail(member.email);
    if (member.isOwner || (currentEmail && memberEmail === currentEmail)) {
      map.set(member.key, currentUserId);
    }
  }

  return map;
}

function mapOwner(
  memberMap: Map<string, string>,
  memberKey: string | null | undefined,
) {
  if (!memberKey) return null;
  return memberMap.get(memberKey) ?? null;
}

function mapCreator(
  memberMap: Map<string, string>,
  memberKey: string | null | undefined,
  currentUserId: string,
) {
  if (!memberKey) return currentUserId;
  return memberMap.get(memberKey) ?? currentUserId;
}

function buildCleanBackup(input: {
  household: Household;
  members: MemberWithProfile[];
  accounts: Account[];
  categories: Category[];
  savingPots: SavingPot[];
  savingPotAccounts: SavingPotAccount[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  recurringRunExecutions: RecurringRunExecution[];
  budgetConfigs: BudgetConfig[];
  budgetRules: BudgetRule[];
  budgetRuleAllocations: BudgetRuleAllocation[];
  budgetRuns: MonthlyBudgetRun[];
  incomeInputs: MonthlyIncomeInput[];
  attachments: Attachment[];
}): HouseholdBackupFile {
  const memberKeyMap = buildKeyMap(
    input.members.map((member) => ({ id: member.user_id })),
    "member",
  );
  const accountKeyMap = buildKeyMap(input.accounts, "account");
  const categoryKeyMap = buildKeyMap(input.categories, "category");
  const potKeyMap = buildKeyMap(input.savingPots, "pot");
  const configKeyMap = buildKeyMap(input.budgetConfigs, "budget_config");
  const ruleKeyMap = buildKeyMap(input.budgetRules, "budget_rule");
  const runKeyMap = buildKeyMap(input.budgetRuns, "budget_run");
  const recurringKeyMap = buildKeyMap(input.recurringTransactions, "recurring");
  const recurringExecutionKeyMap = buildKeyMap(
    input.recurringRunExecutions,
    "recurring_execution",
  );
  const transactionKeyMap = buildKeyMap(input.transactions, "transaction");
  const transferGroupKeyMap = buildTransferGroupKeyMap(input.transactions);

  const idToKey = new Map<string, string>([
    ...memberKeyMap,
    ...accountKeyMap,
    ...categoryKeyMap,
    ...potKeyMap,
    ...configKeyMap,
    ...ruleKeyMap,
    ...runKeyMap,
    ...recurringKeyMap,
    ...recurringExecutionKeyMap,
    ...transactionKeyMap,
    ...transferGroupKeyMap,
  ]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    sourceApp: "Kintally",
    household: {
      name: input.household.name,
      incomeMode: input.household.income_mode,
      remainingCashStrategy: input.household.remaining_cash_strategy,
      fixedRemainingCashAmount: input.household.fixed_remaining_cash_amount,
      excessCashDistributionMethod:
        input.household.excess_cash_distribution_method,
    },
    members: input.members.map((member) => ({
      key: requireIdFor(memberKeyMap, member.user_id, "member key"),
      email: normalizeEmail(member.profile?.email),
      fullName: member.profile?.full_name ?? null,
      role: member.role,
      status: member.status,
      isOwner: member.user_id === input.household.owner_id,
      joinedAt: member.joined_at,
    })),
    accounts: input.accounts.map((account) => ({
      key: requireIdFor(accountKeyMap, account.id, "account key"),
      ownerMemberKey: keyFor(memberKeyMap, account.owner_profile_id),
      name: account.name,
      type: account.type,
      currency: account.currency,
      initialBalance: account.initial_balance,
      icon: account.icon,
      color: account.color,
      isArchived: account.is_archived,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    })),
    categories: input.categories.map((category) => ({
      key: requireIdFor(categoryKeyMap, category.id, "category key"),
      parentKey: keyFor(categoryKeyMap, category.parent_id),
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      isDefault: category.is_default,
      isDiscretionary: category.is_discretionary,
      sortOrder: category.sort_order,
      isArchived: category.is_archived,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    })),
    savingPots: input.savingPots.map((pot) => ({
      key: requireIdFor(potKeyMap, pot.id, "pot key"),
      createdByMemberKey: keyFor(memberKeyMap, pot.created_by),
      name: pot.name,
      targetAmount: pot.target_amount,
      color: pot.color,
      icon: pot.icon,
      createdAt: pot.created_at,
      updatedAt: pot.updated_at,
    })),
    savingPotAccounts: input.savingPotAccounts
      .map((row) => {
        const potKey = keyFor(potKeyMap, row.pot_id);
        const accountKey = keyFor(accountKeyMap, row.account_id);
        if (!potKey || !accountKey) return null;
        return { potKey, accountKey, createdAt: row.created_at };
      })
      .filter(isPresent),
    transactions: input.transactions.map((transaction) => ({
      key: requireIdFor(transactionKeyMap, transaction.id, "transaction key"),
      accountKey: requireIdFor(
        accountKeyMap,
        transaction.account_id,
        "transaction account key",
      ),
      categoryKey: keyFor(categoryKeyMap, transaction.category_id),
      potKey: keyFor(potKeyMap, transaction.pot_id),
      transferGroupKey: keyFor(
        transferGroupKeyMap,
        transaction.transfer_group_id,
      ),
      monthlyBudgetRunKey: keyFor(runKeyMap, transaction.monthly_budget_run_id),
      generatedByRuleKey: keyFor(ruleKeyMap, transaction.generated_by_rule_id),
      recurringExecutionKey: keyFor(
        recurringExecutionKeyMap,
        transaction.recurring_execution_id,
      ),
      createdByMemberKey: keyFor(memberKeyMap, transaction.created_by),
      budgetSection: transaction.budget_section,
      title: transaction.title,
      merchantName: transaction.merchant_name,
      notes: transaction.notes,
      amount: transaction.amount,
      type: transaction.type,
      transactionDate: transaction.transaction_date,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
    })),
    recurringTransactions: input.recurringTransactions.map((row) => ({
      key: requireIdFor(recurringKeyMap, row.id, "recurring key"),
      accountKey: requireIdFor(
        accountKeyMap,
        row.account_id,
        "recurring account key",
      ),
      categoryKey: keyFor(categoryKeyMap, row.category_id),
      potKey: keyFor(potKeyMap, row.pot_id),
      ruleKind: row.rule_kind,
      expenseKind: row.expense_kind,
      destinationAccountKey: keyFor(accountKeyMap, row.destination_account_id),
      createdByMemberKey: keyFor(memberKeyMap, row.created_by),
      title: row.title,
      notes: row.notes,
      amount: row.amount,
      type: row.type,
      frequency: row.frequency,
      excludedMonths: row.excluded_months,
      nextRun: row.next_run,
      lastRun: row.last_run,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    recurringRunExecutions: input.recurringRunExecutions
      .map((execution) => {
        const recurringTransactionKey = keyFor(
          recurringKeyMap,
          execution.recurring_transaction_id,
        );
        if (!recurringTransactionKey) return null;

        return {
          key: requireIdFor(
            recurringExecutionKeyMap,
            execution.id,
            "recurring execution key",
          ),
          recurringTransactionKey,
          scheduledFor: execution.scheduled_for,
          status: execution.status,
          skipReason: execution.skip_reason,
          errorMessage: execution.error_message,
          attemptedAt: execution.attempted_at,
          completedAt: execution.completed_at,
          createdAt: execution.created_at,
          updatedAt: execution.updated_at,
        };
      })
      .filter(isPresent),
    monthlyBudget: {
      configs: input.budgetConfigs.map((config) => ({
        key: requireIdFor(configKeyMap, config.id, "budget config key"),
        name: config.name,
        isActive: config.is_active,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      })),
      rules: input.budgetRules
        .map((rule) => {
          const budgetConfigKey = keyFor(configKeyMap, rule.budget_config_id);
          const sourceAccountKey = keyFor(
            accountKeyMap,
            rule.source_account_id,
          );
          if (!budgetConfigKey || !sourceAccountKey) return null;

          const allocations = input.budgetRuleAllocations
            .filter((allocation) => allocation.rule_id === rule.id)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((allocation) => {
              const destinationAccountKey = keyFor(accountKeyMap, allocation.destination_account_id);
              if (!destinationAccountKey) return null;

              return {
                destinationAccountKey,
                amount: allocation.amount,
                categoryKey: keyFor(categoryKeyMap, allocation.category_id),
                sortOrder: allocation.sort_order,
              };
            })
            .filter(isPresent);
          if (allocations.length === 0) return null;

          return {
            key: requireIdFor(ruleKeyMap, rule.id, "budget rule key"),
            budgetConfigKey,
            sourceAccountKey,
            ownerMemberKey: keyFor(memberKeyMap, rule.owner_member_id),
            name: rule.name,
            section: rule.section,
            amount: rule.amount,
            allocationMode: rule.allocation_mode,
            allocations,
            frequency: rule.frequency,
            priority: rule.priority,
            isActive: rule.is_active,
            activeMonths: rule.active_months,
            activeFromMonth: rule.active_from_month,
            activeToMonth: rule.active_to_month,
            createdAt: rule.created_at,
            updatedAt: rule.updated_at,
          };
        })
        .filter(isPresent),
      runs: input.budgetRuns
        .map((run) => {
          const budgetConfigKey = keyFor(configKeyMap, run.budget_config_id);
          if (!budgetConfigKey) return null;

          return {
            key: requireIdFor(runKeyMap, run.id, "budget run key"),
            budgetConfigKey,
            month: run.month,
            status: run.status,
            incomeModeSnapshot: run.income_mode_snapshot,
            remainingCashStrategySnapshot: run.remaining_cash_strategy_snapshot,
            previewSnapshot: scrubJsonIds(
              run.preview_snapshot as Json,
              idToKey,
            ),
            createdAt: run.created_at,
            updatedAt: run.updated_at,
          };
        })
        .filter(isPresent),
      incomeInputs: input.incomeInputs
        .map((row) => {
          const monthlyBudgetRunKey = keyFor(
            runKeyMap,
            row.monthly_budget_run_id,
          );
          const cashAccountKey = keyFor(accountKeyMap, row.cash_account_id);
          if (!monthlyBudgetRunKey || !cashAccountKey) return null;

          return {
            monthlyBudgetRunKey,
            memberKey: keyFor(memberKeyMap, row.member_id),
            cashAccountKey,
            amount: row.amount,
            availableMonth: row.available_month,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        })
        .filter(isPresent),
    },
    attachments: input.attachments.map((attachment) => ({
      transactionKey: keyFor(transactionKeyMap, attachment.transaction_id),
      uploadedByMemberKey: keyFor(memberKeyMap, attachment.uploaded_by),
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      fileSize: attachment.file_size,
      createdAt: attachment.created_at,
    })),
  };
}

function buildCategoryInserts(
  backup: HouseholdBackupFile,
  householdId: string,
  categoryMap: Map<string, string>,
) {
  return backup.categories.map((category) => ({
    id: requireIdFor(categoryMap, category.key, "category"),
    household_id: householdId,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    parent_id: idFor(categoryMap, category.parentKey),
    is_default: category.isDefault,
    is_discretionary: category.isDiscretionary ?? false,
    sort_order: category.sortOrder,
    is_archived: category.isArchived,
    created_at: category.createdAt,
    updated_at: category.updatedAt,
  }));
}

function buildAccountInserts(
  backup: HouseholdBackupFile,
  householdId: string,
  accountMap: Map<string, string>,
  memberMap: Map<string, string>,
) {
  return backup.accounts.map((account) => ({
    id: requireIdFor(accountMap, account.key, "account"),
    household_id: householdId,
    owner_profile_id: mapOwner(memberMap, account.ownerMemberKey),
    name: account.name,
    type: account.type,
    currency: account.currency,
    initial_balance: account.initialBalance,
    icon: account.icon,
    color: account.color,
    is_archived: account.isArchived,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
  }));
}

function buildSavingPotInserts(
  backup: HouseholdBackupFile,
  householdId: string,
  currentUserId: string,
  potMap: Map<string, string>,
  memberMap: Map<string, string>,
) {
  return backup.savingPots.map((pot) => ({
    id: requireIdFor(potMap, pot.key, "saving pot"),
    household_id: householdId,
    name: pot.name,
    target_amount: pot.targetAmount,
    color: pot.color,
    icon: pot.icon,
    created_by: mapCreator(memberMap, pot.createdByMemberKey, currentUserId),
    created_at: pot.createdAt,
    updated_at: pot.updatedAt,
  }));
}

function buildSavingPotAccountInserts(
  backup: HouseholdBackupFile,
  potMap: Map<string, string>,
  accountMap: Map<string, string>,
) {
  return backup.savingPotAccounts
    .map((row) => {
      const potId = idFor(potMap, row.potKey);
      const accountId = idFor(accountMap, row.accountKey);
      if (!potId || !accountId) return null;
      return {
        pot_id: potId,
        account_id: accountId,
        created_at: row.createdAt,
      };
    })
    .filter(isPresent);
}

function buildBudgetConfigInserts(
  backup: HouseholdBackupFile,
  householdId: string,
  configMap: Map<string, string>,
) {
  let activeSeen = false;

  return backup.monthlyBudget.configs.map((config) => {
    const isActive = config.isActive && !activeSeen;
    if (isActive) activeSeen = true;

    return {
      id: requireIdFor(configMap, config.key, "budget config"),
      household_id: householdId,
      name: config.name,
      is_active: isActive,
      created_at: config.createdAt,
      updated_at: config.updatedAt,
    };
  });
}

/**
 * Every rule ships with an `allocations` array. Backups exported before
 * multi-account allocations existed (schema v1's original shape) instead
 * carried a single `destinationAccountKey`/`amount` pair directly on the
 * rule — normalize those into an equivalent single-allocation array so
 * older backup files still import cleanly.
 */
function normalizeRuleAllocations(rule: CleanBudgetRule): CleanBudgetRuleAllocation[] {
  if (rule.allocations && rule.allocations.length > 0) return rule.allocations;
  if (rule.destinationAccountKey) {
    return [{ destinationAccountKey: rule.destinationAccountKey, amount: rule.amount, sortOrder: 0 }];
  }
  return [];
}

function buildBudgetRuleInserts(
  backup: HouseholdBackupFile,
  ruleMap: Map<string, string>,
  configMap: Map<string, string>,
  accountMap: Map<string, string>,
  memberMap: Map<string, string>,
) {
  return backup.monthlyBudget.rules
    .map((rule) => {
      const budgetConfigId = idFor(configMap, rule.budgetConfigKey);
      const sourceAccountId = idFor(accountMap, rule.sourceAccountKey);
      if (!budgetConfigId || !sourceAccountId) return null;
      if (normalizeRuleAllocations(rule).length === 0) return null;

      return {
        id: requireIdFor(ruleMap, rule.key, "budget rule"),
        budget_config_id: budgetConfigId,
        name: rule.name,
        section: rule.section,
        source_account_id: sourceAccountId,
        owner_member_id: mapOwner(memberMap, rule.ownerMemberKey),
        amount: rule.amount,
        allocation_mode: rule.allocationMode ?? "equal_split",
        frequency: rule.frequency,
        priority: rule.priority,
        is_active: rule.isActive,
        active_months: rule.activeMonths ?? null,
        active_from_month: rule.activeFromMonth ?? null,
        active_to_month: rule.activeToMonth ?? null,
        created_at: rule.createdAt,
        updated_at: rule.updatedAt,
      };
    })
    .filter(isPresent);
}

function buildBudgetRuleAllocationInserts(
  backup: HouseholdBackupFile,
  ruleMap: Map<string, string>,
  accountMap: Map<string, string>,
  categoryMap: Map<string, string>,
) {
  return backup.monthlyBudget.rules.flatMap((rule) => {
    const ruleId = idFor(ruleMap, rule.key);
    if (!ruleId) return [];

    return normalizeRuleAllocations(rule)
      .map((allocation, index) => {
        const destinationAccountId = idFor(accountMap, allocation.destinationAccountKey);
        if (!destinationAccountId) return null;

        return {
          rule_id: ruleId,
          destination_account_id: destinationAccountId,
          amount: allocation.amount,
          // Older backups (pre-category-support) never had this field, so
          // it's absent rather than null -- idFor(..., undefined) already
          // resolves to null, same as an explicit null would.
          category_id: idFor(categoryMap, allocation.categoryKey),
          sort_order: allocation.sortOrder ?? index,
        };
      })
      .filter(isPresent);
  });
}

function buildBudgetRunInserts(
  backup: HouseholdBackupFile,
  householdId: string,
  configMap: Map<string, string>,
  runMap: Map<string, string>,
) {
  return backup.monthlyBudget.runs
    .map((run) => {
      const budgetConfigId = idFor(configMap, run.budgetConfigKey);
      if (!budgetConfigId) return null;

      return {
        id: requireIdFor(runMap, run.key, "monthly budget run"),
        household_id: householdId,
        budget_config_id: budgetConfigId,
        month: run.month,
        status: run.status,
        income_mode_snapshot: run.incomeModeSnapshot,
        remaining_cash_strategy_snapshot: run.remainingCashStrategySnapshot,
        preview_snapshot: run.previewSnapshot,
        created_at: run.createdAt,
        updated_at: run.updatedAt,
      };
    })
    .filter(isPresent);
}

function buildIncomeInputInserts(
  backup: HouseholdBackupFile,
  currentUserId: string,
  runMap: Map<string, string>,
  accountMap: Map<string, string>,
  memberMap: Map<string, string>,
) {
  const byRunAndMember = new Map<string, InsertRow<"monthly_income_inputs">>();

  for (const input of backup.monthlyBudget.incomeInputs) {
    const runId = idFor(runMap, input.monthlyBudgetRunKey);
    const cashAccountId = idFor(accountMap, input.cashAccountKey);
    if (!runId || !cashAccountId) continue;

    const memberId = mapCreator(memberMap, input.memberKey, currentUserId);
    const runMonth = backup.monthlyBudget.runs.find(
      (run) => run.key === input.monthlyBudgetRunKey,
    )?.month;
    const key = `${runId}:${memberId}`;
    const existing = byRunAndMember.get(key);

    if (existing) {
      existing.amount =
        Number(existing.amount ?? 0) + Number(input.amount ?? 0);
      continue;
    }

    byRunAndMember.set(key, {
      id: newId(),
      monthly_budget_run_id: runId,
      member_id: memberId,
      cash_account_id: cashAccountId,
      amount: input.amount,
      available_month:
        input.availableMonth ??
        runMonth ??
        new Date().toISOString().slice(0, 7) + "-01",
      created_at: input.createdAt,
      updated_at: input.updatedAt,
    });
  }

  return [...byRunAndMember.values()];
}

function buildRecurringTransactionInserts(
  backup: HouseholdBackupFile,
  householdId: string,
  currentUserId: string,
  recurringMap: Map<string, string>,
  accountMap: Map<string, string>,
  categoryMap: Map<string, string>,
  potMap: Map<string, string>,
  memberMap: Map<string, string>,
) {
  return backup.recurringTransactions
    .map((row) => {
      const accountId = idFor(accountMap, row.accountKey);
      if (!accountId) return null;

      return {
        id: requireIdFor(recurringMap, row.key, "recurring transaction"),
        household_id: householdId,
        account_id: accountId,
        category_id: idFor(categoryMap, row.categoryKey),
        pot_id: idFor(potMap, row.potKey),
        rule_kind: row.ruleKind,
        expense_kind:
          row.ruleKind === "transaction" && row.type === "expense"
            ? (row.expenseKind ?? "other")
            : null,
        destination_account_id: idFor(accountMap, row.destinationAccountKey),
        destination_pot_id: idFor(potMap, row.destinationPotKey),
        title: row.title,
        notes: row.notes,
        amount: row.amount,
        type: row.type,
        frequency: row.frequency,
        excluded_months: row.excludedMonths,
        next_run: row.nextRun,
        last_run: row.lastRun,
        is_active: row.isActive,
        created_by: mapCreator(
          memberMap,
          row.createdByMemberKey,
          currentUserId,
        ),
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      };
    })
    .filter(isPresent);
}

function buildRecurringRunExecutionInserts(
  backup: HouseholdBackupFile,
  householdId: string,
  recurringMap: Map<string, string>,
  executionMap: Map<string, string>,
) {
  return backup.recurringRunExecutions
    .map((execution) => {
      const recurringTransactionId = idFor(
        recurringMap,
        execution.recurringTransactionKey,
      );
      if (!recurringTransactionId) return null;

      return {
        id: requireIdFor(executionMap, execution.key, "recurring execution"),
        household_id: householdId,
        recurring_transaction_id: recurringTransactionId,
        scheduled_for: execution.scheduledFor,
        status: execution.status,
        skip_reason: execution.skipReason,
        error_message: execution.errorMessage,
        attempted_at: execution.attemptedAt,
        completed_at: execution.completedAt,
        created_at: execution.createdAt,
        updated_at: execution.updatedAt,
      };
    })
    .filter(isPresent);
}

function buildTransactionInserts(
  backup: HouseholdBackupFile,
  householdId: string,
  currentUserId: string,
  transactionMap: Map<string, string>,
  accountMap: Map<string, string>,
  categoryMap: Map<string, string>,
  potMap: Map<string, string>,
  runMap: Map<string, string>,
  ruleMap: Map<string, string>,
  executionMap: Map<string, string>,
  transferGroupMap: Map<string, string>,
  memberMap: Map<string, string>,
) {
  return backup.transactions
    .map((transaction) => {
      const accountId = idFor(accountMap, transaction.accountKey);
      if (!accountId) return null;

      return {
        id: requireIdFor(transactionMap, transaction.key, "transaction"),
        household_id: householdId,
        account_id: accountId,
        category_id: idFor(categoryMap, transaction.categoryKey),
        pot_id: idFor(potMap, transaction.potKey),
        transfer_group_id: idFor(
          transferGroupMap,
          transaction.transferGroupKey,
        ),
        monthly_budget_run_id: idFor(runMap, transaction.monthlyBudgetRunKey),
        generated_by_rule_id: idFor(ruleMap, transaction.generatedByRuleKey),
        recurring_execution_id: idFor(
          executionMap,
          transaction.recurringExecutionKey,
        ),
        budget_section: transaction.budgetSection,
        title: transaction.title,
        merchant_name: transaction.merchantName ?? null,
        notes: transaction.notes,
        amount: transaction.amount,
        type: transaction.type,
        transaction_date: transaction.transactionDate,
        created_by: mapCreator(
          memberMap,
          transaction.createdByMemberKey,
          currentUserId,
        ),
        created_at: transaction.createdAt,
        updated_at: transaction.updatedAt,
      };
    })
    .filter(isPresent);
}

export class HouseholdBackupService {
  async exportHouseholdBackup(
    householdId: string,
  ): Promise<HouseholdBackupFile> {
    const household = await throwIfError(
      supabase.from("households").select("*").eq("id", householdId).single(),
    );

    if (!household) throw new Error("Household not found.");

    const [
      members,
      accounts,
      categories,
      savingPots,
      transactions,
      recurringTransactions,
      budgetConfigs,
      budgetRuns,
    ] = await Promise.all([
      fetchPaged<MemberWithProfile>(
        (from, to) =>
          supabase
            .from("household_members")
            .select(
              "*, profile:profiles!household_members_user_id_fkey(email, full_name)",
            )
            .eq("household_id", householdId)
            .order("joined_at", { ascending: true })
            .range(from, to) as any,
      ),
      fetchPaged<Account>(
        (from, to) =>
          supabase
            .from("accounts")
            .select("*")
            .eq("household_id", householdId)
            .order("created_at", { ascending: true })
            .range(from, to) as any,
      ),
      fetchPaged<Category>(
        (from, to) =>
          supabase
            .from("categories")
            .select("*")
            .eq("household_id", householdId)
            .order("created_at", { ascending: true })
            .range(from, to) as any,
      ),
      fetchPaged<SavingPot>(
        (from, to) =>
          supabase
            .from("saving_pots")
            .select("*")
            .eq("household_id", householdId)
            .order("created_at", { ascending: true })
            .range(from, to) as any,
      ),
      fetchPaged<Transaction>(
        (from, to) =>
          supabase
            .from("transactions")
            .select("*")
            .eq("household_id", householdId)
            .order("created_at", { ascending: true })
            .range(from, to) as any,
      ),
      fetchPaged<RecurringTransaction>(
        (from, to) =>
          supabase
            .from("recurring_transactions")
            .select("*")
            .eq("household_id", householdId)
            .order("created_at", { ascending: true })
            .range(from, to) as any,
      ),
      fetchPaged<BudgetConfig>(
        (from, to) =>
          supabase
            .from("budget_configs")
            .select("*")
            .eq("household_id", householdId)
            .order("created_at", { ascending: true })
            .range(from, to) as any,
      ),
      fetchPaged<MonthlyBudgetRun>(
        (from, to) =>
          supabase
            .from("monthly_budget_runs")
            .select("*")
            .eq("household_id", householdId)
            .order("created_at", { ascending: true })
            .range(from, to) as any,
      ),
    ]);

    const potIds = savingPots.map((pot) => pot.id);
    const transactionIds = transactions.map((transaction) => transaction.id);
    const budgetConfigIds = budgetConfigs.map((config) => config.id);
    const budgetRunIds = budgetRuns.map((run) => run.id);
    const recurringTransactionIds = recurringTransactions.map(
      (transaction) => transaction.id,
    );

    const [
      savingPotAccounts,
      attachments,
      budgetRules,
      incomeInputs,
      recurringRunExecutions,
    ] = await Promise.all([
      potIds.length
        ? fetchPaged<SavingPotAccount>(
            (from, to) =>
              supabase
                .from("saving_pot_accounts")
                .select("*")
                .in("pot_id", potIds)
                .order("created_at", { ascending: true })
                .range(from, to) as any,
          )
        : Promise.resolve([]),
      transactionIds.length
        ? fetchPaged<Attachment>(
            (from, to) =>
              supabase
                .from("attachments")
                .select("*")
                .in("transaction_id", transactionIds)
                .order("created_at", { ascending: true })
                .range(from, to) as any,
          )
        : Promise.resolve([]),
      budgetConfigIds.length
        ? fetchPaged<BudgetRule>(
            (from, to) =>
              supabase
                .from("budget_rules")
                .select("*")
                .in("budget_config_id", budgetConfigIds)
                .is("deleted_at", null)
                .order("priority", { ascending: true })
                .range(from, to) as any,
          )
        : Promise.resolve([]),
      budgetRunIds.length
        ? fetchPaged<MonthlyIncomeInput>(
            (from, to) =>
              supabase
                .from("monthly_income_inputs")
                .select("*")
                .in("monthly_budget_run_id", budgetRunIds)
                .order("created_at", { ascending: true })
                .range(from, to) as any,
          )
        : Promise.resolve([]),
      recurringTransactionIds.length
        ? fetchPaged<RecurringRunExecution>(
            (from, to) =>
              supabase
                .from("recurring_run_executions")
                .select("*")
                .in("recurring_transaction_id", recurringTransactionIds)
                .order("scheduled_for", { ascending: true })
                .range(from, to) as any,
          )
        : Promise.resolve([]),
    ]);

    const budgetRuleIds = budgetRules.map((rule) => rule.id);
    const budgetRuleAllocations = budgetRuleIds.length
      ? await fetchPaged<BudgetRuleAllocation>(
          (from, to) =>
            supabase
              .from("budget_rule_allocations")
              .select("*")
              .in("rule_id", budgetRuleIds)
              .order("sort_order", { ascending: true })
              .range(from, to) as any,
        )
      : [];

    return buildCleanBackup({
      household,
      members,
      accounts,
      categories,
      savingPots,
      savingPotAccounts,
      transactions,
      recurringTransactions,
      recurringRunExecutions,
      budgetConfigs,
      budgetRules,
      budgetRuleAllocations,
      budgetRuns,
      incomeInputs,
      attachments,
    });
  }

  getExportFileName(
    backup: Pick<HouseholdBackupFile, "household" | "exportedAt">,
  ) {
    const day = backup.exportedAt.slice(0, 10);
    return `kintally-household-${safeNamePart(backup.household.name)}-${day}.json`;
  }

  parseBackup(input: unknown) {
    return asBackupFile(input);
  }

  getBackupCounts(backup: HouseholdBackupFile) {
    return {
      accounts: backup.accounts.length,
      categories: backup.categories.length,
      transactions: backup.transactions.length,
      savingPots: backup.savingPots.length,
      savingPotAccounts: backup.savingPotAccounts.length,
      recurringTransactions: backup.recurringTransactions.length,
      recurringRunExecutions: backup.recurringRunExecutions.length,
      budgetConfigs: backup.monthlyBudget.configs.length,
      budgetRules: backup.monthlyBudget.rules.length,
      budgetRuns: backup.monthlyBudget.runs.length,
      incomeInputs: backup.monthlyBudget.incomeInputs.length,
      skippedAttachments: backup.attachments.length,
    };
  }

  async importHouseholdBackup(
    input: HouseholdBackupFile,
    currentUserId: string,
  ): Promise<HouseholdBackupImportSummary> {
    const backup = asBackupFile(input);
    const currentProfile = await getCurrentProfile(currentUserId);
    const currentEmail = normalizeEmail(currentProfile?.email);
    const memberMap = getMemberFallbackMap(backup, currentUserId, currentEmail);

    const importedHousehold = await householdsService.createHousehold(
      `${backup.household.name} import`,
    );
    const householdId = importedHousehold.id;

    await throwIfError(
      supabase
        .from("categories")
        .delete()
        .eq("household_id", householdId)
        .eq("is_default", true),
    );

    await throwIfError(
      supabase
        .from("households")
        .update({
          income_mode: backup.household.incomeMode,
          remaining_cash_strategy: backup.household.remainingCashStrategy,
          fixed_remaining_cash_amount:
            backup.household.fixedRemainingCashAmount,
          excess_cash_distribution_method:
            backup.household.excessCashDistributionMethod,
        })
        .eq("id", householdId)
        .select()
        .single(),
    );

    const accountMap = newIdMap(backup.accounts);
    const categoryMap = newIdMap(backup.categories);
    const potMap = newIdMap(backup.savingPots);
    const configMap = newIdMap(backup.monthlyBudget.configs);
    const ruleMap = newIdMap(backup.monthlyBudget.rules);
    const runMap = newIdMap(backup.monthlyBudget.runs);
    const recurringMap = newIdMap(backup.recurringTransactions);
    const recurringExecutionMap = newIdMap(backup.recurringRunExecutions);
    const transactionMap = newIdMap(backup.transactions);
    const transferGroupMap = new Map(
      [
        ...new Set(
          backup.transactions
            .map((transaction) => transaction.transferGroupKey)
            .filter(isPresent),
        ),
      ].map((key) => [key, newId()]),
    );

    const categories = await insertMany(
      "categories",
      buildCategoryInserts(backup, householdId, categoryMap),
    );
    const accounts = await insertMany(
      "accounts",
      buildAccountInserts(backup, householdId, accountMap, memberMap),
    );
    const savingPots = await insertMany(
      "saving_pots",
      buildSavingPotInserts(
        backup,
        householdId,
        currentUserId,
        potMap,
        memberMap,
      ),
    );
    const savingPotAccounts = await insertMany(
      "saving_pot_accounts",
      buildSavingPotAccountInserts(backup, potMap, accountMap),
    );
    const budgetConfigs = await insertMany(
      "budget_configs",
      buildBudgetConfigInserts(backup, householdId, configMap),
    );
    const budgetRules = await insertMany(
      "budget_rules",
      buildBudgetRuleInserts(
        backup,
        ruleMap,
        configMap,
        accountMap,
        memberMap,
      ),
    );
    await insertMany(
      "budget_rule_allocations",
      buildBudgetRuleAllocationInserts(backup, ruleMap, accountMap, categoryMap),
    );
    const budgetRuns = await insertMany(
      "monthly_budget_runs",
      buildBudgetRunInserts(backup, householdId, configMap, runMap),
    );
    const incomeInputs = await insertMany(
      "monthly_income_inputs",
      buildIncomeInputInserts(
        backup,
        currentUserId,
        runMap,
        accountMap,
        memberMap,
      ),
    );
    const recurringTransactions = await insertMany(
      "recurring_transactions",
      buildRecurringTransactionInserts(
        backup,
        householdId,
        currentUserId,
        recurringMap,
        accountMap,
        categoryMap,
        potMap,
        memberMap,
      ),
    );
    const recurringRunExecutions = await insertMany(
      "recurring_run_executions",
      buildRecurringRunExecutionInserts(
        backup,
        householdId,
        recurringMap,
        recurringExecutionMap,
      ),
    );
    const transactions = await insertMany(
      "transactions",
      buildTransactionInserts(
        backup,
        householdId,
        currentUserId,
        transactionMap,
        accountMap,
        categoryMap,
        potMap,
        runMap,
        ruleMap,
        recurringExecutionMap,
        transferGroupMap,
        memberMap,
      ),
    );

    await householdsService.setDefaultHousehold(householdId);

    return {
      householdId,
      householdName: importedHousehold.name,
      accounts: accounts.length,
      categories: categories.length,
      transactions: transactions.length,
      savingPots: savingPots.length,
      savingPotAccounts: savingPotAccounts.length,
      recurringTransactions: recurringTransactions.length,
      recurringRunExecutions: recurringRunExecutions.length,
      budgetConfigs: budgetConfigs.length,
      budgetRules: budgetRules.length,
      budgetRuns: budgetRuns.length,
      incomeInputs: incomeInputs.length,
      skippedAttachments: backup.attachments.length,
    };
  }
}

export const householdBackupService = new HouseholdBackupService();
