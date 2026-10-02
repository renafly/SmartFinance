import {
  filterTags,
  normalizeTagName,
  resolveTagPeriodRange,
  rowToTagSummary,
  sortTagSummaries,
  validateTagName,
} from "./tag-view-model";
import type { TagSummary } from "../types";

function summary(overrides: Partial<TagSummary>): TagSummary {
  return {
    id: overrides.id ?? overrides.name ?? "id",
    name: "Tag",
    color: null,
    createdAt: "2026-01-01T00:00:00Z",
    transactionCount: 0,
    grossTotal: 0,
    reimbursedTotal: 0,
    netTotal: 0,
    lastTransactionDate: null,
    ...overrides,
  };
}

describe("normalizeTagName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeTagName("  Travel   to  Bali ")).toBe("Travel to Bali");
  });
});

describe("validateTagName", () => {
  const existing = [
    { id: "a", name: "Travel to Bali" },
    { id: "b", name: "Baby" },
  ];

  it("requires a non-blank name", () => {
    expect(validateTagName("   ", existing)).toBe("required");
  });

  it("rejects names longer than 60 characters", () => {
    expect(validateTagName("x".repeat(61), existing)).toBe("tooLong");
    expect(validateTagName("x".repeat(60), existing)).toBeNull();
  });

  it("rejects case-insensitive duplicates", () => {
    expect(validateTagName(" baby ", existing)).toBe("duplicate");
    expect(validateTagName("travel  TO bali", existing)).toBe("duplicate");
  });

  it("allows renaming a tag to a different casing of its own name", () => {
    expect(validateTagName("BABY", existing, "b")).toBeNull();
  });

  it("accepts a new unique name", () => {
    expect(validateTagName("New Car", existing)).toBeNull();
  });
});

describe("filterTags", () => {
  it("matches case- and accent-insensitively", () => {
    const tags = [{ name: "Férias Algarve" }, { name: "Baby" }];
    expect(filterTags(tags, "ferias")).toEqual([{ name: "Férias Algarve" }]);
    expect(filterTags(tags, "  ")).toHaveLength(2);
  });
});

describe("sortTagSummaries", () => {
  const tags = [
    summary({ id: "1", name: "baby", netTotal: 642.3, transactionCount: 12, createdAt: "2026-03-01T00:00:00Z" }),
    summary({ id: "2", name: "House", netTotal: 4832.4, transactionCount: 37, createdAt: "2026-01-01T00:00:00Z" }),
    summary({ id: "3", name: "Bali", netTotal: 1245.8, transactionCount: 18, createdAt: "2026-05-01T00:00:00Z" }),
  ];

  it("sorts by highest spending", () => {
    expect(sortTagSummaries(tags, "spending").map((t) => t.id)).toEqual(["2", "3", "1"]);
  });

  it("sorts by most transactions", () => {
    expect(sortTagSummaries(tags, "count").map((t) => t.id)).toEqual(["2", "3", "1"]);
  });

  it("sorts by name, case-insensitively", () => {
    expect(sortTagSummaries(tags, "name").map((t) => t.name)).toEqual(["baby", "Bali", "House"]);
  });

  it("sorts by recently created", () => {
    expect(sortTagSummaries(tags, "recent").map((t) => t.id)).toEqual(["3", "1", "2"]);
  });

  it("does not mutate the input", () => {
    const before = tags.map((t) => t.id);
    sortTagSummaries(tags, "spending");
    expect(tags.map((t) => t.id)).toEqual(before);
  });
});

describe("resolveTagPeriodRange", () => {
  it("returns open bounds for all time", () => {
    expect(resolveTagPeriodRange("all", "2026-09", "", "")).toEqual({ from: null, to: null });
  });

  it("covers the whole selected month", () => {
    expect(resolveTagPeriodRange("month", "2026-09", "", "")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(resolveTagPeriodRange("month", "2028-02-15", "", "")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("passes through valid custom dates and ignores partial ones", () => {
    expect(resolveTagPeriodRange("custom", "", "2026-01-01", "2026-0")).toEqual({ from: "2026-01-01", to: null });
  });
});

describe("rowToTagSummary", () => {
  it("coerces numeric strings to money numbers", () => {
    const result = rowToTagSummary({
      tag_id: "t",
      name: "Bali",
      color: null,
      created_by: "u",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      transaction_count: "3" as any,
      gross_total: "100.10" as any,
      reimbursed_total: "20" as any,
      net_total: "80.10" as any,
      last_transaction_date: null,
    });
    expect(result).toMatchObject({ transactionCount: 3, grossTotal: 100.1, reimbursedTotal: 20, netTotal: 80.1 });
  });
});
