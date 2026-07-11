import { monthlyBudgetRepository } from "@/repositories/monthly-budget.repository";
import { transactionsRepository } from "@/repositories/transactions.repository";
import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";

type BudgetConfig = Database["public"]["Tables"]["budget_configs"]["Row"];
type BudgetRule = Database["public"]["Tables"]["budget_rules"]["Row"];
type MonthlyBudgetRun = Database["public"]["Tables"]["monthly_budget_runs"]["Row"];
type MonthlyIncomeInput = Database["public"]["Tables"]["monthly_income_inputs"]["Row"];
type Account = Database["public"]["Views"]["account_balances"]["Row"] & {
  owner_profile_id?: string | null;
};
type Member = {
  userId: string;
  fullName: string | null;
  email: string | null;
  status?: "pending" | "accepted";
};
type RecurringTransaction = Database["public"]["Tables"]["recurring_transactions"]["Row"];
type SavingPotAccountAssignment = Database["public"]["Tables"]["saving_pot_accounts"]["Row"];

type DestinationKind = "account" | "pot";

const SECTION_SORT_ORDER: Record<string, number> = {
  savings: 0,
  investments: 1,
  pots: 2,
  ppr: 3,
  remaining_cash: 4,
};

export type MonthlyBudgetRuleDraft = {
  id: string;
  name: string;
  section: Database["public"]["Enums"]["monthly_budget_section"];
  sourceAccountId: string;
  destinationAccountId: string;
  /** @deprecated Kept temporarily so callers can migrate to account-only destinations. */
  destinationPotId: string | null;
  /** @deprecated Kept temporarily so callers can migrate to account-only destinations. */
  destinationKind: DestinationKind;
  ownerMemberId: string | null;
  amount: string;
  priority: string;
  isActive: boolean;
  activeMonths: number[];
  activeFromMonth: string;
  activeToMonth: string;
};

export type MonthlyBudgetIncomeDraft = {
  memberId: string;
  cashAccountId: string;
  amount: string;
};

export type MonthlyBudgetTransfer = {
  ruleId: string | null;
  title: string;
  section: Database["public"]["Enums"]["monthly_budget_section"];
  sourceAccountId: string;
  destinationAccountId: string;
  /** Always null for newly generated previews. */
  destinationPotId: string | null;
  /** Always "account" for newly generated previews. */
  destinationKind: DestinationKind;
  amount: number;
  generatedByRuleId: string | null;
  isSystemGenerated: boolean;
};

export type MonthlyBudgetPreview = {
  month: string;
  incomeTotal: number;
  recurringNetTotal: number;
  configuredTotal: number;
  remainingCash: number;
  excessCash: number;
  sectionTotals: Record<string, number>;
  memberTotals: Record<string, number>;
  transfers: MonthlyBudgetTransfer[];
  validationIssues: string[];
};

export type MonthlyBudgetWorkspace = {
  config: BudgetConfig | null;
  rules: BudgetRule[];
  runs: MonthlyBudgetRun[];
};

type BudgetHouseholdSettings = Pick<
  Database["public"]["Tables"]["households"]["Row"],
  | "income_mode"
  | "remaining_cash_strategy"
  | "fixed_remaining_cash_amount"
  | "excess_cash_distribution_method"
>;

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function normalizeMonth(month: string) {
  if (!month) return new Date().toISOString().slice(0, 7);
  return month.slice(0, 7);
}

function getMemberLabel(member?: Member | null) {
  if (!member) return "Unknown member";
  return member.fullName?.trim() || member.email || member.userId;
}

function getMonthNumber(month: string) {
  const monthNumber = Number(month.slice(5, 7));
  return Number.isFinite(monthNumber) ? monthNumber : null;
}

function getExcludedMonths(rule: RecurringTransaction) {
  return Array.isArray(rule.excluded_months)
    ? (rule.excluded_months as Array<number | string>)
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item >= 1 && item <= 12)
    : [];
}

