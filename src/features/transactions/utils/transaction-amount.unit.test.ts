import {
  movementAmountColor,
  movementAmountSign,
  movementIconBackground,
  resolveMovementKind,
} from "./transaction-amount";

const colors = {
  destructive: "#d00",
  destructiveSoft: "#fdd",
  success: "#0a0",
  successSoft: "#dfd",
  financialNeutral: "#888",
  surface: "#fff",
};

describe("resolveMovementKind", () => {
  it("reads movement_kind from RPC-shaped movement rows", () => {
    expect(resolveMovementKind({ movement_kind: "expense" })).toBe("expense");
    expect(resolveMovementKind({ movement_kind: "income" })).toBe("income");
    expect(resolveMovementKind({ movement_kind: "transfer" })).toBe(
      "transfer",
    );
  });

  it("falls back to type on raw transactions-table rows without movement_kind", () => {
    expect(resolveMovementKind({ type: "expense" })).toBe("expense");
    expect(resolveMovementKind({ type: "income" })).toBe("income");
  });

  it("prefers movement_kind over type when both are present", () => {
    expect(
      resolveMovementKind({ movement_kind: "expense", type: "income" }),
    ).toBe("expense");
  });

  it("treats anything that isn't expense or transfer as income, including missing data", () => {
    expect(resolveMovementKind({})).toBe("income");
    expect(resolveMovementKind({ movement_kind: null, type: null })).toBe(
      "income",
    );
  });
});

describe("movementAmountSign", () => {
  it("is negative for expenses, positive for income, and blank for transfers", () => {
    expect(movementAmountSign("expense")).toBe("-");
    expect(movementAmountSign("income")).toBe("+");
    expect(movementAmountSign("transfer")).toBe("");
  });
});

describe("movementAmountColor", () => {
  it("maps each kind to the matching theme color", () => {
    expect(movementAmountColor("expense", colors)).toBe(colors.destructive);
    expect(movementAmountColor("income", colors)).toBe(colors.success);
    expect(movementAmountColor("transfer", colors)).toBe(
      colors.financialNeutral,
    );
  });
});

describe("movementIconBackground", () => {
  it("maps each kind to the matching soft/surface background", () => {
    expect(movementIconBackground("expense", colors)).toBe(
      colors.destructiveSoft,
    );
    expect(movementIconBackground("income", colors)).toBe(colors.successSoft);
    expect(movementIconBackground("transfer", colors)).toBe(colors.surface);
  });
});
