import { describe, expect, it } from "vitest";
import {
  API_KEY_FREE_FEATURES,
  buildAffordabilitySchedule,
  buildHyperlocalSourceSummary,
  buildMediaStudioPlan,
  buildProviderActivationPlan,
  calculatePropertyTaxImpact,
  summarizeApiKeyFreeFeatures,
} from "./feature-completion.service";

describe("feature completion helpers", () => {
  it("summarizes every remaining feature as locally demonstrable without secrets", () => {
    const summary = summarizeApiKeyFreeFeatures();

    expect(summary.total).toBe(API_KEY_FREE_FEATURES.length);
    expect(summary.apiKeyFreeCount).toBe(API_KEY_FREE_FEATURES.length);
    expect(summary.byStatus.available_now).toBeGreaterThan(0);
  });

  it("calculates editable tax and holding-cost estimates with a disclaimer", () => {
    const result = calculatePropertyTaxImpact({
      price: 1_000_000,
      annualRent: 120_000,
      ownershipYears: 3,
      annualPropertyTaxRatePercent: 0.5,
      rentalIncomeTaxPercent: 8,
      maintenanceReservePercent: 1,
    });

    expect(result.estimatedAnnualPropertyTax).toBe(5000);
    expect(result.estimatedAnnualRentalTax).toBe(9600);
    expect(result.holdingPeriodCost).toBe(73_800);
    expect(result.disclaimer).toContain("not tax");
  });

  it("keeps affordability plans locked until provider and legal approval exist", () => {
    const blocked = buildAffordabilitySchedule({
      amount: 12_000,
      cadence: "weekly",
      installments: 4,
      providerConfigured: false,
      legalApproved: false,
    });
    const ready = buildAffordabilitySchedule({
      amount: 12_000,
      cadence: "weekly",
      installments: 4,
      providerConfigured: true,
      legalApproved: true,
    });

    expect(blocked.installmentAmount).toBe(3000);
    expect(blocked.canActivate).toBe(false);
    expect(blocked.activationGaps.length).toBe(2);
    expect(ready.canActivate).toBe(true);
  });

  it("scores rich media readiness and lists missing 3D or livestream tasks", () => {
    const plan = buildMediaStudioPlan({
      mediaTypes: ["video", "floor_plan"],
      hasMeasuredFloorPlan: true,
    });

    expect(plan.score).toBeGreaterThan(0);
    expect(plan.readyForRemoteBuyer).toBe(false);
    expect(plan.missingTasks.map((task) => task.key)).toContain("virtual_tour");
    expect(plan.missingTasks.map((task) => task.key)).toContain("live_open_house");
  });

  it("blocks provider go-live when credentials and evidence are missing", () => {
    const plan = buildProviderActivationPlan({
      provider: "TTLock",
      hasCredentials: false,
      webhookConfigured: true,
      sandboxEvidence: false,
      legalApproved: true,
    });

    expect(plan.canGoLive).toBe(false);
    expect(plan.missing).toContain("Server-side credentials");
    expect(plan.missing).toContain("Sandbox evidence attached");
  });

  it("summarizes hyperlocal source coverage and confidence", () => {
    const summary = buildHyperlocalSourceSummary([
      { sourceKey: "nadmo_flood", label: "NADMO flood history", status: "manual_collection", confidenceScore: 45 },
      { sourceKey: "ecg_power", label: "Power reliability", status: "connected", confidenceScore: 80 },
      { sourceKey: "water", label: "Water reliability", status: "planned" },
    ]);

    expect(summary.connected).toBe(1);
    expect(summary.manual).toBe(1);
    expect(summary.plannedOrStale).toBe(1);
    expect(summary.disclosure).toContain("source");
  });
});
