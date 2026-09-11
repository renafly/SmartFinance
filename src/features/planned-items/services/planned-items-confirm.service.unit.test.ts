jest.mock("@/repositories", () => ({
  repositories: {
    plannedItems: {
      confirmOccurrence: jest.fn(),
      matchOccurrence: jest.fn(),
      unmatchOccurrence: jest.fn(),
      unlinkOccurrenceTransaction: jest.fn(),
      revertOccurrence: jest.fn(),
      getMonthlyBudgetPeriod: jest.fn(),
    },
  },
}));

import { plannedItemsConfirmService } from "./planned-items-confirm.service";
import { repositories } from "@/repositories";

const mockConfirmOccurrence = jest.mocked(repositories.plannedItems.confirmOccurrence);
const mockMatchOccurrence = jest.mocked(repositories.plannedItems.matchOccurrence);
const mockUnmatchOccurrence = jest.mocked(repositories.plannedItems.unmatchOccurrence);
const mockUnlinkOccurrenceTransaction = jest.mocked(repositories.plannedItems.unlinkOccurrenceTransaction);
const mockRevertOccurrence = jest.mocked(repositories.plannedItems.revertOccurrence);
const mockGetMonthlyBudgetPeriod = jest.mocked(repositories.plannedItems.getMonthlyBudgetPeriod);

/**
 * These tests exercise plannedItemsConfirmService's "mark as paid / link /
 * unmark as paid" methods as thin wrappers over the RPC-backed repository
 * layer -- verifying each picks the right RPC with the right arguments and
 * propagates the repository's result/error unchanged. The RPCs' own
 * business rules (idempotency guards, unique-violation duplicate
 * prevention, the 1:1 planned_item_matches constraint) live in Postgres
 * and are exercised by the Supabase contract tests, not here; see
 * category-budget-view-model.unit.test.ts for the budget-math side of the
 * same feature (actual-vs-expected amounts, double-counting).
 */
function occurrenceRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "occ-1",
    planned_item_id: "item-1",
    household_id: "household-1",
    month: "2026-09-01",
    status: "planned",
    expected_amount: 200,
    source_account_id: "acct-source",
    category_id: "housing",
    is_estimate: false,
    source_definition_version: 1,
    is_overridden: false,
    confirmed_at: null,
    confirmed_by: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("plannedItemsConfirmService.confirmOccurrence", () => {
  it("creates a transaction at the occurrence's own expected amount when no actual amount is given", async () => {
    mockConfirmOccurrence.mockResolvedValue({ data: occurrenceRow({ status: "confirmed" }), error: null } as any);

    const result = await plannedItemsConfirmService.confirmOccurrence("occ-1", "profile-1");

    expect(mockConfirmOccurrence).toHaveBeenCalledWith("occ-1", "profile-1", undefined);
    expect(result.status).toBe("confirmed");
  });

  it("passes a manually-entered actual amount straight through to the RPC, distinct from the occurrence's expected_amount (spec: planned 200, actual 150)", async () => {
    mockConfirmOccurrence.mockResolvedValue(
      { data: occurrenceRow({ status: "confirmed", expected_amount: 200 }), error: null } as any,
    );

    const result = await plannedItemsConfirmService.confirmOccurrence("occ-1", "profile-1", 150);

    expect(mockConfirmOccurrence).toHaveBeenCalledWith("occ-1", "profile-1", 150);
    // expected_amount on the occurrence itself is untouched -- the 150 only
    // ever reaches the generated transaction's own amount (see
    // confirm_planned_item_occurrence's migration doc comment); the view
    // model separately reads the transaction's real amount as actualAmount.
    expect(result.expectedAmount).toBe(200);
  });

  it("rejects with the repository's own error rather than swallowing it (e.g. a re-confirm hitting the one-transaction-per-occurrence idempotency guard)", async () => {
    const dbError = { message: "duplicate key value violates unique constraint \"idx_transactions_one_plain_expense_per_occurrence\"" };
    mockConfirmOccurrence.mockResolvedValue({ data: null, error: dbError } as any);

    await expect(plannedItemsConfirmService.confirmOccurrence("occ-1", "profile-1")).rejects.toBe(dbError);
  });
});

describe("plannedItemsConfirmService.matchOccurrence", () => {
  it("links an existing transaction via matchOccurrence without creating a new one", async () => {
    mockMatchOccurrence.mockResolvedValue({ data: occurrenceRow({ status: "matched" }), error: null } as any);

    const result = await plannedItemsConfirmService.matchOccurrence("occ-1", "txn-existing", "profile-1");

    expect(mockMatchOccurrence).toHaveBeenCalledWith("occ-1", "txn-existing", "profile-1");
    expect(result.status).toBe("matched");
  });

  it("propagates a duplicate-match error unchanged (planned_item_matches enforces one occurrence <-> one transaction at the DB layer)", async () => {
    const dbError = { message: "This transaction is already linked to another planned expense.", code: "23505" };
    mockMatchOccurrence.mockResolvedValue({ data: null, error: dbError } as any);

    await expect(plannedItemsConfirmService.matchOccurrence("occ-1", "txn-existing", "profile-1")).rejects.toBe(dbError);
  });
});

