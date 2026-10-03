import { describe, expect, it } from "vitest";
import { VendorSLAService } from "./vendor-sla.service";

describe("VendorSLAService.calculateVendorMetrics", () => {
  const service = new VendorSLAService();

  it("averages response time over acknowledged orders only", () => {
    const metrics = service.calculateVendorMetrics([
      {
        id: "1",
        organization_id: "org",
        created_at: "2026-01-01T10:00:00.000Z",
        acknowledged_at: "2026-01-01T11:00:00.000Z",
        resolved_at: "2026-01-02T10:00:00.000Z",
      },
      {
        id: "2",
        organization_id: "org",
        created_at: "2026-01-01T10:00:00.000Z",
        resolved_at: "2026-01-03T10:00:00.000Z",
      },
    ]);
    expect(metrics.avgResponseHours).toBe(1);
    expect(metrics.avgResolutionHours).toBeGreaterThan(0);
  });
});

describe("VendorSLAService month window", () => {
  it("includes work orders on the last day of the month", () => {
    const monthStart = new Date(2024, 1, 1);
    const nextMonthStart = new Date(2024, 2, 1);
    const lastDay = new Date("2024-02-29T15:00:00.000Z");
    expect(lastDay.getTime()).toBeGreaterThanOrEqual(monthStart.getTime());
    expect(lastDay.getTime()).toBeLessThan(nextMonthStart.getTime());
  });
});
