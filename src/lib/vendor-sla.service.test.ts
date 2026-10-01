import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: { from: vi.fn() } }));
import { VendorSLAService } from "./vendor-sla.service";

describe("VendorSLAService metrics", () => {
  it("uses actual versus estimated work-order cost and leaves missing cost unknown", () => {
    const service = new VendorSLAService();
    const base = { id: "issue", organization_id: "org", vendor_id: "vendor", created_at: "2026-09-01T00:00:00.000Z", acknowledged_at: "2026-09-01T01:00:00.000Z", resolved_at: "2026-09-01T10:00:00.000Z", sla_resolution_target: "PT48H", status: "resolved" };
    expect(service.calculateVendorMetrics([{ ...base, estate_work_orders: [{ estimated_cost_minor: 10_000, actual_cost_minor: 8_000 }] }]).costPerformance).toBe(125);
    expect(service.calculateVendorMetrics([{ ...base, estate_work_orders: [{ estimated_cost_minor: null, actual_cost_minor: 8_000 }] }]).costPerformance).toBeNull();
  });
});
