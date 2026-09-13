import { describe, expect, it } from "vitest";
import { shouldRequestOwnerExpenseApproval } from "./owner-oversight.service";

describe("owner expense approval thresholds", () => {
  it("skips when approve_expenses is disabled", () => {
    expect(
      shouldRequestOwnerExpenseApproval({
        amountMinor: 500_000,
        autoApproveBelowMinor: 100_000,
        approveExpenses: false,
      }),
    ).toBe(false);
  });

  it("auto-approves amounts below the threshold", () => {
    expect(
      shouldRequestOwnerExpenseApproval({
        amountMinor: 50_000,
        autoApproveBelowMinor: 100_000,
        approveExpenses: true,
      }),
    ).toBe(false);
  });

  it("requests owner approval at or above the auto-approve floor", () => {
    expect(
      shouldRequestOwnerExpenseApproval({
        amountMinor: 100_000,
        autoApproveBelowMinor: 100_000,
        approveExpenses: true,
      }),
    ).toBe(true);
    expect(
      shouldRequestOwnerExpenseApproval({
        amountMinor: 250_000,
        autoApproveBelowMinor: 100_000,
        approveExpenses: true,
      }),
    ).toBe(true);
  });
});
