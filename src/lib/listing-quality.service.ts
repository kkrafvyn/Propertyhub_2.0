import { supabase } from "./supabase";
import { ghanaMarketService } from "./ghana-market.service";

export type ListingCheckStatus = "pending" | "passed" | "failed" | "warning";

export interface ListingQualityCheck {
  key: string;
  label: string;
  status: ListingCheckStatus;
  score: number;
  maxScore: number;
  details: string;
}

export interface ListingQualityReport {
  score: number;
  checks: ListingQualityCheck[];
}

export interface ListingQualityInput {
  address?: string | null;
  city?: string | null;
  region?: string | null;
  neighborhood?: string | null;
  ghanaPostGps?: string | null;
  addressVerified?: boolean | null;
  description?: string | null;
  amenities?: string[] | null;
  price?: number | null;
  currency?: string | null;
  mediaCount?: number;
  organizationVerified?: boolean | null;
  listingVerificationStatus?: string | null;
  titleDocumentStatus?: string | null;
  whatsappEnabled?: boolean | null;
  locationConfidence?: number | null;
}

const AUTO_MANAGED_VERIFICATION_STATUSES = new Set(["draft", "submitted"]);

function createCheck(
  key: string,
  label: string,
  score: number,
  maxScore: number,
  details: string,
  status?: ListingCheckStatus
): ListingQualityCheck {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const derivedStatus =
    status || (ratio >= 0.8 ? "passed" : ratio >= 0.45 ? "warning" : "failed");

  return {
    key,
    label,
    status: derivedStatus,
    score,
    maxScore,
    details,
  };
}

function getMediaCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function normalizeTitleStatus(status?: string | null) {
  if (!status) return "missing";
  return status;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export const listingQualityService = {
  evaluate(input: ListingQualityInput): ListingQualityReport {
    const gpsValid = ghanaMarketService.isValidGhanaPostGps(input.ghanaPostGps);
    const locationConfidence =
      input.locationConfidence ??
      ghanaMarketService.calculateLocationConfidence({
        address: input.address,
        city: input.city,
        region: input.region,
        neighborhood: input.neighborhood,
        ghanaPostGps: input.ghanaPostGps,
      });
    const titleStatus = normalizeTitleStatus(input.titleDocumentStatus);
    const descriptionLength = String(input.description || "").trim().length;
    const mediaCount = Number(input.mediaCount || 0);

    const checks: ListingQualityCheck[] = [
      createCheck(
        "verified_agency",
        "Verified agency or owner",
        input.organizationVerified ? 15 : 6,
        15,
        input.organizationVerified
          ? "The listing is attached to a verified organization."
          : "Verify the organization to improve trust.",
        input.organizationVerified ? "passed" : "warning"
      ),
      createCheck(
        "ghana_post_gps",
        "GhanaPostGPS address",
        gpsValid ? 15 : input.ghanaPostGps ? 7 : 0,
        15,
        gpsValid
          ? "The GhanaPostGPS format looks valid."
          : "Add a GhanaPostGPS code such as GA-123-4567.",
        gpsValid ? "passed" : input.ghanaPostGps ? "warning" : "failed"
      ),
      createCheck(
        "address_confidence",
        "Address confidence",
        Math.round((Math.min(locationConfidence, 100) / 100) * 12),
        12,
        `${locationConfidence}% confidence from address, city, region, neighborhood, GPS, and coordinates.`
      ),
      createCheck(
        "photo_pack",
        "Photo pack",
        mediaCount >= 5 ? 14 : mediaCount >= 3 ? 10 : mediaCount >= 1 ? 6 : 0,
        14,
        mediaCount >= 5
          ? "Strong image set for buyer/tenant review."
          : "Add at least five clear photos, including exterior, living area, kitchen, bathroom, and street view."
      ),
      createCheck(
        "description",
        "Description depth",
        descriptionLength >= 180 ? 10 : descriptionLength >= 80 ? 7 : descriptionLength >= 30 ? 4 : 0,
        10,
        descriptionLength >= 180
          ? "Description gives enough context for serious leads."
          : "Add neighborhood context, utilities, restrictions, and standout details."
      ),
      createCheck(
        "price",
        "GHS price clarity",
        input.price && input.price > 0 && (input.currency || "GHS").toUpperCase() === "GHS"
          ? 10
          : input.price && input.price > 0
            ? 6
            : 0,
        10,
        input.price && input.price > 0
          ? "Price is present. Ghana launch listings should default to GHS."
          : "Add a clear asking price before publishing."
      ),
      createCheck(
        "title_or_document",
        "Title or authority evidence",
        ["verified", "signed", "submitted", "in_review"].includes(titleStatus) ? 10 : 2,
        10,
        ["verified", "signed"].includes(titleStatus)
          ? "Document evidence is verified."
          : "Attach title, mandate, lease authority, or owner authorization evidence."
      ),
      createCheck(
        "whatsapp_contact",
        "WhatsApp lead readiness",
        input.whatsappEnabled === false ? 2 : 5,
        5,
        input.whatsappEnabled === false
          ? "WhatsApp is disabled for this listing."
          : "WhatsApp follow-up is enabled for Ghana-market lead handling."
      ),
      createCheck(
        "platform_review",
        "Platform review status",
        input.listingVerificationStatus === "verified"
          ? 9
          : input.listingVerificationStatus === "submitted" ||
              input.listingVerificationStatus === "in_review"
            ? 5
            : 0,
        9,
        input.listingVerificationStatus === "verified"
          ? "The platform review is complete."
          : "Submit this listing for review before scaling promotion."
      ),
    ];

    const score = Math.min(
      100,
      Math.round(checks.reduce((total, check) => total + check.score, 0))
    );

    return { score, checks };
  },

  evaluateListing(listing: any): ListingQualityReport {
    const property = listing?.property || {};
    return this.evaluate({
      address: property.address,
      city: property.city,
      region: property.region,
      neighborhood: property.neighborhood,
      ghanaPostGps: property.ghana_post_gps,
      addressVerified: property.address_verified,
      description: property.description,
      amenities: property.amenities,
      price: listing?.price,
      currency: listing?.currency,
      mediaCount: getMediaCount(property.media),
      organizationVerified: listing?.organization?.verified,
      listingVerificationStatus: listing?.verification_status,
      titleDocumentStatus: listing?.quality_breakdown?.titleDocumentStatus,
      whatsappEnabled: listing?.whatsapp_enabled,
      locationConfidence: property.location_confidence,
    });
  },

  buildQualityBreakdown(input: {
    existingBreakdown?: unknown;
    checks: ListingQualityCheck[];
    checkedAt: string;
    titleDocumentStatus?: string | null;
  }) {
    const existingBreakdown = isObjectRecord(input.existingBreakdown)
      ? input.existingBreakdown
      : {};

    return {
      ...existingBreakdown,
      checks: input.checks,
      evaluatedAt: input.checkedAt,
      titleDocumentStatus:
        input.titleDocumentStatus ??
        normalizeTitleStatus(
          typeof existingBreakdown.titleDocumentStatus === "string"
            ? existingBreakdown.titleDocumentStatus
            : null
        ),
    };
  },

  getAutoVerificationStatus(score: number, currentStatus?: string | null) {
    if (currentStatus && !AUTO_MANAGED_VERIFICATION_STATUSES.has(currentStatus)) {
      return currentStatus;
    }

    return score >= 75 ? "submitted" : "draft";
  },

  async syncListingQuality(listing: any, organizationId: string) {
    const report = this.evaluateListing(listing);
    const checkedAt = new Date().toISOString();
    const qualityBreakdown = this.buildQualityBreakdown({
      existingBreakdown: listing?.quality_breakdown,
      checks: report.checks,
      checkedAt,
    });
    const verificationStatus = this.getAutoVerificationStatus(
      report.score,
      listing?.verification_status
    );

    const { error: listingError } = await supabase
      .from("listings")
      .update({
        quality_score: report.score,
        quality_breakdown: qualityBreakdown,
        last_quality_checked_at: checkedAt,
        verification_status: verificationStatus,
      })
      .eq("id", listing.id);

    if (listingError) throw listingError;

    const { error: checksError } = await supabase.from("listing_verification_checks").upsert(
      report.checks.map((check) => ({
        listing_id: listing.id,
        organization_id: organizationId,
        check_key: check.key,
        label: check.label,
        status: check.status,
        score: check.score,
        details: check.details,
        evidence: {
          maxScore: check.maxScore,
        },
        checked_at: checkedAt,
      })),
      { onConflict: "listing_id,check_key" }
    );

    if (checksError) throw checksError;
    return report;
  },
};
