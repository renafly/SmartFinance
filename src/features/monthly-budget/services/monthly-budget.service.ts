import { monthlyBudgetRepository, type BudgetRuleWithAllocations } from "@/repositories/monthly-budget.repository";
import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";

type BudgetConfig = Database["public"]["Tables"]["budget_configs"]["Row"];
type BudgetRule = BudgetRuleWithAllocations;
type AllocationMode = Database["public"]["Enums"]["budget_rule_allocation_mode"];
type MonthlyBudgetRun = Database["public"]["Tables"]["monthly_budget_runs"]["Row"];
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

/**
 * One destination account within a rule's allocation. `amount` always holds
 * the *resolved* per-account amount — for `equal_split` rules the editor
 * keeps this in sync with `total / count` (recomputed whenever the total or
 * the account list changes); for `custom` rules the user edits it directly.
 * Either way, downstream code (preview building, saving) only ever needs to
 * read `amount` and never has to special-case the mode.
 */
export type MonthlyBudgetRuleAllocationDraft = {
  /** Stable client-side key (persisted allocation id once saved, otherwise a generated temp id). */
  id: string;
  destinationAccountId: string;
  amount: string;
  /** Optional category for this allocation's generated transaction, e.g.
   * "Investments" or "Savings > PPR" — the same category/subcategory model
   * a manually-entered transaction uses, never a Monthly-Budget-only
   * concept. Null means "no category," which preserves the exact behavior
   * that existed before this field was added. */
  categoryId: string | null;
};

export type MonthlyBudgetRuleDraft = {
  id: string;
  name: string;
  section: Database["public"]["Enums"]["monthly_budget_section"];
  sourceAccountId: string;
  /** The rule's total amount, distributed across `allocations`. */
  amount: string;
  allocationMode: AllocationMode;
  allocations: MonthlyBudgetRuleAllocationDraft[];
  ownerMemberId: string | null;
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
  availableMonth?: string;
};

