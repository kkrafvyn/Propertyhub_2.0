import { describe, it, expect } from "vitest";
import { chartOfAccountsService } from "./chart-of-accounts.service";
import { COA_TEMPLATES } from "./coa-templates";

describe("ChartOfAccountsService", () => {
  it("should validate that Ghana Residential COA template contains balanced core assets, liabilities, and revenues", () => {
    const residential = COA_TEMPLATES.residential;
    expect(residential.length).toBeGreaterThanOrEqual(20);

    const assetAccounts = residential.filter((a) => a.type === "ASSET");
    const liabilityAccounts = residential.filter((a) => a.type === "LIABILITY");
    const revenueAccounts = residential.filter((a) => a.type === "REVENUE");

    expect(assetAccounts.length).toBeGreaterThan(0);
    expect(liabilityAccounts.length).toBeGreaterThan(0);
    expect(revenueAccounts.length).toBeGreaterThan(0);

    // Verify presence of mandatory accounts
    const codes = residential.map((a) => a.code);
    expect(codes).toContain("1010"); // Mobile Money Float
    expect(codes).toContain("1110"); // Rent Receivable
    expect(codes).toContain("2100"); // Tenant Security Deposits Liability
    expect(codes).toContain("4010"); // Gross Residential Rent
  });

  it("should enforce input validation when creating an account", async () => {
    await expect(
      chartOfAccountsService.createAccount({
        organizationId: "org-1",
        accountCode: "",
        accountName: "Invalid",
        accountType: "ASSET",
        balanceType: "DEBIT",
      })
    ).rejects.toThrow("Account code is required");

    await expect(
      chartOfAccountsService.createAccount({
        organizationId: "org-1",
        accountCode: "1000",
        accountName: "",
        accountType: "ASSET",
        balanceType: "DEBIT",
      })
    ).rejects.toThrow("Account name is required");
  });
});
