// Shared two-level category grouping used everywhere categories are shown
// as expandable main-category groups with subcategories nested underneath
// (the transaction/transfer CategoryPicker, and the wage-flow allocation
// config panel's multi-select category picker).
//
// Only two visual levels are ever rendered (main / sub), matching the
// "select a main category or a subcategory" model these UIs are built
// around. The categories-management screen's own picker allows arbitrary
// nesting depth, though (parent_id is a plain self-referencing FK with no
// depth limit), so a category handed to this helper could in principle sit
// 3+ levels deep. Rather than only grouping by *direct* parent (which would
// make anything past depth 1 vanish -- its parent is a sub-category, not a
// main one, and callers only ever render two levels), every category is
// bucketed under its top-most reachable ancestor within the list. For the
// common 2-level case this produces the exact same grouping as a
// direct-parent check; for deeper data it just means "everything under this
// main" flattens into one sub list instead of silently disappearing.
export function groupCategoriesByParent<T extends { id: string }>(
  categories: T[],
  getParentId: (category: T) => string | null | undefined,
): {
  mainCategories: T[];
  childrenByParent: Map<string, T[]>;
  categoriesById: Map<string, T>;
  rootIdByCategoryId: Map<string, string>;
} {
  const byId = new Map(categories.map((category) => [category.id, category]));

  function findRootId(category: T): string {
    let current = category;
    const seen = new Set<string>();
    while (true) {
      const parentId = getParentId(current);
      if (!parentId || !byId.has(parentId) || seen.has(current.id)) break;
      seen.add(current.id);
      current = byId.get(parentId)!;
    }
    return current.id;
  }

  const rootMap = new Map<string, string>();
  const childrenMap = new Map<string, T[]>();
  const mains: T[] = [];
  for (const category of categories) {
    const rootId = findRootId(category);
    rootMap.set(category.id, rootId);
    if (rootId === category.id) {
      mains.push(category);
    } else {
      const list = childrenMap.get(rootId) ?? [];
      list.push(category);
      childrenMap.set(rootId, list);
    }
  }

  return {
    mainCategories: mains,
    childrenByParent: childrenMap,
    categoriesById: byId,
    rootIdByCategoryId: rootMap,
  };
}
