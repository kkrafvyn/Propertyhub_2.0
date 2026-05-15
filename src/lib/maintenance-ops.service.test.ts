import { describe, expect, it } from "vitest";
import { buildMaintenanceSummary, inferVendorCategory } from "./maintenance-ops.service";

describe("maintenance ops helpers", () => {
  it("maps service types onto vendor categories", () => {
    expect(inferVendorCategory("electrical")).toBe("electrician");
    expect(inferVendorCategory("plumbing")).toBe("plumber");
    expect(inferVendorCategory("security")).toBe("security");
  });

  it("summarizes maintenance assignment status and spend", () => {
    const summary = buildMaintenanceSummary([
      { id: "1", status: "pending", cost: 150, property_id: "p1" },
      { id: "2", status: "completed", cost: 400, property_id: "p2" },
      { id: "3", status: "in_progress", cost: null, property_id: "p3" },
    ] as any);

    expect(summary.total).toBe(3);
    expect(summary.pending).toBe(1);
    expect(summary.inProgress).toBe(1);
    expect(summary.completed).toBe(1);
    expect(summary.totalSpend).toBe(550);
  });
});
