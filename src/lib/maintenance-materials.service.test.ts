import { describe, expect, it } from "vitest";

describe("maintenance material costing", () => {
  it("calculates material totals in minor currency units", () => {
    const materials = [{ quantity: 2, unitCostMinor: 1250 }, { quantity: 1.5, unitCostMinor: 800 }];
    expect(materials.reduce((total, item) => total + item.quantity * item.unitCostMinor, 0)).toBe(3700);
  });
});