describe("plannedItemsConfirmService.unmatchOccurrence", () => {
  it("unlinks a manually-linked (matched) occurrence, returning it to planned -- the transaction itself is never touched by this call", async () => {
    mockUnmatchOccurrence.mockResolvedValue({ data: occurrenceRow({ status: "planned" }), error: null } as any);

    const result = await plannedItemsConfirmService.unmatchOccurrence("occ-1");

    expect(mockUnmatchOccurrence).toHaveBeenCalledWith("occ-1");
    expect(result.status).toBe("planned");
  });

  it("is safe to call again on an already-unmatched occurrence (repository/RPC idempotency, not client-side state)", async () => {
    mockUnmatchOccurrence.mockResolvedValue({ data: occurrenceRow({ status: "planned" }), error: null } as any);

    await plannedItemsConfirmService.unmatchOccurrence("occ-1");
    await plannedItemsConfirmService.unmatchOccurrence("occ-1");

    expect(mockUnmatchOccurrence).toHaveBeenCalledTimes(2);
    expect(mockUnmatchOccurrence).toHaveBeenNthCalledWith(1, "occ-1");
    expect(mockUnmatchOccurrence).toHaveBeenNthCalledWith(2, "occ-1");
  });
});

describe("plannedItemsConfirmService.unlinkOccurrenceTransaction", () => {
  it("detaches an auto-created transaction's lineage while keeping the transaction itself, returning the occurrence to planned", async () => {
    mockUnlinkOccurrenceTransaction.mockResolvedValue({ data: occurrenceRow({ status: "planned" }), error: null } as any);

    const result = await plannedItemsConfirmService.unlinkOccurrenceTransaction("occ-1");

    expect(mockUnlinkOccurrenceTransaction).toHaveBeenCalledWith("occ-1");
    expect(result.status).toBe("planned");
  });

  it("rejects with the RPC's own error when the occurrence isn't 'confirmed' (e.g. called on a matched occurrence by mistake -- the RPC itself points callers at unmatchOccurrence instead)", async () => {
    const dbError = { message: "Occurrence occ-1 is matched, not confirmed -- use unmatch_planned_item_occurrence for a matched occurrence instead" };
    mockUnlinkOccurrenceTransaction.mockResolvedValue({ data: null, error: dbError } as any);

    await expect(plannedItemsConfirmService.unlinkOccurrenceTransaction("occ-1")).rejects.toBe(dbError);
  });
});

describe("plannedItemsConfirmService.revertOccurrence", () => {
  it("deletes the auto-created transaction and reopens the occurrence when the month is still open", async () => {
    mockGetMonthlyBudgetPeriod.mockResolvedValue({ data: { status: "open" }, error: null } as any);
    mockRevertOccurrence.mockResolvedValue({ data: occurrenceRow({ status: "planned" }), error: null } as any);

    const result = await plannedItemsConfirmService.revertOccurrence("occ-1", "household-1", "2026-09");

    expect(mockGetMonthlyBudgetPeriod).toHaveBeenCalledWith("household-1", "2026-09-01");
    expect(mockRevertOccurrence).toHaveBeenCalledWith("occ-1");
    expect(result.status).toBe("planned");
  });

  it("treats a missing monthly_budget_periods row as open (no explicit close yet) rather than blocking the revert", async () => {
    mockGetMonthlyBudgetPeriod.mockResolvedValue({ data: null, error: null } as any);
    mockRevertOccurrence.mockResolvedValue({ data: occurrenceRow({ status: "planned" }), error: null } as any);

    await plannedItemsConfirmService.revertOccurrence("occ-1", "household-1", "2026-09");

    expect(mockRevertOccurrence).toHaveBeenCalledWith("occ-1");
  });

  it("refuses to delete the transaction once the month is no longer open, and never calls the delete-backed RPC (this month's real spending history must stay intact once closed -- see unlinkOccurrenceTransaction for the always-available 'keep the transaction' alternative)", async () => {
    mockGetMonthlyBudgetPeriod.mockResolvedValue({ data: { status: "confirmed" }, error: null } as any);

    await expect(plannedItemsConfirmService.revertOccurrence("occ-1", "household-1", "2026-09")).rejects.toThrow(
      "Cannot revert: month 2026-09 is confirmed, edit the transaction directly instead.",
    );
    expect(mockRevertOccurrence).not.toHaveBeenCalled();
  });
});