export type MonthlyBudgetTransfer = {
  ruleId: string | null;
  /** The specific allocation row this transfer was generated from, if any. */
  allocationId: string | null;
  title: string;
  section: Database["public"]["Enums"]["monthly_budget_section"];
  sourceAccountId: string;
  destinationAccountId: string;
  /** Always null — pot destinations are no longer supported. */
  destinationPotId: string | null;
  /** Always "account" — pot destinations are no longer supported. */
  destinationKind: DestinationKind;
  amount: number;
  generatedByRuleId: string | null;
  isSystemGenerated: boolean;
  /** The allocation's configured category (if any) — carried onto both
   * legs of the generated transaction by `confirm_monthly_budget_run`, the
   * same `category_id` column a normal transaction uses. Null for
   * system-generated transfers (e.g. remaining-cash distribution), which
   * have no per-allocation category to inherit. */
  categoryId: string | null;
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

/**
 * Splits `total` into `count` amounts that sum exactly to `total`, to the
 * cent. Plain `total / count` drifts under rounding (e.g. €200 / 3 =
 * €66.666...), so this works in integer cents and hands the leftover cents
 * to the first accounts in order — the same algorithm the
 * `save_monthly_budget_configuration` RPC uses server-side, so an
 * equal-split rule's amounts never disagree between the editor's live
 * preview and what actually gets persisted.
 */
export function distributeEqualSplit(total: number, count: number): number[] {
  if (!Number.isFinite(total) || count <= 0) return new Array(Math.max(count, 0)).fill(0);

  const totalCents = Math.round(total * 100);
  const baseCents = Math.trunc(totalCents / count);
  const remainderCents = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, index) => {
    const cents = baseCents + (index < remainderCents ? 1 : 0);
    return roundMoney(cents / 100);
  });
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
  const accountIds = new Set(accounts.map((account) => account.id));
  const incomeAccountIds = new Set(explicitIds.filter((id) => accountIds.has(id)));
  if (incomeAccountIds.size > 0) return incomeAccountIds;

  // Missing income inputs are reported separately. This fallback keeps the
  // preview useful while the user is still selecting salary accounts.
  return new Set(
    accounts
      .filter((account) => account.type === "cash" || account.type === "bank")
      .map((account) => account.id),
  );
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
      if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Rule "${rule.name}" needs a valid amount.`);

      if (rule.allocations.length === 0) {
        throw new Error(`Rule "${rule.name}" needs at least one destination account.`);
      }

      const destinationIds = new Set<string>();
      for (const allocation of rule.allocations) {
        if (!allocation.destinationAccountId) {
          throw new Error(`Rule "${rule.name}" has a destination account that is not set.`);
        }
        if (allocation.destinationAccountId === rule.sourceAccountId) {
          throw new Error(`Rule "${rule.name}" cannot use the same source and destination account.`);
        }
        if (destinationIds.has(allocation.destinationAccountId)) {
          throw new Error(`Rule "${rule.name}" cannot use the same destination account twice.`);
        }
        destinationIds.add(allocation.destinationAccountId);
      }

      if (rule.allocationMode === "custom") {
        for (const allocation of rule.allocations) {
          const allocationAmount = Number(allocation.amount);
          if (!Number.isFinite(allocationAmount) || allocationAmount <= 0) {
            throw new Error(`Rule "${rule.name}" needs a positive amount for every destination account.`);
          }
        }

        const assigned = roundMoney(
          rule.allocations.reduce((sum, allocation) => sum + (Number(allocation.amount) || 0), 0),
        );
        if (Math.abs(assigned - roundMoney(amount)) > 0.01) {
          throw new Error(
            `Rule "${rule.name}" allocations (${assigned}) must add up to its total (${roundMoney(amount)}).`,
          );
        }
      }

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

    const rules = sortedRules.map((rule, index) => {
      const amount = roundMoney(Number.isFinite(Number(rule.amount)) ? Number(rule.amount) : 0);
      // Equal-split amounts are always recomputed from the current total and
      // account count (never trusted from stale draft state); the RPC also
      // recomputes them server-side, so this is purely so the request we send
      // matches what will actually be persisted. Custom amounts are sent as
      // entered — already validated above to sum to the rule's total.
      const equalShares =
        rule.allocationMode === "equal_split" ? distributeEqualSplit(amount, rule.allocations.length) : null;

      return {
        id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rule.id)
          ? rule.id
          : null,
        name: rule.name.trim(),
        section: rule.section,
        source_account_id: rule.sourceAccountId,
        owner_member_id: rule.ownerMemberId || null,
        amount,
        allocation_mode: rule.allocationMode,
        frequency: "monthly" as const,
        priority: index,
        is_active: rule.isActive,
        active_months: getRuleActiveMonths(rule.activeMonths),
        active_from_month: parseMonthField(rule.activeFromMonth),
        active_to_month: parseMonthField(rule.activeToMonth),
        allocations: rule.allocations.map((allocation, allocationIndex) => ({
          destination_account_id: allocation.destinationAccountId,
          amount: equalShares ? equalShares[allocationIndex] : roundMoney(Number(allocation.amount) || 0),
          category_id: allocation.categoryId ?? null,
        })),
      };
    });

    const { error: saveError } = await supabase.rpc("save_monthly_budget_configuration", {
      p_household_id: input.householdId,
      p_config_id: input.configId ?? null,
      p_name: input.name.trim(),
      p_income_mode: input.incomeMode,
      p_remaining_cash_strategy: input.remainingCashStrategy,
      p_fixed_remaining_cash_amount: roundMoney(input.fixedRemainingCashAmount),
      p_excess_cash_distribution_method: input.excessCashDistributionMethod,
      p_rules: rules,
    });

    if (saveError) throw saveError;

    const configResult = await monthlyBudgetRepository.getActiveConfigWithRules(input.householdId);
    if (configResult.error || !configResult.data) {
      throw configResult.error ?? new Error("Unable to load the saved monthly budget configuration.");
    }

    const { data: householdResult, error: householdError } = await supabase
      .from("households")
      .select("*")
      .eq("id", input.householdId)
      .single();

    if (householdError) throw householdError;

    return {
      config: configResult.data,
      household: householdResult,
      rules: configResult.data.rules,
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
      available_month: `${normalizeMonth(item.availableMonth || normalizedMonth)}-01`,
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

  async deleteRunTransactions(runId: string) {
    const result = await monthlyBudgetRepository.deleteRunTransactions(runId);
    if (result.error) throw result.error;
    return result.data ?? 0;
  }

  async confirmRun(input: {
    runId: string;
    preview: MonthlyBudgetPreview;
  }) {
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

    }

    const runResult = await monthlyBudgetRepository.confirmRunAtomically(
      input.runId,
      input.preview.transfers as any,
      input.preview as any,
    );

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
    // A monthly run allocates this month's available wages and recurring cash
    // flow. Existing account balances were produced by previous months and
    // must not be redistributed again by the current run.
    const balances = new Map(input.accounts.map((account) => [account.id, 0]));
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

      if (normalizeMonth(incomeInput.availableMonth || month) !== month) {
        incomeByMember.set(member.userId, 0);
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
      const allocations = [...rule.allocations].sort((a, b) => a.sort_order - b.sort_order);

      if (!Number.isFinite(amount) || amount <= 0) {
        validationIssues.push(`Rule "${rule.name}" needs a valid amount.`);
        continue;
      }
      if (!source) {
        validationIssues.push(`Rule "${rule.name}" has no valid source account.`);
        continue;
      }
      if (allocations.length === 0) {
        validationIssues.push(`Rule "${rule.name}" needs at least one destination account.`);
        continue;
      }

      // Resolve every allocation before touching balances — a rule is
      // all-or-nothing: if any one of its destination accounts is invalid,
      // none of its transfers should be generated (mirrors the previous
      // single-destination behavior, just applied across N destinations).
      let hasInvalidAllocation = false;
      const resolvedAllocations: { id: string; destination: Account; amount: number; categoryId: string | null }[] = [];

      for (const allocation of allocations) {
        const destination = accountsById.get(allocation.destination_account_id);
        const allocationAmount = roundMoney(Number(allocation.amount));

        if (!destination) {
          validationIssues.push(`Rule "${rule.name}" has an allocation with no valid destination account.`);
          hasInvalidAllocation = true;
          continue;
        }
        if (destination.id === source.id) {
          validationIssues.push(`Rule "${rule.name}" cannot use the same source and destination account.`);
          hasInvalidAllocation = true;
          continue;
        }
        if (!Number.isFinite(allocationAmount) || allocationAmount <= 0) {
          validationIssues.push(`Rule "${rule.name}" needs a positive amount for every destination account.`);
          hasInvalidAllocation = true;
          continue;
        }

        resolvedAllocations.push({
          id: allocation.id,
          destination,
          amount: allocationAmount,
          categoryId: allocation.category_id ?? null,
        });
      }

      if (hasInvalidAllocation) continue;

      const allocatedTotal = roundMoney(resolvedAllocations.reduce((sum, item) => sum + item.amount, 0));
      if (Math.abs(allocatedTotal - amount) > 0.01) {
        validationIssues.push(
          allocatedTotal > amount
            ? `Rule "${rule.name}" allocations (${allocatedTotal}) exceed its total (${amount}) by ${roundMoney(allocatedTotal - amount)}.`
            : `Rule "${rule.name}" allocations (${allocatedTotal}) are short of its total (${amount}) by ${roundMoney(amount - allocatedTotal)}.`,
        );
        continue;
      }

      const sourceBalance = balances.get(source.id) ?? 0;
      if (sourceBalance < allocatedTotal) {
        validationIssues.push(`${source.name} does not have enough available cash for "${rule.name}".`);
      }

      balances.set(source.id, roundMoney(sourceBalance - allocatedTotal));
      configuredTotal = roundMoney(configuredTotal + allocatedTotal);

      for (const allocation of resolvedAllocations) {
        balances.set(
          allocation.destination.id,
          roundMoney((balances.get(allocation.destination.id) ?? 0) + allocation.amount),
        );
        transfers.push({
          ruleId: rule.id,
          allocationId: allocation.id,
          title: rule.name,
          section: rule.section,
          sourceAccountId: source.id,
          destinationAccountId: allocation.destination.id,
          destinationPotId: null,
          destinationKind: "account",
          amount: allocation.amount,
          generatedByRuleId: rule.id,
          isSystemGenerated: false,
          categoryId: allocation.categoryId,
        });
      }
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

      // Configured transfers have already been applied to `balances` above.
      // Only distribute the cash above the fixed target; configured savings
      // allocations must not be deducted or distributed a second time.
      const distributableExcess = roundMoney(Math.max(0, remainingCash - target));
      excessCash = distributableExcess;

      if (excessCash > 0) {
        const eligibleSavingsAccounts: Account[] = [];
        for (const rule of sortedRules) {
          for (const allocation of rule.allocations) {
            const destination = accountsById.get(allocation.destination_account_id);
            if (destination && destination.type === "savings") {
              eligibleSavingsAccounts.push(destination);
            }
          }
        }

        const uniqueEligibleSavings = eligibleSavingsAccounts.filter(
          (account, index, array) => array.findIndex((item) => item.id === account.id) === index,
        );

        if (uniqueEligibleSavings.length === 0) {
          validationIssues.push("Fixed remaining cash needs at least one eligible savings account.");
        } else {
          const incomeAccountIds = [...new Set(
            input.incomeInputs
              .filter((item) => (incomeByMember.get(item.memberId) ?? 0) > 0 && accountsById.has(item.cashAccountId))
              .map((item) => item.cashAccountId),
          )];
          const distributionSources = (incomeAccountIds.length > 0
            ? incomeAccountIds
            : [...cashAccountIds]
          )
            .map((accountId) => accountsById.get(accountId))
            .filter((account): account is Account => Boolean(account));

          if (distributionSources.length === 0) {
            validationIssues.push("No cash account is available to distribute the remaining cash.");
          } else {
            const retainedShare = roundMoney(target / distributionSources.length);
            const desiredRetainedAmounts = distributionSources.map((source, index) => (
              index === distributionSources.length - 1
                ? roundMoney(target - retainedShare * (distributionSources.length - 1))
                : retainedShare
            ));
            const sourceSurpluses = distributionSources.map((source, index) =>
              Math.max(0, roundMoney((balances.get(source.id) ?? 0) - desiredRetainedAmounts[index])),
            );
            const totalSourceSurplus = roundMoney(sourceSurpluses.reduce((sum, amount) => sum + amount, 0));
            let undistributedExcess = distributableExcess;

            distributionSources.forEach((source, sourceIndex) => {
              if (undistributedExcess <= 0 || sourceSurpluses[sourceIndex] <= 0) return;

              const isLastSourceWithSurplus = sourceSurpluses
                .slice(sourceIndex + 1)
                .every((amount) => amount <= 0);
              const sourceAmount = isLastSourceWithSurplus
                ? undistributedExcess
                : Math.min(
                    sourceSurpluses[sourceIndex],
                    roundMoney(distributableExcess * sourceSurpluses[sourceIndex] / totalSourceSurplus),
                  );
              let sourceRemaining = sourceAmount;
              const destinationShare = roundMoney(sourceAmount / uniqueEligibleSavings.length);

              uniqueEligibleSavings.forEach((destination, destinationIndex) => {
                const transferAmount = destinationIndex === uniqueEligibleSavings.length - 1
                  ? sourceRemaining
                  : Math.min(sourceRemaining, destinationShare);
                if (transferAmount <= 0) return;

                balances.set(source.id, roundMoney((balances.get(source.id) ?? 0) - transferAmount));
                balances.set(destination.id, roundMoney((balances.get(destination.id) ?? 0) + transferAmount));
                sourceRemaining = roundMoney(sourceRemaining - transferAmount);
                undistributedExcess = roundMoney(undistributedExcess - transferAmount);
                transfers.push({
                  ruleId: null,
                  allocationId: null,
                  title: "Remaining cash distribution",
                  section: "remaining_cash",
                  sourceAccountId: source.id,
                  destinationAccountId: destination.id,
                  destinationPotId: null,
                  destinationKind: "account",
                  amount: transferAmount,
                  generatedByRuleId: null,
                  isSystemGenerated: true,
                  categoryId: null,
                });
              });
            });
            excessCash = undistributedExcess;
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
