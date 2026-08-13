import {
  describeWageFlowCategorySelection,
  type WageFlowCategoryOption,
} from "./wage-flow-config-panel";

// Minimal i18next-shaped `t` stub -- just enough interpolation to exercise
// the real translation strings without pulling in react-i18next.
const templates: Record<string, string> = {
  "insights.wageFlow.noneSelected": "None selected",
  "insights.wageFlow.categoryWithAllSubcategories": "{{name}} (all subcategories)",
  "insights.wageFlow.categoryWithSpecificSubcategories": "{{name}}: {{subcategories}}",
};

function t(key: string, params?: Record<string, unknown>): string {
  let template = templates[key] ?? key;
  if (params) {
    for (const [paramKey, value] of Object.entries(params)) {
      template = template.replace(`{{${paramKey}}}`, String(value));
    }
  }
  return template;
}

const categoryOptions: WageFlowCategoryOption[] = [
  { id: "groceries", name: "Groceries", parentId: null },
  { id: "snacks", name: "Snacks", parentId: "groceries" },
  { id: "drinks", name: "Drinks", parentId: "groceries" },
  { id: "dining-out", name: "Dining Out", parentId: null },
  { id: "takeaway", name: "Takeaway", parentId: "dining-out" },
  { id: "rent", name: "Rent", parentId: null },
];

describe("describeWageFlowCategorySelection", () => {
  it("returns the empty-state label when nothing is selected", () => {
    expect(describeWageFlowCategorySelection([], categoryOptions, t)).toBe("None selected");
  });

  it("describes a whole main category (with children) as including all subcategories", () => {
    expect(describeWageFlowCategorySelection(["groceries"], categoryOptions, t)).toBe(
      "Groceries (all subcategories)",
    );
  });

  it("describes a whole main category with no children as just its plain name", () => {
    expect(describeWageFlowCategorySelection(["rent"], categoryOptions, t)).toBe("Rent");
  });

  it("describes a hand-picked subset of subcategories as belonging to their main, not 'all'", () => {
    expect(describeWageFlowCategorySelection(["snacks", "drinks"], categoryOptions, t)).toBe(
      "Groceries: Snacks, Drinks",
    );
  });

  it("describes a single selected subcategory the same way as a larger subset", () => {
    expect(describeWageFlowCategorySelection(["takeaway"], categoryOptions, t)).toBe(
      "Dining Out: Takeaway",
    );
  });

  it("combines a whole-main group and a partial-subset group from a different main", () => {
    expect(describeWageFlowCategorySelection(["groceries", "takeaway"], categoryOptions, t)).toBe(
      "Groceries (all subcategories), Dining Out: Takeaway",
    );
  });

  it("collapses a main id plus one of its own child ids into a single whole-category label (no duplication)", () => {
    expect(describeWageFlowCategorySelection(["groceries", "snacks"], categoryOptions, t)).toBe(
      "Groceries (all subcategories)",
    );
  });

  it("falls back to the raw id for a category that no longer resolves (e.g. deleted)", () => {
    expect(describeWageFlowCategorySelection(["missing-id"], categoryOptions, t)).toBe(
      "missing-id",
    );
  });
});
