import type { Ionicons } from "@expo/vector-icons";

// Shared tree data for the category browser (category-browser-sidebar.tsx +
// category-browser-detail-panel.tsx) and the "pick a parent category"
// pickers on the Categories screen. Reshapes the flat categories list into
// type -> main -> sub (however deep parent_id chains actually go):
//   depth 0 "type"     -> income / expense / account
//   depth 1+ "category" -> any category.parent_id chain, however deep
//     (top-level "main" categories are just depth 1; a sub-of-a-sub is
//     depth 3, and so on — there's no hard limit, since the categories
//     table's parent_id is a plain self-referencing FK)

export type ExplorerNodeKind = "type" | "category";
export type CategoryTypeValue = "income" | "expense" | "account";

type CategoryLike = {
  id: string;
  name: string;
  type: CategoryTypeValue;
  icon: string | null;
  parent_id: string | null;
  is_archived?: boolean;
};

export type ExplorerNode = {
  id: string;
  kind: ExplorerNodeKind;
  label: string;
  depth: number;
  parentId: string | null;
  childIds: string[];
  pathLabels: string[];
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  categoryId: string | null;
  categoryType: CategoryTypeValue;
  isArchived: boolean;
};

export type ExplorerTree = {
  nodesById: Map<string, ExplorerNode>;
  order: string[];
  typeOrder: CategoryTypeValue[];
};

const TYPE_ORDER: CategoryTypeValue[] = ["expense", "income", "account"];

type BuildOptions = {
  typeLabels: Record<CategoryTypeValue, string>;
  typeIcons: Record<CategoryTypeValue, keyof typeof Ionicons.glyphMap>;
  typeColors: Record<CategoryTypeValue, string>;
};

export function buildCategoryExplorerTree(categories: CategoryLike[], options: BuildOptions): ExplorerTree {
  // Archived categories stay in the tree (dimmed in the UI) rather than
  // disappearing, so they remain reachable — otherwise there'd be no way to
  // select one and restore it from the detail panel.
  const nodesById = new Map<string, ExplorerNode>();
  const order: string[] = [];

  const byId = new Map(categories.map((category) => [category.id, category] as const));
  const childrenByParentId = new Map<string, CategoryLike[]>();
  const topLevelByType = new Map<CategoryTypeValue, CategoryLike[]>();

  for (const category of categories) {
    const parent = category.parent_id ? byId.get(category.parent_id) : null;
    if (category.parent_id && parent) {
      const list = childrenByParentId.get(category.parent_id) ?? [];
      list.push(category);
      childrenByParentId.set(category.parent_id, list);
    } else {
      // No parent_id, or parent_id points at a category that no longer
      // exists (shouldn't happen — the FK is ON DELETE SET NULL — but fall
      // back to top-level rather than silently dropping the node).
      const list = topLevelByType.get(category.type) ?? [];
      list.push(category);
      topLevelByType.set(category.type, list);
    }
  }

  const typeOrder = TYPE_ORDER.filter((type) => (topLevelByType.get(type) ?? []).length > 0);

  // Recursively walks any category's children (sub, sub-of-sub, ...), so
  // nesting depth is unbounded.
  function buildChildren(
    parentCategory: CategoryLike,
    depth: number,
    pathLabels: string[],
    type: CategoryTypeValue,
  ): string[] {
    const children = childrenByParentId.get(parentCategory.id) ?? [];
    const childIds: string[] = [];

    children.forEach((child) => {
      const node: ExplorerNode = {
        id: child.id,
        kind: "category",
        label: child.name,
        depth,
        parentId: parentCategory.id,
        childIds: [],
        pathLabels: [...pathLabels],
        color: options.typeColors[type],
        icon: (child.icon as keyof typeof Ionicons.glyphMap | null) ?? "ellipse-outline",
        categoryId: child.id,
        categoryType: type,
        isArchived: !!child.is_archived,
      };
      nodesById.set(child.id, node);
      order.push(child.id);
      childIds.push(child.id);

      node.childIds = buildChildren(child, depth + 1, [...pathLabels, child.name], type);
    });

    return childIds;
  }

  typeOrder.forEach((type) => {
    const typeId = `type-${type}`;
    const mains = topLevelByType.get(type) ?? [];

    const typeNode: ExplorerNode = {
      id: typeId,
      kind: "type",
      label: options.typeLabels[type],
      depth: 0,
      parentId: null,
      childIds: [],
      pathLabels: [],
      color: options.typeColors[type],
      icon: options.typeIcons[type],
      categoryId: null,
      categoryType: type,
      isArchived: false,
    };
    nodesById.set(typeId, typeNode);
    order.push(typeId);

    const mainChildIds: string[] = [];

    mains.forEach((main) => {
      const mainNode: ExplorerNode = {
        id: main.id,
        kind: "category",
        label: main.name,
        depth: 1,
        parentId: typeId,
        childIds: [],
        pathLabels: [typeNode.label],
        color: options.typeColors[type],
        icon: (main.icon as keyof typeof Ionicons.glyphMap | null) ?? "pricetag-outline",
        categoryId: main.id,
        categoryType: type,
        isArchived: !!main.is_archived,
      };
      nodesById.set(main.id, mainNode);
      order.push(main.id);
      mainChildIds.push(main.id);

      mainNode.childIds = buildChildren(main, 2, [typeNode.label, main.name], type);
    });

    typeNode.childIds = mainChildIds;
  });

  return { nodesById, order, typeOrder };
}

// Every descendant (children, grandchildren, ...) of a node, used to keep a
// category from being offered as its own parent (directly or via a cycle)
// when picking where to nest it, and to roll up a node's own spending with
// every descendant category's spending in the category browser.
export function getDescendantCategoryIds(tree: ExplorerTree, nodeId: string): Set<string> {
  const result = new Set<string>();
  const node = tree.nodesById.get(nodeId);
  if (!node) return result;

  const stack = [...node.childIds];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    const child = tree.nodesById.get(id);
    if (child) stack.push(...child.childIds);
  }
  return result;
}
