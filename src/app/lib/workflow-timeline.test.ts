import { describe, expect, it } from "vitest";
import {
  buildBookingTimeline,
  buildEscrowTimeline,
  buildLeaseTimeline,
  buildMaintenanceTimeline,
  buildPurchaseTimeline,
} from "./workflow-timeline";

describe("workflow-timeline", () => {
  it("builds purchase timeline with counter-offer step", () => {
    const steps = buildPurchaseTimeline(
      { status: "pending", pipeline_stage: "negotiation", created_at: "2026-01-01" },
      undefined,
      { counterOffers: [{ status: "pending" }], checklist: [], pendingDocs: [{ id: "1" }] }
    );

    expect(steps.some((step) => step.label.includes("Counter-offer"))).toBe(true);
    expect(steps.some((step) => step.id === "signing" && step.status === "upcoming")).toBe(true);
  });

  it("builds booking timeline with cancellation refund", () => {
    const steps = buildBookingTimeline({
      status: "cancelled",
      check_in: "2026-08-01",
      check_out: "2026-08-05",
      refund_minor: 85000,
      cancelled_at: "2026-07-20",
    });

    expect(steps.some((step) => step.label.includes("refund"))).toBe(true);
  });

  it("builds lease timeline with signing and renewal", () => {
    const steps = buildLeaseTimeline(
      {
        status: "active",
        signing_status: "signed",
        renewal_status: "requested",
        start_date: "2026-01-01",
      },
      [{ due_date: "2026-08-01", status: "upcoming", amount_minor: 500000 }]
    );

    expect(steps[0]?.id).toBe("signing");
    expect(steps.some((step) => step.id === "renewal" && step.status === "current")).toBe(true);
  });

  it("builds maintenance and escrow timelines", () => {
    expect(
      buildMaintenanceTimeline({ status: "in_progress", created_at: "2026-01-01" }).length
    ).toBeGreaterThan(2);
    expect(buildEscrowTimeline({ status: "held", created_at: "2026-01-01" })[1]?.status).toBe(
      "current"
    );
  });
});
