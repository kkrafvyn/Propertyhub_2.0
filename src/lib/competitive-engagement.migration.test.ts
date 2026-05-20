import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const migration = read("supabase/migrations/20260520051620_competitive_engagement_features.sql");

describe("competitive engagement migration", () => {
  it("adds moderated marketplace reviews without blockchain dependencies", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_reviews");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.marketplace_review_reports");
    expect(migration).toContain("status IN ('submitted', 'approved', 'rejected', 'reported', 'archived')");
    expect(migration).toContain("verified_source");
    expect(migration).not.toMatch(/polygon|blockchain|web3/i);
  });

  it("extends alerts for visible saved-search and price-drop flows", () => {
    expect(migration).toContain("alert_rules TEXT[]");
    expect(migration).toContain("price_drop_threshold_percent");
    expect(migration).toContain("last_price_drop_at");
    expect(migration).toContain("notification_channels");
  });

  it("extends property media to competitive rich media types", () => {
    for (const mediaType of ["video", "floor_plan", "virtual_tour", "drone", "renovation_before_after"]) {
      expect(migration).toContain(mediaType);
    }
  });

  it("keeps legal-sensitive providers behind readiness gates", () => {
    for (const providerKey of [
      "google_calendar",
      "outlook_calendar",
      "esignature_provider",
      "image_authenticity_ai",
    ]) {
      expect(migration).toContain(providerKey);
    }

    expect(migration).toContain("credentials_pending");
    expect(migration).toContain("legal_gate");
    expect(migration).toContain("human_review");
  });
});
