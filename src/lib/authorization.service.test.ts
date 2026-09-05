import { describe, expect, it } from "vitest";
import { canApproveAmount, getApprovalLimitMinor, resolveWorkOrderApprovalAmountMinor } from "./authorization.service";

describe("authorization.service", () => {
  it("allows owners unlimited finance approval", () => {
    expect(
      canApproveAmount({ role: "owner" }, "finance", 999_999_99),
    ).toBe(true);
    expect(getApprovalLimitMinor({ role: "owner" }, "finance")).toBeNull();
  });

  it("blocks finance officers above their limit", () => {
    expect(
      canApproveAmount(
        {
          role: "finance_officer",
          financeApprovalLimitMinor: 50_000,
        },
        "finance",
        40_000,
      ),
    ).toBe(true);

    expect(
      canApproveAmount(
        {
          role: "finance_officer",
          financeApprovalLimitMinor: 50_000,
        },
        "finance",
        75_000,
      ),
    ).toBe(false);
  });

  it("requires tasks:write for maintenance approval", () => {
    expect(
      canApproveAmount(
        {
          role: "analyst",
          maintenanceApprovalLimitMinor: 100_000,
        },
        "maintenance",
        10_000,
      ),
    ).toBe(false);

    expect(
      canApproveAmount(
        {
          role: "technician",
          maintenanceApprovalLimitMinor: 100_000,
        },
        "maintenance",
        10_000,
      ),
    ).toBe(true);
  });

  it("resolves work order approval amounts by type", () => {
    expect(
      resolveWorkOrderApprovalAmountMinor({
        approvalType: "quote",
        quoteTotalMinor: 12_500,
      }),
    ).toBe(12_500);

    expect(
      resolveWorkOrderApprovalAmountMinor({
        approvalType: "budget",
        estimatedCostMinor: 80_000,
      }),
    ).toBe(80_000);

    expect(
      resolveWorkOrderApprovalAmountMinor({
        approvalType: "completion",
        actualCostMinor: 95_000,
        estimatedCostMinor: 80_000,
      }),
    ).toBe(95_000);
  });
});
