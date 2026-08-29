import { buildPlannedItemForecastContributions } from "./planned-item-forecast-contributions";
import type {
  PlannedItemDestination,
  PlannedItemOccurrence,
  PlannedItemOccurrenceStatus,
  PlannedItemWithDestinations,
} from "../types";

const asOf = new Date(Date.UTC(2026, 6, 29)); // 2026-07-29

function destination(overrides: Partial<PlannedItemDestination> = {}): PlannedItemDestination {
  return {
    id: `dest-${overrides.destinationAccountId ?? "1"}`,
    plannedItemId: "item-1",
    destinationAccountId: "account-1",
    amount: null,
    percent: null,
    categoryId: null,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function item(overrides: Partial<PlannedItemWithDestinations> = {}): PlannedItemWithDestinations {
  return {
    id: "item-1",
    householdId: "household-1",
    name: "Poupança casa",
    direction: "outflow",
    amount: 200,
    sourceAccountId: "checking",
    categoryId: "category-1",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    destinations: [destination()],
    ...overrides,
  };
}

function occurrence(
  status: PlannedItemOccurrenceStatus,
  month: string,
  overrides: Partial<PlannedItemOccurrence> = {},
): PlannedItemOccurrence {
  return {
    id: `occurrence-${month}`,
    plannedItemId: "item-1",
    householdId: "household-1",
    month: `${month}-01`,
    status,
    expectedAmount: 200,
    sourceAccountId: "checking",
    categoryId: "category-1",
    isEstimate: false,
    sourceDefinitionVersion: 1,
    isOverridden: false,
    confirmedAt: null,
    confirmedBy: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildPlannedItemForecastContributions", () => {
  it("projects a single-destination monthly item as due every month, with no settled months", () => {
    const [contribution] = buildPlannedItemForecastContributions({
      plannedItems: [item()],
      occurrences: [],
      asOf,
      horizonMonths: 3,
    });

    expect(contribution.destinationAccountId).toBe("account-1");
    expect(contribution.sourceAccountId).toBe("checking");
    expect(contribution.amount).toBe(200);
    expect(contribution.dueMonthKeys).toEqual(["2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(contribution.skipMonthKeys).toEqual([]);
  });

  it("excludes a month whose occurrence is already confirmed, independent of today's date", () => {
    const contributions = buildPlannedItemForecastContributions({
      plannedItems: [item()],
      occurrences: [occurrence("confirmed", "2026-07")],
      asOf,
      horizonMonths: 2,
    });

    expect(contributions[0].skipMonthKeys).toEqual(["2026-07"]);
  });

  it("excludes a matched, skipped, or cancelled month the same way as a confirmed one", () => {
    for (const status of ["matched", "skipped", "cancelled"] as const) {
      const contributions = buildPlannedItemForecastContributions({
        plannedItems: [item()],
        occurrences: [occurrence(status, "2026-07")],
        asOf,
        horizonMonths: 1,
      });
      expect(contributions[0].skipMonthKeys).toEqual(["2026-07"]);
    }
  });

  it("does not skip a month whose occurrence is still 'planned' (Monthly Budget not run yet)", () => {
    const contributions = buildPlannedItemForecastContributions({
      plannedItems: [item()],
      occurrences: [occurrence("planned", "2026-07")],
      asOf,
      horizonMonths: 1,
    });

    expect(contributions[0].skipMonthKeys).toEqual([]);
  });

  it("re-includes a month after its occurrence is reverted back to 'planned' (Monthly Budget reset)", () => {
    // Simulates revert_monthly_budget_month: the confirmed occurrence row
    // is reset to 'planned' rather than deleted -- the very next read
    // reflects that with no special-casing needed here.
    const confirmed = buildPlannedItemForecastContributions({
      plannedItems: [item()],
      occurrences: [occurrence("confirmed", "2026-07")],
      asOf,
      horizonMonths: 1,
    });
    expect(confirmed[0].skipMonthKeys).toEqual(["2026-07"]);

    const reverted = buildPlannedItemForecastContributions({
      plannedItems: [item()],
      occurrences: [occurrence("planned", "2026-07")],
      asOf,
      horizonMonths: 1,
    });
    expect(reverted[0].skipMonthKeys).toEqual([]);
  });

  it("only projects a specific_months item in its configured months", () => {
    const contributions = buildPlannedItemForecastContributions({
      plannedItems: [
        item({
          recurrenceType: "specific_months",
          recurrenceMonths: [6, 11],
          amount: 4_000,
          allocationMode: "equal_split",
          destinations: [
            destination({ destinationAccountId: "account-1", sortOrder: 0 }),
            destination({ destinationAccountId: "account-2", sortOrder: 1 }),
          ],
        }),
      ],
      occurrences: [],
      asOf,
      horizonMonths: 6,
    });

    // Two destinations, equal split -- €4,000 / 2 = €2,000 each, matching
    // the "Poupança casa" / "Subsídio de Férias e Natal" real-world report
    // this fix was written for: each destination must only ever reflect
    // its own resolved share, never the whole item total.
    expect(contributions).toHaveLength(2);
    for (const contribution of contributions) {
      expect(contribution.amount).toBe(2_000);
      expect(contribution.dueMonthKeys).toEqual(["2026-11"]);
    }
  });

  it("splits equal_split remainder cents onto the last destination", () => {
    const contributions = buildPlannedItemForecastContributions({
      plannedItems: [
        item({
          amount: 100,
          allocationMode: "equal_split",
          destinations: [
            destination({ destinationAccountId: "account-1", sortOrder: 0 }),
            destination({ destinationAccountId: "account-2", sortOrder: 1 }),
            destination({ destinationAccountId: "account-3", sortOrder: 2 }),
          ],
        }),
      ],
      occurrences: [],
      asOf,
      horizonMonths: 0,
    });

    const amounts = contributions
      .sort((a, b) => a.destinationAccountId.localeCompare(b.destinationAccountId))
      .map((c) => c.amount);
    expect(amounts).toEqual([33.33, 33.33, 33.34]);
  });

  it("uses each destination's own custom_amount instead of splitting the item total", () => {
    const contributions = buildPlannedItemForecastContributions({
      plannedItems: [
        item({
          amount: 300,
          allocationMode: "custom_amount",
          destinations: [
            destination({ destinationAccountId: "account-a", sortOrder: 0, amount: 120 }),
            destination({ destinationAccountId: "account-b", sortOrder: 1, amount: 180 }),
          ],
        }),
      ],
      occurrences: [],
      asOf,
      horizonMonths: 0,
    });

    const byAccount = new Map(contributions.map((c) => [c.destinationAccountId, c.amount]));
    expect(byAccount.get("account-a")).toBe(120);
    expect(byAccount.get("account-b")).toBe(180);
  });

  it("skips an inactive item entirely", () => {
    const contributions = buildPlannedItemForecastContributions({
      plannedItems: [item({ isActive: false })],
      occurrences: [],
      asOf,
      horizonMonths: 3,
    });

    expect(contributions).toEqual([]);
  });

  it("skips a plain expense item with no destinations", () => {
    const contributions = buildPlannedItemForecastContributions({
      plannedItems: [item({ destinations: [] })],
      occurrences: [],
      asOf,
      horizonMonths: 3,
    });

    expect(contributions).toEqual([]);
  });

  it("treats an inflow item's destination account as its contribution target, with no source account", () => {
    const contributions = buildPlannedItemForecastContributions({
      plannedItems: [
        item({
          direction: "inflow",
          sourceAccountId: null,
          amount: 1_500,
          destinations: [destination({ destinationAccountId: "checking" })],
        }),
      ],
      occurrences: [],
      asOf,
      horizonMonths: 0,
    });

    expect(contributions[0].sourceAccountId).toBeNull();
    expect(contributions[0].destinationAccountId).toBe("checking");
    expect(contributions[0].amount).toBe(1_500);
  });

  it("keeps two planned items' occurrence history independent, even for the same pot-backing account", () => {
    // "different users contributing to the same pot" -- two separate
    // planned items funding the same destination account, each with its
    // own occurrence status, must never bleed into each other.
    const items = [
      item({ id: "item-a", name: "Renato's contribution" }),
      item({ id: "item-b", name: "Inês's contribution", destinations: [destination({ id: "dest-b" })] }),
    ];

    const contributions = buildPlannedItemForecastContributions({
      plannedItems: items,
      occurrences: [occurrence("confirmed", "2026-07", { plannedItemId: "item-a" })],
      asOf,
      horizonMonths: 0,
    });

    const byItemId = new Map(contributions.map((c) => [c.plannedItemId, c]));
    expect(byItemId.get("item-a")?.skipMonthKeys).toEqual(["2026-07"]);
    expect(byItemId.get("item-b")?.skipMonthKeys).toEqual([]);
  });
});
