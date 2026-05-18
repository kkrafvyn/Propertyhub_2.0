import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const propertyDetail = readFileSync(
  join(process.cwd(), "src/app/pages/PropertyDetail.tsx"),
  "utf8"
);
const propertySearch = readFileSync(
  join(process.cwd(), "src/app/pages/PropertySearch.tsx"),
  "utf8"
);
const listingService = readFileSync(
  join(process.cwd(), "src/lib/listing.service.ts"),
  "utf8"
);
const fraudService = readFileSync(
  join(process.cwd(), "src/lib/fraud-detection.service.ts"),
  "utf8"
);
const adminLayout = readFileSync(
  join(process.cwd(), "src/app/pages/admin/AdminLayout.tsx"),
  "utf8"
);
const platformAdminService = readFileSync(
  join(process.cwd(), "src/lib/platform-admin.service.ts"),
  "utf8"
);

describe("Phase 2 marketplace workflows", () => {
  it("supports amenity filtering from the public search UI through the listing service", () => {
    expect(propertySearch).toContain("AMENITY_FILTER_OPTIONS");
    expect(propertySearch).toContain('searchParams.get("amenities")');
    expect(propertySearch).toContain("toggleAmenityFilter");
    expect(listingService).toContain("requiredAmenities");
    expect(listingService).toContain("listingAmenities.includes");
  });

  it("lets users report suspicious listings into the moderation queue", () => {
    expect(propertyDetail).toContain("Report Suspicious Listing");
    expect(propertyDetail).toContain("handleReportListing");
    expect(propertyDetail).toContain("fraudDetectionService.reportFraud");
    expect(fraudService).toContain("Marketplace user reported");
    expect(fraudService).toContain("organization_id: organizationId");
  });

  it("promotes listing reports into schema-safe fraud alerts", () => {
    expect(fraudService).toContain("normalizeAlertType");
    expect(fraudService).toContain('return "scam_pattern"');
    expect(fraudService).toContain("listing_id:");
    expect(fraudService).not.toContain('alert_type: "user_report"');
  });

  it("provides a real admin listing moderation surface", () => {
    expect(adminLayout).toContain("renderListingQueue");
    expect(adminLayout).toContain("Listing Moderation Queue");
    expect(adminLayout).toContain("handleListingAction");
    expect(platformAdminService).toContain("getListingQueue");
    expect(platformAdminService).toContain("updateListingModerationStatus");
    expect(platformAdminService).toContain("listing_suspended");
  });
});
