import { describe, expect, it } from "vitest";
import { calculateWithholdingTax, getInvoiceAging } from "./estate-payables.service";

describe("AP/AR accounting helpers", () => {
  it("calculates withholding tax in minor units", () => {
    expect(calculateWithholdingTax(10000, 8)).toBe(800);
  });
  it("calculates overdue invoice days", () => {
    expect(getInvoiceAging("2026-08-20", new Date("2026-08-26T00:00:00Z"))).toBe(6);
  });
});