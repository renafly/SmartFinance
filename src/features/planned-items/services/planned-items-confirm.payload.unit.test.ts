jest.mock("@/repositories", () => ({ repositories: { plannedItems: {} } }));

import { resolvePlannedMonth } from "./planned-items-resolver";
import { toTransferPlanPayload } from "./planned-items-confirm.service";
import type { PlannedItemDestination, PlannedItemWithDestinations } from "../types";

function destination(accountId: string, overrides: Partial<PlannedItemDestination> = {}): PlannedItemDestination {
  return {
    id: `dest-${accountId}`,
    plannedItemId: "x",
    destinationAccountId: accountId,
    amount: null,
    percent: null,
    categoryId: null,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function item(overrides: Partial<PlannedItemWithDestinations>): PlannedItemWithDestinations {
  return {
    id: "item",
    householdId: "h",
    name: "Item",
    direction: "outflow",
    amount: 100,
    sourceAccountId: "main",
    categoryId: "cat",
    ownerMemberId: null,
    isEstimate: false,
    allocationMode: "single",
    recurrenceType: "monthly",
    recurrenceMonths: null,
    recurrenceIntervalMonths: null,
    oneTimeMonth: null,
    startMonth: null,
    endMonth: null,
    isActive: true,
    definitionVersion: 1,
    notes: null,
    deletedAt: null,
    createdBy: null,
    createdAt: "",
    updatedAt: "",
    destinations: [],
    ...overrides,
  };
}

describe("toTransferPlanPayload (Monthly Budget save)", () => {
  it("posts income first, then transfers, and never plain recurring expenses", () => {
    const resolved = resolvePlannedMonth({
      householdId: "h",
      month: "2026-09",
      // Alphabetical names put the transfer and the expense before the income on purpose.
      plannedItems: [
        item({ id: "a-savings", name: "A savings", amount: 1000, destinations: [destination("savings")] }),
        item({ id: "b-rent", name: "B rent", amount: 900 }),
        item({ id: "z-salary", name: "Z salary", direction: "inflow", sourceAccountId: null, amount: 5000, destinations: [destination("main")] }),
      ],
      existingOccurrences: [],
      existingOccurrenceDestinations: [],
      accounts: [
        { id: "main", type: "bank" },
        { id: "savings", type: "savings" },
      ],
    });
    // Give every occurrence a fake persisted id (the payload drops id-less legs).
    resolved.occurrences.forEach((entry, index) => {
      entry.occurrence.id = `occ-${index}`;
    });

    const legs = toTransferPlanPayload(resolved.occurrences) as Array<{ role: string; accountId: string; amount: number }>;
    expect(legs.map((leg) => [leg.role, leg.accountId, leg.amount])).toEqual([
      ["income", "main", 5000],
      ["transfer_source", "main", 1000],
      ["transfer_destination", "savings", 1000],
    ]);
  });

  it("posts a grouped movement as one real transfer per destination", () => {
    const resolved = resolvePlannedMonth({
      householdId: "h",
      month: "2026-09",
      plannedItems: [
        item({ id: "salary", name: "Salary", direction: "inflow", sourceAccountId: null, amount: 5000, destinations: [destination("main")] }),
        item({
          id: "investing",
          name: "Investing",
          amount: 600,
          allocationMode: "custom_amount",
          destinations: [
            destination("xtb", { amount: 300, sortOrder: 0 }),
            destination("t212", { amount: 200, sortOrder: 1 }),
            destination("tr", { amount: 100, sortOrder: 2 }),
          ],
        }),
      ],
      existingOccurrences: [],
      existingOccurrenceDestinations: [],
      accounts: ["main", "xtb", "t212", "tr"].map((id) => ({ id, type: "bank" as const })),
    });
    resolved.occurrences.forEach((entry, index) => {
      entry.occurrence.id = `occ-${index}`;
    });
    expect(resolved.occurrences.every((entry) => entry.isValid)).toBe(true);

    const legs = toTransferPlanPayload(resolved.occurrences) as Array<{ role: string; accountId: string; amount: number }>;
    expect(legs.map((leg) => [leg.role, leg.accountId, leg.amount])).toEqual([
      ["income", "main", 5000],
      ["transfer_source", "main", 300],
      ["transfer_destination", "xtb", 300],
      ["transfer_source", "main", 200],
      ["transfer_destination", "t212", 200],
      ["transfer_source", "main", 100],
      ["transfer_destination", "tr", 100],
    ]);
  });
});
