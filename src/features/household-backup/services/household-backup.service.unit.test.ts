import { householdBackupService } from "./household-backup.service";

describe("householdBackupService.parseBackup", () => {
  it("accepts older v1 backups without recurring execution history", () => {
    const backup = householdBackupService.parseBackup({
      schemaVersion: 1,
      exportedAt: "2026-07-10T10:00:00.000Z",
      sourceApp: "SmartFinance",
      household: {},
      members: [],
      accounts: [],
      categories: [],
      savingPots: [],
      savingPotAccounts: [],
      transactions: [],
      recurringTransactions: [],
      monthlyBudget: {
        configs: [],
        rules: [],
        runs: [],
        incomeInputs: [],
      },
      attachments: [],
    });

    expect(backup.recurringRunExecutions).toEqual([]);
  });

  it("rejects backups that do not match the supported schema version", () => {
    expect(() =>
      householdBackupService.parseBackup({
        schemaVersion: 2,
        exportedAt: "2026-07-09T10:00:00.000Z",
        sourceApp: "SmartFinance",
        household: {},
        members: [],
        accounts: [],
        categories: [],
        savingPots: [],
        savingPotAccounts: [],
        transactions: [],
        recurringTransactions: [],
        monthlyBudget: {
          configs: [],
          rules: [],
          runs: [],
          incomeInputs: [],
        },
        attachments: [],
      }),
    ).toThrow();
  });

  it("retains legacy pot destinations when parsing a v1 backup", () => {
    const backup = householdBackupService.parseBackup({
      schemaVersion: 1,
      exportedAt: "2026-07-10T10:00:00.000Z",
      sourceApp: "SmartFinance",
      household: {},
      members: [],
      accounts: [],
      categories: [],
      savingPots: [],
      savingPotAccounts: [],
      transactions: [],
      recurringTransactions: [{ destinationPotKey: "pot_1" }],
      recurringRunExecutions: [],
      monthlyBudget: {
        configs: [],
        rules: [{ destinationPotKey: "pot_1" }],
        runs: [],
        incomeInputs: [],
      },
      attachments: [],
    });

    expect(backup.recurringTransactions[0].destinationPotKey).toBe("pot_1");
    expect(backup.monthlyBudget.rules[0].destinationPotKey).toBe("pot_1");
  });
});
