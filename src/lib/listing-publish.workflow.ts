import type { Database } from "./database.types";
import { listingService } from "./listing.service";
import { listingQualityService } from "./listing-quality.service";
import { propertyMediaService } from "./property-media.service";
import { propertyService } from "./property.service";
import { legalAcceptanceService } from "./legal-acceptance.service";
import { ACCEPTANCE_SCOPES, LEGAL_POLICY_VERSION } from "./legal-config";

type ListingType = Database["public"]["Tables"]["listings"]["Row"]["listing_type"];
type ListingStatus = Database["public"]["Tables"]["listings"]["Row"]["status"];
type ListingVisibility = Database["public"]["Tables"]["listings"]["Row"]["visibility"];
type PropertyCategory = Database["public"]["Tables"]["properties"]["Row"]["category"];

export type ListingDraftInput = {
  organizationId: string;
  currentUserId: string;
  propertyId?: string | null;
  listingId?: string | null;
  address: string;
  ghanaPostGps?: string | null;
  city: string;
  region: string;
  neighborhood?: string | null;
  country: string;
  subdivisionCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationConfidence?: number | null;
  floodRiskLevel?: string | null;
  category: PropertyCategory;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareMeters?: number | null;
  description?: string | null;
  amenities?: string[] | null;
  listingType: ListingType;
  price: number;
  currency: string;
  status: ListingStatus;
  visibility: ListingVisibility;
  featured: boolean;
  whatsappEnabled: boolean;
  inspectionFeeAmount?: number | null;
  minimumDepositAmount?: number | null;
  titleDocumentStatus?: string;
  qualityReport?: ReturnType<typeof listingQualityService.evaluate>;
  mediaFiles?: File[];
  mediaAltText?: string;
};

export type ListingPublishResult = {
  propertyId: string;
  listingId: string;
  mediaUploadFailed: boolean;
  published: boolean;
};

export async function saveListingDraft(input: ListingDraftInput): Promise<ListingPublishResult> {
  let propertyId = input.propertyId || null;
  let listingId = input.listingId || null;

  if (!propertyId) {
    const property = await propertyService.createProperty({
      organization_id: input.organizationId,
      address: input.address,
      ghana_post_gps: input.ghanaPostGps || null,
      city: input.city,
      region: input.region,
      neighborhood: input.neighborhood || null,
      country: input.country,
      subdivision_code: input.subdivisionCode || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      location_confidence: input.locationConfidence ?? null,
      flood_risk_level: input.floodRiskLevel || "unknown",
      category: input.category,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      square_meters: input.squareMeters ?? null,
      description: input.description || null,
      amenities: input.amenities || null,
    });
    propertyId = property.id;
  }

  const qualityReport = input.qualityReport;
  const draftStatus: ListingStatus = input.status === "listed" || input.status === "pending_review" ? "draft" : input.status;

  if (!listingId) {
    const listing = await listingService.createListing({
      property_id: propertyId,
      organization_id: input.organizationId,
      listing_type: input.listingType,
      price: input.price,
      currency: input.currency,
      status: draftStatus,
      visibility: input.visibility,
      featured: input.featured,
      whatsapp_enabled: input.whatsappEnabled,
      inspection_fee_amount: input.inspectionFeeAmount ?? null,
      minimum_deposit_amount: input.minimumDepositAmount ?? null,
      quality_score: qualityReport?.score,
      quality_breakdown: qualityReport
        ? ({
            checks: qualityReport.checks,
            titleDocumentStatus: input.titleDocumentStatus,
            evaluatedAt: new Date().toISOString(),
          } as any)
        : undefined,
      last_quality_checked_at: qualityReport ? new Date().toISOString() : undefined,
      verification_status: qualityReport && qualityReport.score >= 75 ? "submitted" : "draft",
      published_at: null,
    });
    listingId = listing.id;
  } else {
    await listingService.updateListing(listingId, {
      listing_type: input.listingType,
      price: input.price,
      currency: input.currency,
      status: draftStatus,
      visibility: input.visibility,
      featured: input.featured,
      whatsapp_enabled: input.whatsappEnabled,
      inspection_fee_amount: input.inspectionFeeAmount ?? null,
      minimum_deposit_amount: input.minimumDepositAmount ?? null,
      quality_score: qualityReport?.score,
      verification_status: qualityReport && qualityReport.score >= 75 ? "submitted" : "draft",
    });
  }

  let mediaUploadFailed = false;
  if (input.mediaFiles && input.mediaFiles.length > 0) {
    try {
      await propertyMediaService.uploadPropertyMedia({
        organizationId: input.organizationId,
        propertyId,
        createdBy: input.currentUserId,
        files: input.mediaFiles,
        altText: input.mediaAltText || input.address,
      });
    } catch {
      mediaUploadFailed = true;
    }
  }

  return {
    propertyId,
    listingId,
    mediaUploadFailed,
    published: false,
  };
}

export async function publishListingDraft(input: {
  listingId: string;
  userId: string;
  targetStatus: Extract<ListingStatus, "listed" | "pending_review">;
  publishedAt?: string;
}): Promise<{ listingId: string; published: true }> {
  await listingService.updateListing(input.listingId, {
    status: input.targetStatus,
    published_at: input.publishedAt || new Date().toISOString(),
  });

  if (input.targetStatus === "listed") {
    await legalAcceptanceService.recordAcceptance({
      userId: input.userId,
      scope: "listing_publish",
      policySlugs: ACCEPTANCE_SCOPES.listing_publish.policySlugs,
      policyVersion: LEGAL_POLICY_VERSION,
    });
  }

  return { listingId: input.listingId, published: true };
}
