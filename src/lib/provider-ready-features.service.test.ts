import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCommunityReportPayload,
  buildEditorialDraftPayload,
  buildFeatureOperationEventPayload,
  buildFloorPlanPayload,
  buildNewsletterSubscriberPayload,
  buildNewsletterCampaignPayload,
  buildOpenHouseRegistrationPayload,
  buildOpenHousePayload,
  buildPaymentFallbackFunctionPlan,
  buildSmsUssdRequestPayload,
  buildWalletCheckoutFunctionPlan,
  implementedProviderReadyFunctionNames,
  slugifyTitle,
} from "./provider-ready-features.service";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const migration = read("supabase/migrations/20260521143000_provider_ready_feature_functions.sql");
const operationsMigration = read(
  "supabase/migrations/20260521150000_provider_ready_feature_operations.sql"
);

describe("provider-ready feature function foundations", () => {
  it("creates stable slugs and editorial draft payloads without API keys", () => {
    expect(slugifyTitle("Ghana Flood-Safe Rentals & Offices!")).toBe(
      "ghana-flood-safe-rentals-and-offices"
    );

    const payload = buildEditorialDraftPayload({
      title: "Airport Residential Market Update",
      body: "A short market update for buyers comparing Accra neighborhoods.",
      postType: "market_report",
      city: "Accra",
    });

    expect(payload.post_type).toBe("market_report");
    expect(payload.status).toBe("draft");
    expect(payload.metadata.api_keys_required).toBe(false);
    expect(payload.seo_title).toContain("Airport");
  });

  it("normalizes newsletter consent payloads for later provider sync", () => {
    const payload = buildNewsletterSubscriberPayload({
      email: " Buyer@Example.COM ",
      preferredTopics: ["area_guides"],
    });

    expect(payload.email).toBe("buyer@example.com");
    expect(payload.status).toBe("pending");
    expect(payload.metadata.provider_sync_status).toBe("pending_provider");
  });

  it("builds live open house payloads with manual stream fallback", () => {
    const payload = buildOpenHousePayload({
      listingId: "listing-1",
      organizationId: "org-1",
      title: "Sunday Labone Live Tour",
      startsAt: "2026-06-01T10:00:00.000Z",
      endsAt: "2026-06-01T11:00:00.000Z",
      status: "scheduled",
    });

    expect(payload.status).toBe("scheduled");
    expect(payload.metadata.provider_mode).toBe("provider_pending");
    expect(payload.metadata.api_keys_required).toBe(true);
  });

  it("calculates measured floor plan area from room dimensions", () => {
    const payload = buildFloorPlanPayload({
      listingId: "listing-1",
      rooms: [
        { name: "Living room", length: 5, width: 4 },
        { name: "Bedroom", area: 12 },
      ],
      measurementConfidence: 78,
    });

    expect(payload.total_area).toBe(32);
    expect(payload.room_count).toBe(2);
    expect(payload.measurement_confidence).toBe(78);
  });

  it("keeps SMS and USSD requests pending until a provider key is supplied", () => {
    const payload = buildSmsUssdRequestPayload({
      userId: "user-1",
      channel: "ussd",
      command: "book viewing",
      phone: "+233200000000",
    });

    expect(payload.command).toBe("BOOK VIEWING");
    expect(payload.status).toBe("provider_pending");
    expect(payload.metadata.api_keys_required).toBe(true);
  });

  it("queues newsletter campaigns only when provider credentials are configured", () => {
    const pending = buildNewsletterCampaignPayload({
      title: "Accra Market Digest",
      subject: "What changed this week",
    });
    const queued = buildNewsletterCampaignPayload({
      title: "Accra Market Digest",
      subject: "What changed this week",
      providerKey: "resend",
    });

    expect(pending.status).toBe("provider_pending");
    expect(pending.metadata.api_keys_required).toBe(true);
    expect(queued.status).toBe("queued");
    expect(queued.metadata.provider_sync_status).toBe("queued");
  });

  it("normalizes open house registration, report, and operation payloads", () => {
    const registration = buildOpenHouseRegistrationPayload({
      openHouseEventId: "event-1",
      email: " Buyer@Example.com ",
      fullName: "Aba Mensah",
    });
    const report = buildCommunityReportPayload({
      contributionId: "contribution-1",
      reason: "Spam or unsafe advice",
    });
    const event = buildFeatureOperationEventPayload({
      featureKey: "reviews",
      entityTable: "public_reviews",
      action: "approved",
    });

    expect(registration.email).toBe("buyer@example.com");
    expect(registration.status).toBe("registered");
    expect(report.status).toBe("submitted");
    expect(report.metadata.review_first).toBe(true);
    expect(event.status).toBe("recorded");
  });

  it("plans payment fallback across providers without importing SDK secrets", () => {
    const plan = buildPaymentFallbackFunctionPlan({
      requestedProvider: "stripe",
      currency: "USD",
      configuredProviders: ["paystack"],
    });

    expect(plan.requestedProvider).toBe("stripe");
    expect(plan.firstConfiguredProvider).toBe("paystack");
    expect(plan.fallbackRequired).toBe(true);
  });

  it("gates wallet checkout on device support and provider credentials", () => {
    const plan = buildWalletCheckoutFunctionPlan({
      provider: "stripe",
      wallet: "apple_pay",
      deviceSupported: true,
      providerConfigured: false,
    });

    expect(plan.canAttempt).toBe(false);
    expect(plan.gaps).toContain("Provider credentials must be added server-side.");
  });

  it("adds migration-backed tables and RLS for the new callable feature functions", () => {
    for (const tableName of [
      "editorial_posts",
      "newsletter_subscribers",
      "open_house_events",
      "floor_plan_measurements",
      "sms_ussd_requests",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${tableName}`);
      expect(migration).toContain(`ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY`);
    }

    expect(migration).toContain("private.can_manage_platform()");
    expect(migration).toContain("private.is_organization_member");
    expect(migration).not.toContain("secret_key");
    expect(migration).not.toContain("api_key TEXT");
  });

  it("adds operation tables for moderation, registrations, campaigns, and audit events", () => {
    for (const tableName of [
      "newsletter_campaigns",
      "open_house_registrations",
      "community_reports",
      "feature_operation_events",
    ]) {
      expect(operationsMigration).toContain(`CREATE TABLE IF NOT EXISTS public.${tableName}`);
      expect(operationsMigration).toContain(`'${tableName}'`);
    }

    expect(operationsMigration).toContain("ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY");
    expect(operationsMigration).toContain("Anyone can register for scheduled open houses");
    expect(operationsMigration).toContain("Admins manage community reports");
    expect(operationsMigration).not.toContain("secret_key");
    expect(operationsMigration).not.toContain("api_key TEXT");
  });

  it("documents all callable provider-ready functions for handoff", () => {
    expect(implementedProviderReadyFunctionNames).toEqual(
      expect.arrayContaining([
        "recordFeatureOperationEvent",
        "createEditorialDraft",
        "updateEditorialStatus",
        "subscribeNewsletter",
        "createNewsletterCampaign",
        "createOpenHouseEvent",
        "registerForOpenHouse",
        "saveFloorPlanMeasurement",
        "createSmsUssdRequest",
        "updateSmsUssdRequestStatus",
        "createManualVerificationCheck",
        "updateVerificationCheckStatus",
        "recordAdvancedFraudSignal",
        "reviewAdvancedFraudSignal",
        "createAffordabilityPlan",
        "decideReferralReward",
        "recordHyperlocalImportResult",
        "reviewConstructionProgressUpdate",
        "createContributorProfile",
        "decideContributorPayoutItem",
        "buildPaymentFallbackFunctionPlan",
        "buildWalletCheckoutFunctionPlan",
      ])
    );
  });
});
