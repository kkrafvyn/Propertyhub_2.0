import { describe, expect, it } from "vitest";

describe("maintenance cost analytics", () => {
  it("separates actual and estimated spend", () => {
    const orders = [{ actual: 2500, estimated: 3000 }, { actual: 1000, estimated: 1000 }];
    expect(orders.reduce((total, order) => total + order.actual, 0)).toBe(3500);
    expect(orders.reduce((total, order) => total + order.estimated, 0)).toBe(4000);
  });
});