import { describe, expect, it } from "vitest";
import { allocateOldestFirst, getChargeOutstandingMinor, summarizeEstateLedger } from "./estate-ledger";

describe("estate ledger", () => {
  it("handles partial payment allocations without a paid boolean", () => {
    expect(getChargeOutstandingMinor({ id: "charge", unit_id: "unit", amount_minor: 250000, due_date: "2026-09-01", payment_allocations: [{ amount_minor: 150000 }] })).toBe(100000);
  });

  it("places outstanding balances into the right arrears buckets", () => {
    const summary = summarizeEstateLedger([
      { id: "current", unit_id: "a", amount_minor: 10000, due_date: "2026-08-20" },
      { id: "late", unit_id: "a", amount_minor: 20000, due_date: "2026-07-30" },
      { id: "old", unit_id: "b", amount_minor: 30000, due_date: "2026-04-01" },
    ], new Date("2026-08-15T12:00:00"));

    expect(summary.totalOutstandingMinor).toBe(60000);
    expect(summary.overdueMinor).toBe(50000);
    expect(summary.aging.current).toBe(10000);
    expect(summary.aging.days1To30).toBe(20000);
    expect(summary.aging.days90Plus).toBe(30000);
  });

  it("allocates a partial payment to the oldest open charges first", () => {
    const result = allocateOldestFirst([
      { id: "water", unit_id: "unit", amount_minor: 120000, due_date: "2026-09-01" },
      { id: "penalty", unit_id: "unit", amount_minor: 30000, due_date: "2026-08-15" },
      { id: "service", unit_id: "unit", amount_minor: 250000, due_date: "2026-09-01" },
    ], 300000);

    expect(result.allocations).toEqual([
      { charge_id: "penalty", amount_minor: 30000 },
      { charge_id: "water", amount_minor: 120000 },
      { charge_id: "service", amount_minor: 150000 },
    ]);
    expect(result.unallocatedMinor).toBe(0);
  });
});
