import { describe, expect, it } from "vitest";
import { calculateDepositSettlement } from "./lease-deposit.service";

describe("lease move-out settlement", () => {
  it("returns the remaining deposit after deductions", () => {
    expect(calculateDepositSettlement(10000, 2500)).toEqual({ amountMinor: 10000, deductionsMinor: 2500, refundedMinor: 7500 });
  });

  it("rejects deductions above the deposit", () => {
    expect(() => calculateDepositSettlement(10000, 10001)).toThrow();
  });
});