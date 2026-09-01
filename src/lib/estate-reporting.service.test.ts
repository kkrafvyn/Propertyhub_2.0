import { describe, expect, it } from "vitest";
import { aggregatePortfolioLedger, mapBudgetVariance } from "./estate-reporting.service";

describe("estate reporting helpers", () => {
  it("aggregates posted ledger lines into P&L and cash flow totals", () => {
    const report = aggregatePortfolioLedger([
      { accountCode: "4000", accountName: "Rent", accountType: "REVENUE", debitMinor: 0, creditMinor: 10000 },
      { accountCode: "5000", accountName: "Repairs", accountType: "EXPENSE", debitMinor: 2500, creditMinor: 0 },
      { accountCode: "1100", accountName: "Bank", accountType: "ASSET", debitMinor: 10000, creditMinor: 2500 },
      { accountCode: "1200", accountName: "Accounts Receivable", accountType: "ASSET", debitMinor: 5000, creditMinor: 0 },
    ]);

    expect(report.revenueMinor).toBe(10000);
    expect(report.expenseMinor).toBe(2500);
    expect(report.netIncomeMinor).toBe(7500);
    expect(report.netCashFlowMinor).toBe(7500);
  });

  it("returns an explicit null percentage when the budget is zero", () => {
    expect(mapBudgetVariance({ category: "Repairs", period: "2026-08", budget_minor: 0, actual_minor: 500, currency: "GHS" })).toMatchObject({
      varianceMinor: -500,
      variancePercent: null,
    });
  });
});