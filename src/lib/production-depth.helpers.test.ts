import { describe, expect, it } from "vitest";
import {
  buildConciergeResponsePreview,
  buildCrmTaskDrafts,
  buildDefaultEscrowMilestoneDrafts,
  buildPropertyMediaReadiness,
} from "./production-depth.helpers";

describe("production depth helpers", () => {
  it("builds default escrow milestones with sale-specific labels", () => {
    const milestones = buildDefaultEscrowMilestoneDrafts({
      now: new Date("2026-05-16T12:00:00.000Z"),
      dealCase: {
        id: "case-1",
        listing: {
          listing_type: "sale",
          property: { address: "Cantonments Flat" },
        },
      },
    });

    expect(milestones).toHaveLength(6);
    expect(milestones.map((item) => item.milestone_type)).toContain("protected_payment");
    expect(milestones.map((item) => item.label)).toContain("Title and agreement review");
    expect(milestones[0].due_at).toBe("2026-05-17T12:00:00.000Z");
  });

  it("turns CRM signals into dedupe-friendly task drafts", () => {
    const drafts = buildCrmTaskDrafts({
      now: new Date("2026-05-16T12:00:00.000Z"),
      leads: [{ id: "lead-1", lead_name: "Ama", lead_score: 95, source: "referral" }],
      cases: [
        {
          id: "case-1",
          status: "pending",
          priority: "medium",
          created_at: "2026-05-10T12:00:00.000Z",
          updated_at: "2026-05-10T12:00:00.000Z",
          listing: { property: { address: "Airport apartment" } },
        },
      ],
      viewings: [{ id: "viewing-1", status: "requested" }],
      payments: [{ id: "payment-1", status: "pending", purpose: "deposit" }],
    });

    expect(drafts.map((draft) => draft.task_type)).toEqual([
      "hot_lead_follow_up",
      "stale_deal_nudge",
      "viewing_confirmation",
      "payment_follow_up",
    ]);
    expect(drafts[0]).toMatchObject({ priority: "urgent", lead_id: "lead-1" });
  });

  it("scores rich media readiness and produces next actions", () => {
    const readiness = buildPropertyMediaReadiness([
      { media_type: "photo", processing_status: "ready" },
      { media_type: "photo", processing_status: "ready" },
      { media_type: "photo", processing_status: "ready" },
      { media_type: "photo", processing_status: "ready" },
      { media_type: "photo", processing_status: "ready" },
      { media_type: "video", processing_status: "ready" },
      { media_type: "floor_plan", processing_status: "pending" },
    ]);

    expect(readiness.score).toBeGreaterThanOrEqual(60);
    expect(readiness.photos).toBe(5);
    expect(readiness.pendingItems).toBe(1);
    expect(readiness.actions.join(" ")).toContain("Video walkthrough is attached");
  });

  it("builds a deterministic concierge preview", () => {
    const response = buildConciergeResponsePreview({
      prompt: "What should I ask before paying?",
      listing: {
        listing_type: "rental",
        price: 4500,
        property: { address: "Osu studio", city: "Accra" },
      },
    });

    expect(response).toContain("Osu studio");
    expect(response).toContain("deposit handling");
    expect(response).toContain("What should I ask before paying?");
  });
});