function getRuleActiveMonths(months: Array<number | string> | null | undefined) {
  return Array.isArray(months)
    ? [...new Set(months.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item >= 1 && item <= 12))]
    : [];
}

function parseMonthField(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const month = Number(value);
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month : null;
}

function isMonthWithinWindow(month: number, start: number, end: number) {
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

function isBudgetRuleActiveForMonth(rule: BudgetRule, month: string) {
  if (!rule.is_active) return false;

  const monthNumber = getMonthNumber(month);
  if (!monthNumber) return false;

  const activeMonths = getRuleActiveMonths(rule.active_months as Array<number | string> | null | undefined);
  if (activeMonths.length > 0 && !activeMonths.includes(monthNumber)) return false;

  const activeFromMonth = Number(rule.active_from_month ?? NaN);
  const activeToMonth = Number(rule.active_to_month ?? NaN);

  if (Number.isFinite(activeFromMonth) || Number.isFinite(activeToMonth)) {
    if (!Number.isFinite(activeFromMonth) || !Number.isFinite(activeToMonth)) return false;
    return isMonthWithinWindow(monthNumber, activeFromMonth, activeToMonth);
  }

  return true;
}

function getRecurringMonthlyAmount(rule: RecurringTransaction, month: string) {
  if (rule.frequency === "custom") {
    const monthNumber = getMonthNumber(month);
    if (monthNumber && getExcludedMonths(rule).includes(monthNumber)) {
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

  const signedAmount = rule.type === "income" ? Number(rule.amount ?? 0) : -Number(rule.amount ?? 0);
  return roundMoney(signedAmount * multiplier);
}

function getSectionSortRank(section: string) {
  return SECTION_SORT_ORDER[section] ?? 99;
}

function getCashAccountIds(accounts: Account[], explicitIds: string[]) {
  const ids = new Set<string>();

  for (const account of accounts) {
    if (account.type === "cash" || account.type === "bank") {
      ids.add(account.id);
    }
  }

  for (const id of explicitIds) ids.add(id);

  return ids;
}

function findHighestCashAccount(
  balances: Map<string, number>,
  accounts: Account[],
  cashAccountIds: Set<string>,
) {
  let candidate: Account | null = null;
  let candidateBalance = Number.NEGATIVE_INFINITY;

  for (const account of accounts) {
    if (!cashAccountIds.has(account.id)) continue;
    const balance = balances.get(account.id) ?? 0;
    if (balance > candidateBalance) {
      candidate = account;
      candidateBalance = balance;
    }
  }

  return candidate;
}

export class MonthlyBudgetService {
  async getWorkspace(householdId: string): Promise<MonthlyBudgetWorkspace> {
    const [configResult, runsResult] = await Promise.all([
      monthlyBudgetRepository.getActiveConfigWithRules(householdId),
      monthlyBudgetRepository.listRuns(householdId),
    ]);

    if (configResult.error) throw configResult.error;
    if (runsResult.error) throw runsResult.error;

    return {
      config: configResult.data ?? null,
      rules: configResult.data?.rules ?? [],
      runs: runsResult.data ?? [],
    };
  }

  async getIncomeInputs(monthlyBudgetRunId: string) {
    const { data, error } = await monthlyBudgetRepository.listIncomeInputs(monthlyBudgetRunId);
    if (error) throw error;
    return data ?? [];
  }

  async saveConfiguration(input: {
    householdId: string;
    configId?: string | null;
    name: string;
    incomeMode: Database["public"]["Enums"]["household_income_mode"];
    remainingCashStrategy: Database["public"]["Enums"]["remaining_cash_strategy"];
    fixedRemainingCashAmount: number;
    excessCashDistributionMethod: Database["public"]["Enums"]["excess_cash_distribution_method"];
    rules: MonthlyBudgetRuleDraft[]; 
  }) {
    const sortedRules = [...input.rules].sort((a, b) => {
      const sectionDelta = getSectionSortRank(a.section) - getSectionSortRank(b.section);
      if (sectionDelta !== 0) return sectionDelta;

      const priorityDelta = Number(a.priority) - Number(b.priority);
      if (Number.isFinite(priorityDelta) && priorityDelta !== 0) return priorityDelta;

      return a.id.localeCompare(b.id);
    });

    for (const rule of sortedRules) {
      const amount = Number(rule.amount);
      if (!rule.name.trim()) throw new Error("Each budget rule needs a name.");
      if (!rule.sourceAccountId) throw new Error(`Rule "${rule.name}" needs a source account.`);
      if (!rule.destinationAccountId) {
        throw new Error(`Rule "${rule.name}" needs a destination account.`);
      }
      if (rule.sourceAccountId === rule.destinationAccountId) {
        throw new Error(`Rule "${rule.name}" cannot use the same source and destination account.`);
      }
      if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Rule "${rule.name}" needs a valid amount.`);

      const activeMonths = getRuleActiveMonths(rule.activeMonths);
      const activeFromMonth = parseMonthField(rule.activeFromMonth);
      const activeToMonth = parseMonthField(rule.activeToMonth);
      if ((rule.activeFromMonth && !activeFromMonth) || (rule.activeToMonth && !activeToMonth)) {
        throw new Error(`Rule "${rule.name}" has an invalid active month range.`);
      }
      if ((rule.activeFromMonth || rule.activeToMonth) && (!activeFromMonth || !activeToMonth)) {
        throw new Error(`Rule "${rule.name}" needs both start and end months for its active range.`);
      }
      if (activeMonths.length > 0 && activeMonths.length !== rule.activeMonths.length) {
        throw new Error(`Rule "${rule.name}" has an invalid active months selection.`);
      }
    }

    await monthlyBudgetRepository.deactivateHouseholdConfigs(input.householdId);

    const configResult = await monthlyBudgetRepository.saveConfig(
      {
        household_id: input.householdId,
        name: input.name.trim(),
        is_active: true,
      },
      input.configId ?? undefined,
    );

    if (configResult.error) throw configResult.error;

    const rules = sortedRules.map((rule, index) => {
      const amount = Number(rule.amount);

      return {
        budget_config_id: configResult.data.id,
        name: rule.name.trim(),
        section: rule.section,
        source_account_id: rule.sourceAccountId,
        destination_account_id: rule.destinationAccountId,
        // Pots group accounts for reporting only. Budget money must always move
        // to a concrete account, so legacy pot references are not persisted.
        destination_pot_id: null,
        owner_member_id: rule.ownerMemberId || null,
        amount: roundMoney(Number.isFinite(amount) ? amount : 0),
        frequency: "monthly" as const,
        priority: index,
        is_active: rule.isActive,
        active_months: getRuleActiveMonths(rule.activeMonths),
        active_from_month: parseMonthField(rule.activeFromMonth),
        active_to_month: parseMonthField(rule.activeToMonth),
      };
    });

    const rulesResult = await monthlyBudgetRepository.replaceRules(configResult.data.id, rules);
    if (rulesResult.error) throw rulesResult.error;

    const { data: householdResult, error: householdError } = await supabase
      .from("households")
      .update({
        income_mode: input.incomeMode,
        remaining_cash_strategy: input.remainingCashStrategy,
        fixed_remaining_cash_amount: roundMoney(input.fixedRemainingCashAmount),
        excess_cash_distribution_method: input.excessCashDistributionMethod,
      })
      .eq("id", input.householdId)
      .select()
      .single();

    if (householdError) throw householdError;

    return {
      config: configResult.data,
      household: householdResult,
      rules: rulesResult.data ?? [],
    };
  }

  async saveDraftRun(input: {
    householdId: string;
    configId: string;
    month: string;
    incomeModeSnapshot: Database["public"]["Enums"]["household_income_mode"];
    remainingCashStrategySnapshot: Database["public"]["Enums"]["remaining_cash_strategy"];
    previewSnapshot: MonthlyBudgetPreview;
    incomeInputs: MonthlyBudgetIncomeDraft[];
  }) {
    const normalizedMonth = normalizeMonth(input.month);
    const runs = await monthlyBudgetRepository.listRuns(input.householdId);
    if (runs.error) throw runs.error;

    const existing = (runs.data ?? []).find((run) => normalizeMonth(run.month) === normalizedMonth);
    if (existing?.status === "confirmed") {
      throw new Error("This month has already been confirmed. Create an adjustment run instead.");
    }

    const payload = {
      household_id: input.householdId,
      budget_config_id: input.configId,
      month: `${normalizedMonth}-01`,
      status: "draft" as const,
      income_mode_snapshot: input.incomeModeSnapshot,
      remaining_cash_strategy_snapshot: input.remainingCashStrategySnapshot,
      preview_snapshot: input.previewSnapshot as any,
    };

    const runResult = existing
      ? await monthlyBudgetRepository.updateRun(existing.id, payload as any)
      : await monthlyBudgetRepository.createRun(payload as any);

    if (runResult.error) throw runResult.error;

    const incomeInputs = input.incomeInputs.map((item) => ({
      monthly_budget_run_id: runResult.data.id,
      member_id: item.memberId,
      cash_account_id: item.cashAccountId,
      amount: roundMoney(Number(item.amount)),
    }));

    const savedInputs = await monthlyBudgetRepository.replaceIncomeInputs(runResult.data.id, incomeInputs);
    if (savedInputs.error) throw savedInputs.error;

    return {
      run: runResult.data,
      incomeInputs: savedInputs.data ?? [],
    };
  }

  async cancelRun(runId: string) {
    const currentRun = await monthlyBudgetRepository.getRunById(runId);
    if (currentRun.error) throw currentRun.error;

    if (currentRun.data && currentRun.data.status !== "draft") {
      throw new Error("Only draft runs can be cancelled.");
    }

    const result = await monthlyBudgetRepository.updateRun(runId, {
      status: "cancelled",
    } as any);

    if (result.error) throw result.error;
    return result.data;
  }

  async confirmRun(input: {
    runId: string;
    householdId: string;
    month: string;
    preview: MonthlyBudgetPreview;
    createdBy: string;
  }) {
    const runs = await monthlyBudgetRepository.listRuns(input.householdId);
    if (runs.error) throw runs.error;

    const currentRun = (runs.data ?? []).find((run) => run.id === input.runId);
    if (!currentRun) {
      throw new Error("Unable to find the selected monthly budget run.");
    }
    if (currentRun.status !== "draft") {
      throw new Error("Only draft runs can be confirmed.");
    }

    if (input.preview.validationIssues.length > 0) {
      throw new Error(input.preview.validationIssues[0]);
    }

    for (const transfer of input.preview.transfers) {
      if (
        !transfer.sourceAccountId ||
        !transfer.destinationAccountId ||
        transfer.sourceAccountId === transfer.destinationAccountId ||
        transfer.destinationKind === "pot" ||
        transfer.destinationPotId != null
      ) {
        throw new Error(`Budget transfer "${transfer.title}" must use two different valid accounts.`);
      }

      const result = await transactionsRepository.createTransfer({
        householdId: input.householdId,
        fromAccountId: transfer.sourceAccountId,
        toAccountId: transfer.destinationAccountId,
        amount: transfer.amount,
        title: transfer.title,
        createdBy: input.createdBy,
        transactionDate: `${normalizeMonth(input.month)}-01T00:00:00.000Z`,
        monthlyBudgetRunId: input.runId,
        generatedByRuleId: transfer.generatedByRuleId,
        budgetSection: transfer.section,
      });

      if (result.error) throw result.error;
    }

    const runResult = await monthlyBudgetRepository.updateRun(input.runId, {
      status: "confirmed",
      preview_snapshot: input.preview as any,
    } as any);

    if (runResult.error) throw runResult.error;
    return runResult.data;
  }

  buildPreview(input: {
    settings: BudgetHouseholdSettings | null;
    rules: BudgetRule[];
    members: Member[];
    accounts: Account[];
    /** @deprecated Pots are no longer considered when resolving destinations. */
    savingPots: Array<Database["public"]["Tables"]["saving_pots"]["Row"]>;
    /** @deprecated Pots are no longer considered when resolving destinations. */
    savingPotAccountAssignments: SavingPotAccountAssignment[];
    incomeInputs: MonthlyBudgetIncomeDraft[];
    recurringTransactions: RecurringTransaction[];
    month: string;
  }): MonthlyBudgetPreview {
    const validationIssues: string[] = [];
    const month = normalizeMonth(input.month);
    const accountsById = new Map(input.accounts.map((account) => [account.id, account]));
    const balances = new Map(input.accounts.map((account) => [account.id, Number(account.current_balance ?? 0)]));
    const memberMap = new Map(input.members.map((member) => [member.userId, member]));
    const incomeByMember = new Map<string, number>();
    const cashAccountIds = getCashAccountIds(input.accounts, input.incomeInputs.map((item) => item.cashAccountId));

    if (!input.settings) {
      validationIssues.push("Save a monthly budget configuration first.");
    }

    const acceptedMembers = input.members.filter((member) => member.status !== "pending");
    for (const member of acceptedMembers) {
      const incomeInput = input.incomeInputs.find((item) => item.memberId === member.userId);
      if (!incomeInput) {
        validationIssues.push(`${getMemberLabel(member)} is missing a monthly salary input.`);
        continue;
      }

      if (!String(incomeInput.amount ?? "").trim()) {
        validationIssues.push(`${getMemberLabel(member)} is missing a monthly salary input.`);
        continue;
      }

      const amount = roundMoney(Number(incomeInput.amount));
      if (!Number.isFinite(amount) || amount < 0) {
        validationIssues.push(`${getMemberLabel(member)} salary must be a valid amount.`);
        continue;
      }

      const cashAccount = accountsById.get(incomeInput.cashAccountId);
      if (!cashAccount) {
        validationIssues.push(`${getMemberLabel(member)} does not have a valid cash account selected.`);
        continue;
      }

      balances.set(cashAccount.id, roundMoney((balances.get(cashAccount.id) ?? 0) + amount));
      incomeByMember.set(member.userId, amount);
    }

    let recurringNetTotal = 0;
    for (const rule of input.recurringTransactions) {
      if (!rule.is_active) continue;
      // Transfers only move money between household accounts. They must never
      // change the income/expense total used to calculate a monthly budget.
      if (rule.rule_kind === "transfer") continue;
      const account = accountsById.get(rule.account_id);
      if (!account) continue;

      const monthlyAmount = getRecurringMonthlyAmount(rule, month);
      recurringNetTotal = roundMoney(recurringNetTotal + monthlyAmount);
      balances.set(account.id, roundMoney((balances.get(account.id) ?? 0) + monthlyAmount));
    }

    const transfers: MonthlyBudgetTransfer[] = [];
    let configuredTotal = 0;

    const sortedRules = [...input.rules]
      .filter((rule) => isBudgetRuleActiveForMonth(rule, month))
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || a.created_at.localeCompare(b.created_at));

    for (const rule of sortedRules) {
      const amount = roundMoney(Number(rule.amount));
      const source = accountsById.get(rule.source_account_id);
      const destination = accountsById.get(rule.destination_account_id);

      if (!Number.isFinite(amount) || amount <= 0) {
        validationIssues.push(`Rule "${rule.name}" needs a valid amount.`);
        continue;
      }
      if (!source) {
        validationIssues.push(`Rule "${rule.name}" has no valid source account.`);
        continue;
      }
      if (!destination) {
        validationIssues.push(`Rule "${rule.name}" has no valid destination account.`);
        continue;
      }
      if (source.id === destination.id) {
        validationIssues.push(`Rule "${rule.name}" cannot use the same source and destination account.`);
        continue;
      }

      const sourceBalance = balances.get(source.id) ?? 0;
      if (sourceBalance < amount) {
        validationIssues.push(`${source.name} does not have enough available cash for "${rule.name}".`);
      }

      balances.set(source.id, roundMoney(sourceBalance - amount));
      balances.set(destination.id, roundMoney((balances.get(destination.id) ?? 0) + amount));
      configuredTotal = roundMoney(configuredTotal + amount);
      transfers.push({
        ruleId: rule.id,
        title: rule.name,
        section: rule.section,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        destinationPotId: null,
        destinationKind: "account",
        amount,
        generatedByRuleId: rule.id,
        isSystemGenerated: false,
      });
    }

    let excessCash = 0;
    const remainingCashAccounts = [...cashAccountIds]
      .map((accountId) => accountsById.get(accountId))
      .filter((account): account is Account => Boolean(account));
    const remainingCash = roundMoney(
      remainingCashAccounts.reduce((sum, account) => sum + (balances.get(account.id) ?? 0), 0),
    );

    if (input.settings?.remaining_cash_strategy === "fixed") {
      const target = roundMoney(Number(input.settings.fixed_remaining_cash_amount ?? 0));
      if (target < 0) {
        validationIssues.push("Fixed remaining cash target cannot be negative.");
      }

      excessCash = roundMoney(remainingCash - target);

      if (excessCash > 0) {
        const eligibleSavingsAccounts: Account[] = [];
        for (const rule of sortedRules) {
          const destination = accountsById.get(rule.destination_account_id);
          if (destination && destination.type === "savings") {
            eligibleSavingsAccounts.push(destination);
          }
        }

        const uniqueEligibleSavings = eligibleSavingsAccounts.filter(
          (account, index, array) => array.findIndex((item) => item.id === account.id) === index,
        );

        if (uniqueEligibleSavings.length === 0) {
          validationIssues.push("Fixed remaining cash needs at least one eligible savings account.");
        } else {
          const sourceAccount = findHighestCashAccount(balances, input.accounts, cashAccountIds);
          if (!sourceAccount) {
            validationIssues.push("No cash account is available to distribute the remaining cash.");
          } else {
            const share = roundMoney(excessCash / uniqueEligibleSavings.length);
            uniqueEligibleSavings.forEach((destination, index) => {
              const transferAmount = index === uniqueEligibleSavings.length - 1
                ? roundMoney(excessCash - share * (uniqueEligibleSavings.length - 1))
                : share;

              balances.set(sourceAccount.id, roundMoney((balances.get(sourceAccount.id) ?? 0) - transferAmount));
              balances.set(destination.id, roundMoney((balances.get(destination.id) ?? 0) + transferAmount));
              transfers.push({
                ruleId: null,
                title: "Remaining cash distribution",
                section: "remaining_cash",
                sourceAccountId: sourceAccount.id,
                destinationAccountId: destination.id,
                destinationPotId: null,
                destinationKind: "account",
                amount: transferAmount,
                generatedByRuleId: null,
                isSystemGenerated: true,
              });
            });
            excessCash = 0;
          }
        }
      }
    }

    const finalRemainingCash = roundMoney(
      remainingCashAccounts.reduce((sum, account) => sum + (balances.get(account.id) ?? 0), 0),
    );

    if (finalRemainingCash < 0) {
      validationIssues.push("The monthly budget leaves a cash account below zero.");
    }

    const sectionTotals = transfers.reduce<Record<string, number>>((acc, transfer) => {
      acc[transfer.section] = roundMoney((acc[transfer.section] ?? 0) + transfer.amount);
      return acc;
    }, {});

    const memberTotals = acceptedMembers.reduce<Record<string, number>>((acc, member) => {
      acc[member.userId] = incomeByMember.get(member.userId) ?? 0;
      return acc;
    }, {});

    return {
      month,
      incomeTotal: roundMoney([...incomeByMember.values()].reduce((sum, amount) => sum + amount, 0)),
      recurringNetTotal,
      configuredTotal,
      remainingCash: finalRemainingCash,
      excessCash,
      sectionTotals,
      memberTotals,
      transfers,
      validationIssues,
    };
  }
}

export const monthlyBudgetService = new MonthlyBudgetService();
