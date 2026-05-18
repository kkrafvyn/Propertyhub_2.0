import type { Database } from "./database.types";
import { ghanaMarketService } from "./ghana-market.service";
import { listingService } from "./listing.service";
import { marketIntelligenceService } from "./market-intelligence.service";
import { mobileAppService } from "./mobile-app.service";
import { organizationService } from "./organization.service";
import { formatPropertyCategory, normalizePropertyCategory } from "./property-category";
import { getPropertyCoverImage } from "./property-media";
import { savedSearchAlertService } from "./saved-search-alert.service";
import { supabase } from "./supabase";
import { vendorService } from "./vendor.service";

type PublicListing = Awaited<ReturnType<typeof listingService.getPublicListings>>[number];
type BuyerRequestRow = Database["public"]["Tables"]["buyer_requests"]["Row"];
type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];
type OrganizationInsightRow = Database["public"]["Tables"]["organization_insights"]["Row"];
type LocationTrendRow = Database["public"]["Tables"]["location_trends"]["Row"];
type MarketAnalyticsRow = Database["public"]["Tables"]["market_analytics"]["Row"];
type VendorRow = Database["public"]["Tables"]["vendors"]["Row"] & {
  services?: Database["public"]["Tables"]["vendor_services"]["Row"][] | null;
};
type VendorRatingRow = Database["public"]["Tables"]["vendor_ratings"]["Row"];
type AppVersionSnapshot = Awaited<ReturnType<typeof mobileAppService.getAppVersion>>;

const PUBLIC_LISTING_SAMPLE_SIZE = 180;
const PUBLIC_VENDOR_CATEGORIES = [
  "electrician",
  "plumber",
  "cleaner",
  "mover",
  "painter",
  "carpenter",
  "internet_provider",
  "security",
] as const;
const DEMAND_LEVEL_PRIORITY: Record<string, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  very_high: 5,
};

export interface PublicAgencySnapshot {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  verified: boolean;
  verificationStatus: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  serviceAreas: string[];
  publicListingCount: number;
  activeListingCount: number;
  startingPrice: number | null;
  averageTrustScore: number | null;
  publicDocumentCount: number;
  signedDocumentCount: number;
  responseTimeHours: number | null;
  conversionRate: number | null;
  customerSatisfactionScore: number | null;
  projectCount: number;
  trustHighlights: string[];
}

export interface AgencyProfile extends PublicAgencySnapshot {
  organization: OrganizationRow;
  listings: PublicListing[];
  projects: ProjectCollection[];
  publicDocuments: Array<{
    id: string;
    title: string;
    documentType: string;
    status: string;
    signedAt: string | null;
    summary: string | null;
  }>;
}

export interface AreaGuide {
  slug: string;
  title: string;
  city: string;
  region: string;
  neighborhood: string;
  intro: string;
  bestFor: string[];
  highlights: string[];
  caution: string;
  imageUrl: string;
  listingCount: number;
  averagePrice: number | null;
  medianPrice: number | null;
  averageBedrooms: number | null;
  demandLevel: string;
  investmentScore: number | null;
  safetyScore: number | null;
  accessibilityScore: number | null;
  floodRiskLevel: string;
  featuredListings: PublicListing[];
}

export interface MarketTrendSnapshot {
  slug: string;
  title: string;
  city: string;
  region: string;
  guideSlug: string | null;
  searchQuery: string;
  demandLevel: string;
  growthRate: number | null;
  priceTrend: number | null;
  averagePrice: number | null;
  medianPrice: number | null;
  totalListings: number;
  newListings: number;
  investmentScore: number | null;
  safetyScore: number | null;
  accessibilityScore: number | null;
  floodRiskLevel: string;
  notes: string;
}

export interface ProjectCollection {
  slug: string;
  title: string;
  summary: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string | null;
  city: string;
  region: string;
  neighborhood: string | null;
  listingType: string;
  listingCount: number;
  availableUnits: number;
  startingPrice: number | null;
  averagePrice: number | null;
  bedroomMix: string[];
  amenityHighlights: string[];
  trustHighlights: string[];
  heroImage: string;
  listings: PublicListing[];
}

export interface BuyerRequestBoardEntry {
  id: string;
  title: string;
  buyerLabel: string;
  location: string;
  listingType: string;
  propertyType: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  bedrooms: number | null;
  notes: string;
  createdAt: string;
  channel: string | null;
}

export interface PublicVendorReview {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorCategory: string;
  vendorVerified: boolean;
  rating: number;
  reviewText: string;
  reviewerLabel: string;
  createdAt: string | null;
  serviceAreas: string[];
  ratingAverage: number | null;
  totalJobsCompleted: number | null;
  responseTimeMinutes: number | null;
  highlight: string;
}

export interface PublicVendorSpotlight {
  id: string;
  businessName: string;
  businessCategory: string;
  serviceAreas: string[];
  verified: boolean;
  availabilityStatus: string | null;
  ratingAverage: number | null;
  reviewCount: number;
  totalJobsCompleted: number | null;
  responseTimeMinutes: number | null;
  topServices: string[];
  highlight: string;
  standoutQuote: string | null;
}

export interface VendorReputationSnapshot {
  topPartners: PublicVendorSpotlight[];
  testimonials: PublicVendorReview[];
}

export interface PublicAgencyReputationSpotlight {
  id: string;
  slug: string;
  name: string;
  verified: boolean;
  reviewScore: number;
  publicListingCount: number;
  publicDocumentCount: number;
  responseTimeHours: number | null;
  projectCount: number;
  trustHighlights: string[];
  standoutQuote: string;
}

export interface PublicProjectReputationSpotlight {
  slug: string;
  title: string;
  organizationName: string;
  organizationSlug: string | null;
  reviewScore: number;
  listingCount: number;
  availableUnits: number;
  startingPrice: number | null;
  locationLabel: string;
  trustHighlights: string[];
}

export interface PublicReputationSnapshot {
  vendors: VendorReputationSnapshot;
  agencies: PublicAgencyReputationSpotlight[];
  projects: PublicProjectReputationSpotlight[];
}

export interface MobilePlatformSnapshot {
  platform: "ios" | "android";
  label: string;
  latestVersion: string;
  minimumVersion: string;
  updateUrl: string;
  forceUpdate: boolean;
}

export interface MobileExperienceSnapshot {
  platforms: MobilePlatformSnapshot[];
  releaseHeadline: string;
  browserPushLabel: string;
  highlights: string[];
  fieldMoments: string[];
}

export interface ValuationEstimate {
  suggestedAsk: number;
  lowerBound: number;
  upperBound: number;
  confidenceLabel: "Low" | "Medium" | "High";
  comparableCount: number;
  averageComparablePrice: number;
  averagePricePerSquareMeter: number | null;
  demandLevel: string;
  investmentScore: number | null;
  insightNote: string;
  comparables: PublicListing[];
}

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function buildMarketLocationKey(city?: string | null, region?: string | null) {
  return `${normalizeText(city)}::${normalizeText(region)}`;
}

function getDemandLevelPriority(value?: string | null) {
  return DEMAND_LEVEL_PRIORITY[normalizeText(value)] || 0;
}

function getNumericPriority(value?: number | null, fallback = Number.NEGATIVE_INFINITY) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProperty(listing: PublicListing) {
  return (listing.property || null) as
    | (Database["public"]["Tables"]["properties"]["Row"] & {
        media?: Database["public"]["Tables"]["property_media"]["Row"][] | null;
      })
    | null;
}

function getOrganizationMeta(listing: PublicListing) {
  return (listing.organization || null) as
    | {
        name?: string | null;
        slug?: string | null;
        verified?: boolean | null;
        logo_url?: string | null;
      }
    | null;
}

function extractListingArea(listing: PublicListing) {
  const property = getProperty(listing);
  const neighborhood = property?.neighborhood || null;
  const city = property?.city || null;
  const region = property?.region || null;

  return {
    neighborhood,
    city,
    region,
    label: neighborhood || city || region || "Ghana",
  };
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function humanizeLabel(value?: string | null) {
  const cleaned = String(value || "")
    .trim()
    .replace(/[_-]+/g, " ");

  if (!cleaned) {
    return "Property service";
  }

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function dedupeVendors(vendors: VendorRow[]) {
  const unique = new Map<string, VendorRow>();

  vendors.forEach((vendor) => {
    if (!vendor?.id || unique.has(vendor.id)) return;
    unique.set(vendor.id, vendor);
  });

  return [...unique.values()];
}

function getVendorHighlight(vendor: VendorRow) {
  if (vendor.response_time_minutes && vendor.response_time_minutes > 0) {
    return `Replies in about ${vendor.response_time_minutes} minutes`;
  }

  if (vendor.total_jobs_completed && vendor.total_jobs_completed > 0) {
    return `${vendor.total_jobs_completed} completed jobs`;
  }

  if (vendor.service_areas?.length) {
    return `Covers ${vendor.service_areas.slice(0, 2).join(", ")}`;
  }

  return vendor.verified ? "Verified service partner" : "Active service partner";
}

export function buildPublicVendorTestimonials(
  vendors: VendorRow[],
  ratingsByVendor: Record<string, VendorRatingRow[]>,
  limit = 6
) {
  return dedupeVendors(vendors)
    .map((vendor) => {
      const standoutReview = [...(ratingsByVendor[vendor.id] || [])]
        .filter((rating) => rating.review_text?.trim())
        .sort((a, b) => {
          if (Number(b.rating || 0) !== Number(a.rating || 0)) {
            return Number(b.rating || 0) - Number(a.rating || 0);
          }

          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        })[0];

      if (!standoutReview?.review_text?.trim()) {
        return null;
      }

      return {
        id: standoutReview.id,
        vendorId: vendor.id,
        vendorName: vendor.business_name,
        vendorCategory: humanizeLabel(vendor.business_category),
        vendorVerified: Boolean(vendor.verified),
        rating: Number(standoutReview.rating || vendor.rating_avg || 0),
        reviewText: standoutReview.review_text.trim(),
        reviewerLabel: standoutReview.assignment_id ? "Verified job client" : "Recent client",
        createdAt: standoutReview.created_at,
        serviceAreas: vendor.service_areas || [],
        ratingAverage: vendor.rating_avg,
        totalJobsCompleted: vendor.total_jobs_completed,
        responseTimeMinutes: vendor.response_time_minutes,
        highlight: getVendorHighlight(vendor),
      } satisfies PublicVendorReview;
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }

      if (Number(b.ratingAverage || 0) !== Number(a.ratingAverage || 0)) {
        return Number(b.ratingAverage || 0) - Number(a.ratingAverage || 0);
      }

      if (Number(b.totalJobsCompleted || 0) !== Number(a.totalJobsCompleted || 0)) {
        return Number(b.totalJobsCompleted || 0) - Number(a.totalJobsCompleted || 0);
      }

      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    })
    .slice(0, limit);
}

function buildPublicVendorSpotlights(
  vendors: VendorRow[],
  ratingsByVendor: Record<string, VendorRatingRow[]>,
  limit = 8
) {
  return dedupeVendors(vendors)
    .map((vendor) => {
      const ratings = ratingsByVendor[vendor.id] || [];
      const standoutQuote =
        ratings.find((rating) => rating.review_text?.trim())?.review_text?.trim() || null;

      return {
        id: vendor.id,
        businessName: vendor.business_name,
        businessCategory: humanizeLabel(vendor.business_category),
        serviceAreas: vendor.service_areas || [],
        verified: Boolean(vendor.verified),
        availabilityStatus: vendor.availability_status,
        ratingAverage: vendor.rating_avg,
        reviewCount: ratings.filter((rating) => typeof rating.rating === "number").length,
        totalJobsCompleted: vendor.total_jobs_completed,
        responseTimeMinutes: vendor.response_time_minutes,
        topServices: uniqueStrings((vendor.services || []).map((service) => service.service_name)).slice(0, 3),
        highlight: getVendorHighlight(vendor),
        standoutQuote,
      } satisfies PublicVendorSpotlight;
    })
    .sort((a, b) => {
      if (Number(b.ratingAverage || 0) !== Number(a.ratingAverage || 0)) {
        return Number(b.ratingAverage || 0) - Number(a.ratingAverage || 0);
      }

      if (b.reviewCount !== a.reviewCount) {
        return b.reviewCount - a.reviewCount;
      }

      return Number(b.totalJobsCompleted || 0) - Number(a.totalJobsCompleted || 0);
    })
    .slice(0, limit);
}

export function buildMobileExperienceSnapshot(
  iosVersion: AppVersionSnapshot,
  androidVersion: AppVersionSnapshot
) {
  const platforms = [
    {
      platform: "ios",
      label: "iPhone & iPad",
      latestVersion: iosVersion.latest_version,
      minimumVersion: iosVersion.minimum_version,
      updateUrl: iosVersion.update_url,
      forceUpdate: Boolean(iosVersion.force_update),
    },
    {
      platform: "android",
      label: "Android phones",
      latestVersion: androidVersion.latest_version,
      minimumVersion: androidVersion.minimum_version,
      updateUrl: androidVersion.update_url,
      forceUpdate: Boolean(androidVersion.force_update),
    },
  ] satisfies MobilePlatformSnapshot[];

  return {
    platforms,
    releaseHeadline: `Current public builds are iOS ${iosVersion.latest_version} and Android ${androidVersion.latest_version}.`,
    browserPushLabel: "Browser push is also available for fast lead, deal-room, and workspace follow-up.",
    highlights: [
      "Saved searches, referrals, and compare lists stay connected between desktop and phone.",
      "Deal rooms, offers, receipts, and viewing follow-up are easier to handle in the field.",
      "Release channels for iOS and Android give the app a clearer public install story.",
    ],
    fieldMoments: [
      "Open saved alerts during commutes or site visits.",
      "Jump from a listing into compare, buyer tools, and live deal tracking.",
      "Keep receipts, notes, and negotiation history close without going back to a laptop.",
    ],
  } satisfies MobileExperienceSnapshot;
}

function summarizeBedroomMix(listings: PublicListing[]) {
  const counts = uniqueStrings(
    listings.map((listing) => {
      const bedrooms = getProperty(listing)?.bedrooms;
      return bedrooms ? `${bedrooms}-bed` : null;
    })
  );

  return counts.slice(0, 4);
}

function summarizeAmenities(listings: PublicListing[]) {
  const amenityCounts = new Map<string, number>();

  listings.forEach((listing) => {
    const amenities = getProperty(listing)?.amenities || [];
    amenities.forEach((amenity) => {
      amenityCounts.set(amenity, (amenityCounts.get(amenity) || 0) + 1);
    });
  });

  return [...amenityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([amenity]) => amenity);
}

function getTrustHighlights(input: {
  verified?: boolean | null;
  documentCount?: number;
  averageTrustScore?: number | null;
  responseTimeHours?: number | null;
  customerSatisfactionScore?: number | null;
}) {
  const highlights = [
    input.verified ? "Verified organization" : null,
    input.documentCount ? `${input.documentCount} public trust document${input.documentCount === 1 ? "" : "s"}` : null,
    input.averageTrustScore != null ? `Average listing trust ${Math.round(input.averageTrustScore)}/100` : null,
    input.responseTimeHours != null && input.responseTimeHours > 0
      ? `Average response in ${Math.round(input.responseTimeHours)}h`
      : null,
    input.customerSatisfactionScore != null && input.customerSatisfactionScore > 0
      ? `Customer satisfaction ${input.customerSatisfactionScore.toFixed(1)}/5`
      : null,
  ];

  return highlights.filter(Boolean) as string[];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseTrustScoreFromHighlights(highlights: string[]) {
  const trustLine = highlights.find((highlight) => /(\d+)\/100/.test(highlight));
  const match = trustLine?.match(/(\d+)\/100/);
  return match ? Number(match[1]) : null;
}

export function calculatePublicReputationScore(input: {
  verified?: boolean | null;
  averageTrustScore?: number | null;
  customerSatisfactionScore?: number | null;
  responseTimeHours?: number | null;
  documentCount?: number;
  listingCount?: number;
}) {
  let score = 32;

  if (input.verified) score += 14;
  if (input.averageTrustScore != null) score += (input.averageTrustScore / 100) * 30;
  if (input.customerSatisfactionScore != null) score += (input.customerSatisfactionScore / 5) * 12;
  if (input.responseTimeHours != null && input.responseTimeHours > 0) {
    score += Math.max(0, 12 - Math.min(12, input.responseTimeHours));
  }
  score += Math.min(8, Number(input.documentCount || 0) * 2);
  score += Math.min(6, Number(input.listingCount || 0));

  return clampScore(score);
}

export function buildAgencyReputationSpotlights(
  agencies: PublicAgencySnapshot[],
  limit = 6
) {
  return [...agencies]
    .map((agency) => ({
      id: agency.id,
      slug: agency.slug,
      name: agency.name,
      verified: agency.verified,
      reviewScore: calculatePublicReputationScore({
        verified: agency.verified,
        averageTrustScore: agency.averageTrustScore,
        customerSatisfactionScore: agency.customerSatisfactionScore,
        responseTimeHours: agency.responseTimeHours,
        documentCount: agency.publicDocumentCount,
        listingCount: agency.publicListingCount,
      }),
      publicListingCount: agency.publicListingCount,
      publicDocumentCount: agency.publicDocumentCount,
      responseTimeHours: agency.responseTimeHours,
      projectCount: agency.projectCount,
      trustHighlights: agency.trustHighlights.slice(0, 4),
      standoutQuote:
        agency.customerSatisfactionScore != null && agency.customerSatisfactionScore > 0
          ? `${agency.customerSatisfactionScore.toFixed(1)}/5 customer satisfaction backed by live trust signals.`
          : agency.trustHighlights[0] || "Active public trust signals on live listings.",
    }))
    .sort((a, b) => b.reviewScore - a.reviewScore)
    .slice(0, limit);
}

export function buildProjectReputationSpotlights(
  projects: ProjectCollection[],
  limit = 6
) {
  return [...projects]
    .map((project) => {
      const trustScore = parseTrustScoreFromHighlights(project.trustHighlights);
      const demandWeight = project.trustHighlights.some((highlight) => /demand/i.test(highlight)) ? 10 : 0;

      return {
        slug: project.slug,
        title: project.title,
        organizationName: project.organizationName,
        organizationSlug: project.organizationSlug,
        reviewScore: clampScore(
          34 +
            Number(project.availableUnits || 0) +
            Number(project.listingCount || 0) * 2 +
            Number(trustScore || 0) * 0.45 +
            demandWeight
        ),
        listingCount: project.listingCount,
        availableUnits: project.availableUnits,
        startingPrice: project.startingPrice,
        locationLabel: [project.neighborhood, project.city, project.region].filter(Boolean).join(", "),
        trustHighlights: project.trustHighlights.slice(0, 4),
      } satisfies PublicProjectReputationSpotlight;
    })
    .sort((a, b) => b.reviewScore - a.reviewScore)
    .slice(0, limit);
}

export function groupListingsIntoProjects(listings: PublicListing[]) {
  const groups = new Map<string, PublicListing[]>();

  listings.forEach((listing) => {
    const property = getProperty(listing);
    const organization = getOrganizationMeta(listing);
    const area = extractListingArea(listing);
    const key = [
      listing.organization_id,
      area.neighborhood || area.city || area.region || "ghana",
      listing.listing_type,
    ]
      .map((value) => normalizeText(String(value || "")))
      .join("::");

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push({
      ...listing,
      organization: {
        name: organization?.name || null,
        slug: organization?.slug || null,
        verified: organization?.verified || null,
        logo_url: organization?.logo_url || null,
      },
      property,
    } as PublicListing);
  });

  return [...groups.values()]
    .map((group) => {
      const lead = group[0];
      const property = getProperty(lead);
      const organization = getOrganizationMeta(lead);
      const area = extractListingArea(lead);
      const prices = group.map((item) => Number(item.price || 0)).filter((value) => value > 0);
      const qualityScores = group
        .map((item) => item.quality_score)
        .filter((value): value is number => typeof value === "number");
      const locationInsight = ghanaMarketService.getLocationInsight(
        property?.city,
        property?.region,
        property?.neighborhood
      );

      return {
        slug: slugify(
          `${organization?.name || "project"} ${area.label} ${lead.listing_type || "collection"}`
        ),
        title: `${area.label} ${lead.listing_type === "sale" ? "Development" : "Collection"}`,
        summary: `${group.length} active ${lead.listing_type === "sale" ? "sale" : lead.listing_type} opportunit${group.length === 1 ? "y" : "ies"} in ${area.label}.`,
        organizationId: lead.organization_id,
        organizationName: organization?.name || "BaytMiftah Partner",
        organizationSlug: organization?.slug || null,
        city: property?.city || "Unknown city",
        region: property?.region || "Unknown region",
        neighborhood: property?.neighborhood || null,
        listingType: lead.listing_type,
        listingCount: group.length,
        availableUnits: group.length,
        startingPrice: prices.length ? Math.min(...prices) : null,
        averagePrice: average(prices),
        bedroomMix: summarizeBedroomMix(group),
        amenityHighlights: summarizeAmenities(group),
        trustHighlights: uniqueStrings([
          organization?.verified ? "Verified operator" : null,
          qualityScores.length ? `Average trust ${Math.round(average(qualityScores) || 0)}/100` : null,
          locationInsight?.floodRiskLevel === "low" ? "Lower flood-risk location" : null,
          locationInsight?.demandLevel ? `${locationInsight.demandLevel.replaceAll("_", " ")} demand` : null,
        ]).slice(0, 4),
        heroImage:
          getProperty(lead)?.media?.[0]?.public_url ||
          "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1400&q=80",
        listings: group,
      } satisfies ProjectCollection;
    })
    .sort((a, b) => {
      if (b.listingCount !== a.listingCount) return b.listingCount - a.listingCount;
      return Number(b.startingPrice || 0) - Number(a.startingPrice || 0);
    });
}

function buildAreaGuideSlug(input: {
  city?: string | null;
  region?: string | null;
  neighborhood?: string | null;
}) {
  if (input.neighborhood) {
    return slugify(`${input.neighborhood}-${input.city}`);
  }

  return slugify([input.city, input.region].filter(Boolean).join("-"));
}

function buildAreaGuideIntro(input: {
  city: string;
  neighborhood: string;
  listingCount: number;
  dominantCategory: string | null;
  dominantListingType: string | null;
  note: string | null;
}) {
  const demandCopy =
    input.dominantListingType === "sale"
      ? "buyer demand"
      : input.dominantListingType === "lease"
        ? "lease demand"
        : "rental demand";

  const listingCopy =
    input.listingCount === 1
      ? "1 public listing"
      : `${input.listingCount} public listings`;

  const categoryCopy = input.dominantCategory
    ? `${formatPropertyCategory(input.dominantCategory).toLowerCase()} inventory`
    : "active marketplace inventory";

  return (
    input.note ||
    `${input.neighborhood} in ${input.city} currently shows ${listingCopy}, led by ${categoryCopy} and ${demandCopy} in the public marketplace.`
  );
}

function buildAreaGuideBestFor(listings: PublicListing[], demandLevel?: string | null) {
  const categories = uniqueStrings(
    listings.map((listing) => {
      const category = normalizePropertyCategory(getProperty(listing)?.category);
      return category ? `${formatPropertyCategory(category)} seekers` : null;
    })
  );
  const listingTypes = new Set(listings.map((listing) => listing.listing_type));
  const audience = [
    listingTypes.has("sale") ? "Buyers" : null,
    listingTypes.has("rental") ? "Renters" : null,
    listingTypes.has("lease") ? "Lease clients" : null,
    demandLevel === "high" || demandLevel === "very_high" ? "Momentum investors" : null,
  ];

  return uniqueStrings([...categories, ...audience]).slice(0, 3);
}

function buildAreaGuideHighlights(
  listings: PublicListing[],
  insight: ReturnType<typeof ghanaMarketService.getLocationInsight>
) {
  const amenities = summarizeAmenities(listings).slice(0, 2);

  return uniqueStrings([
    insight?.accessibilityScore && insight.accessibilityScore >= 4
      ? "Strong access score for daily movement"
      : null,
    insight?.safetyScore && insight.safetyScore >= 4 ? "Higher safety profile in current signals" : null,
    amenities.length > 0 ? `Common amenities: ${amenities.join(", ")}` : null,
    listings.length > 0 ? `${listings.length} active public listings right now` : null,
    insight?.notes || null,
  ]).slice(0, 3);
}

function buildAreaGuideCaution(input: {
  floodRiskLevel?: string | null;
  listingCount: number;
  demandLevel?: string | null;
}) {
  if (input.floodRiskLevel === "high") {
    return "Flood-risk checks should be part of due diligence before paying a deposit or booking fee.";
  }

  if (input.floodRiskLevel === "medium") {
    return "Review drainage, road access, and rainy-season history before committing to a move.";
  }

  if (input.listingCount < 3) {
    return "Public inventory is still light here, so compare older comps and ask for extra documentation.";
  }

  if (input.demandLevel === "very_high") {
    return "High demand can tighten negotiation windows, so confirm documents and viewing availability early.";
  }

  return "Pair pricing with trust documents, quality scores, and location access checks before you decide.";
}

function mapBuyerRequestRow(row: BuyerRequestRow): BuyerRequestBoardEntry {
  return {
    id: row.id,
    title: row.title,
    buyerLabel: row.buyer_label,
    location: row.location,
    listingType: row.listing_type,
    propertyType: row.property_type,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    bedrooms: row.bedrooms,
    notes: row.notes,
    createdAt: row.created_at,
    channel: row.channel,
  };
}

export function buildAreaGuidesFromListings(listings: PublicListing[]) {
  const grouped = new Map<
    string,
    {
      city: string;
      region: string;
      neighborhood: string;
      listings: PublicListing[];
    }
  >();

  listings.forEach((listing) => {
    const property = getProperty(listing);
    const city = property?.city?.trim();
    const region = property?.region?.trim();
    const neighborhood = property?.neighborhood?.trim() || city;

    if (!city || !region || !neighborhood) return;

    const key = normalizeText([neighborhood, city, region].join("::"));
    const bucket = grouped.get(key) || {
      city,
      region,
      neighborhood,
      listings: [],
    };

    bucket.listings.push(listing);
    grouped.set(key, bucket);
  });

  return [...grouped.values()]
    .map((bucket) => {
      const prices = bucket.listings
        .map((listing) => Number(listing.price || 0))
        .filter((value) => value > 0);
      const bedrooms = bucket.listings
        .map((listing) => getProperty(listing)?.bedrooms)
        .filter((value): value is number => typeof value === "number");
      const dominantCategory =
        bucket.listings
          .map((listing) => normalizePropertyCategory(getProperty(listing)?.category))
          .filter(Boolean)
          .sort(
            (a, b) =>
              bucket.listings.filter((listing) => normalizePropertyCategory(getProperty(listing)?.category) === b)
                .length -
              bucket.listings.filter((listing) => normalizePropertyCategory(getProperty(listing)?.category) === a)
                .length
          )[0] || null;
      const dominantListingType =
        bucket.listings
          .map((listing) => listing.listing_type)
          .sort(
            (a, b) =>
              bucket.listings.filter((listing) => listing.listing_type === b).length -
              bucket.listings.filter((listing) => listing.listing_type === a).length
          )[0] || null;
      const insight =
        ghanaMarketService.getLocationInsight(bucket.city, bucket.region, bucket.neighborhood) ||
        ghanaMarketService.getLocationInsight(bucket.city, bucket.region, null);

      return {
        slug: buildAreaGuideSlug(bucket),
        title: `${bucket.neighborhood} Area Guide`,
        city: bucket.city,
        region: bucket.region,
        neighborhood: bucket.neighborhood,
        intro: buildAreaGuideIntro({
          city: bucket.city,
          neighborhood: bucket.neighborhood,
          listingCount: bucket.listings.length,
          dominantCategory,
          dominantListingType,
          note: insight?.notes || null,
        }),
        bestFor: buildAreaGuideBestFor(bucket.listings, insight?.demandLevel),
        highlights: buildAreaGuideHighlights(bucket.listings, insight),
        caution: buildAreaGuideCaution({
          floodRiskLevel: insight?.floodRiskLevel,
          listingCount: bucket.listings.length,
          demandLevel: insight?.demandLevel,
        }),
        imageUrl: getPropertyCoverImage(getProperty(bucket.listings[0])),
        listingCount: bucket.listings.length,
        averagePrice: average(prices),
        medianPrice: median(prices),
        averageBedrooms: average(bedrooms),
        demandLevel: insight?.demandLevel || "medium",
        investmentScore: insight?.investmentScore || null,
        safetyScore: insight?.safetyScore || null,
        accessibilityScore: insight?.accessibilityScore || null,
        floodRiskLevel: insight?.floodRiskLevel || "unknown",
        featuredListings: bucket.listings.slice(0, 3),
      } satisfies AreaGuide;
    })
    .sort((a, b) => {
      if (b.listingCount !== a.listingCount) {
        return b.listingCount - a.listingCount;
      }

      return Number(b.averagePrice || 0) - Number(a.averagePrice || 0);
    });
}

function buildMarketNote(
  trend: LocationTrendRow | null,
  analytics: MarketAnalyticsRow | null,
  areaGuide?: AreaGuide | null
) {
  if (analytics?.price_trend != null && analytics.price_trend > 0) {
    return `Average prices are trending up by about ${analytics.price_trend.toFixed(1)}% in the latest snapshot.`;
  }

  if (trend?.trending_up) {
    return `${trend.city} is currently marked as a rising opportunity area in workspace analytics.`;
  }

  if (areaGuide) {
    return areaGuide.intro;
  }

  return "Use recent supply, trust, and access signals together before setting pricing expectations.";
}

function compareMarketTrendSnapshots(a: MarketTrendSnapshot, b: MarketTrendSnapshot) {
  const growthDiff = getNumericPriority(b.growthRate) - getNumericPriority(a.growthRate);
  if (growthDiff !== 0) return growthDiff;

  const demandDiff = getDemandLevelPriority(b.demandLevel) - getDemandLevelPriority(a.demandLevel);
  if (demandDiff !== 0) return demandDiff;

  const investmentDiff =
    getNumericPriority(b.investmentScore) - getNumericPriority(a.investmentScore);
  if (investmentDiff !== 0) return investmentDiff;

  const listingDiff = (b.totalListings || 0) - (a.totalListings || 0);
  if (listingDiff !== 0) return listingDiff;

  return getNumericPriority(b.averagePrice, 0) - getNumericPriority(a.averagePrice, 0);
}

function normalizeBuyerLabel(value?: string | null) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "Anonymous buyer";

  const firstToken = trimmed.split(/\s+/)[0];
  return firstToken.length > 1 ? `${firstToken} buyer` : "Anonymous buyer";
}

export function estimateValueFromComparables(input: {
  city: string;
  region?: string | null;
  neighborhood?: string | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareMeters?: number | null;
  listings: PublicListing[];
}) {
  const saleListings = input.listings.filter((listing) => listing.listing_type === "sale");
  const scoredComparables = saleListings
    .map((listing) => {
      const property = getProperty(listing);
      if (!property) return null;

      let score = 0;
      if (normalizeText(property.city) === normalizeText(input.city)) score += 35;
      if (normalizeText(property.region) === normalizeText(input.region)) score += 10;
      if (
        input.neighborhood &&
        normalizeText(property.neighborhood) === normalizeText(input.neighborhood)
      ) {
        score += 25;
      }
      if (
        input.propertyType &&
        normalizeText(property.category) === normalizeText(input.propertyType)
      ) {
        score += 18;
      }
      if (input.bedrooms != null && property.bedrooms != null) {
        const diff = Math.abs(property.bedrooms - input.bedrooms);
        score += diff === 0 ? 8 : diff === 1 ? 4 : 0;
      }
      if (input.bathrooms != null && property.bathrooms != null) {
        const diff = Math.abs(property.bathrooms - input.bathrooms);
        score += diff === 0 ? 6 : diff === 1 ? 3 : 0;
      }
      if (input.squareMeters && property.square_meters) {
        const ratio = Math.abs(property.square_meters - input.squareMeters) / input.squareMeters;
        score += ratio <= 0.15 ? 14 : ratio <= 0.3 ? 8 : ratio <= 0.45 ? 4 : 0;
      }

      return score >= 28 ? { listing, score } : null;
    })
    .filter((item): item is { listing: PublicListing; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const comparables = scoredComparables.map((item) => item.listing);
  const weightedComparableTotal = scoredComparables.reduce(
    (sum, item) => sum + Number(item.listing.price || 0) * item.score,
    0
  );
  const totalWeight = scoredComparables.reduce((sum, item) => sum + item.score, 0);
  const averageComparablePrice =
    totalWeight > 0 ? Math.round(weightedComparableTotal / totalWeight) : 0;
  const comparablePrices = comparables.map((listing) => Number(listing.price || 0)).filter(Boolean);
  const perSquareMeterValues = comparables
    .map((listing) => {
      const property = getProperty(listing);
      if (!property?.square_meters || !listing.price) return null;
      return Number(listing.price) / Number(property.square_meters);
    })
    .filter((value): value is number => Boolean(value));
  const averagePricePerSquareMeter = average(perSquareMeterValues);
  const sizeDrivenEstimate =
    input.squareMeters && averagePricePerSquareMeter
      ? Math.round(input.squareMeters * averagePricePerSquareMeter)
      : null;
  const locationInsight = ghanaMarketService.getLocationInsight(
    input.city,
    input.region,
    input.neighborhood
  );
  const demandBoost =
    locationInsight?.demandLevel === "very_high"
      ? 0.03
      : locationInsight?.demandLevel === "high"
        ? 0.02
        : locationInsight?.demandLevel === "low"
          ? -0.01
          : 0;
  const baseEstimate =
    sizeDrivenEstimate && averageComparablePrice
      ? Math.round(sizeDrivenEstimate * 0.55 + averageComparablePrice * 0.45)
      : sizeDrivenEstimate || averageComparablePrice;
  const suggestedAsk = Math.round(baseEstimate * (1 + demandBoost));
  const lowerBound = Math.round(suggestedAsk * 0.93);
  const upperBound = Math.round(suggestedAsk * 1.07);
  const confidenceScore =
    comparables.length >= 5 ? 3 : comparables.length >= 3 ? 2 : comparables.length >= 1 ? 1 : 0;

  return {
    suggestedAsk,
    lowerBound,
    upperBound,
    confidenceLabel:
      confidenceScore >= 3 ? "High" : confidenceScore === 2 ? "Medium" : "Low",
    comparableCount: comparables.length,
    averageComparablePrice: averageComparablePrice || median(comparablePrices) || 0,
    averagePricePerSquareMeter: averagePricePerSquareMeter
      ? Math.round(averagePricePerSquareMeter)
      : null,
    demandLevel: locationInsight?.demandLevel || "medium",
    investmentScore: locationInsight?.investmentScore || null,
    insightNote:
      locationInsight?.notes ||
      "Estimate is based on public sale comps and available location signals in the marketplace.",
    comparables,
  } satisfies ValuationEstimate;
}

async function getOrganizationDocumentSnapshot(organizationId: string) {
  const { data, count, error } = await supabase
    .from("organization_documents")
    .select("id, title, document_type, status, signed_at, public_summary", { count: "exact" })
    .eq("organization_id", organizationId)
    .eq("public_visibility", true)
    .in("status", ["draft", "sent", "partially_signed", "signed"])
    .order("updated_at", { ascending: false })
    .limit(6);

  if (error) throw error;

  const signedDocumentCount = (data || []).filter((document) => Boolean(document.signed_at)).length;

  return {
    documents: (data || []).map((document) => ({
      id: document.id,
      title: document.title,
      documentType: document.document_type,
      status: document.status,
      signedAt: document.signed_at,
      summary: document.public_summary,
    })),
    publicDocumentCount: count || 0,
    signedDocumentCount,
  };
}

async function enrichAgency(org: OrganizationRow) {
  const [listings, insight, documentSnapshot] = await Promise.all([
    listingService.getOrganizationListings(org.id),
    marketIntelligenceService.getOrganizationInsights(org.id).catch(() => null),
    getOrganizationDocumentSnapshot(org.id).catch(() => ({
      documents: [],
      publicDocumentCount: 0,
      signedDocumentCount: 0,
    })),
  ]);

  const activeListings = (listings || []).filter(
    (listing) => listing.status === "listed" && listing.visibility === "public"
  ) as PublicListing[];
  const publicListings = activeListings.map(
    (listing) =>
      ({
        ...listing,
        organization: {
          name: org.name,
          slug: org.slug,
          verified: org.verified,
          logo_url: org.logo_url,
        },
      }) as PublicListing
  );
  const prices = publicListings.map((listing) => Number(listing.price || 0)).filter(Boolean);
  const serviceAreas = uniqueStrings(
    publicListings.flatMap((listing) => {
      const property = getProperty(listing);
      return [property?.neighborhood || null, property?.city || null];
    })
  ).slice(0, 5);
  const qualityScores = publicListings
    .map((listing) => listing.quality_score)
    .filter((value): value is number => typeof value === "number");
  const averageTrustScore = average(qualityScores);
  const projects = groupListingsIntoProjects(publicListings);
  const trustHighlights = getTrustHighlights({
    verified: org.verified,
    documentCount: documentSnapshot.publicDocumentCount,
    averageTrustScore,
    responseTimeHours: insight?.response_time_hours || null,
    customerSatisfactionScore: insight?.customer_satisfaction_score || null,
  });

  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    description: org.description,
    logoUrl: org.logo_url,
    bannerUrl: org.banner_url,
    verified: Boolean(org.verified),
    verificationStatus: org.verification_status,
    website: org.website,
    email: org.email,
    phone: org.phone,
    serviceAreas,
    publicListingCount: publicListings.length,
    activeListingCount: publicListings.length,
    startingPrice: prices.length ? Math.min(...prices) : null,
    averageTrustScore,
    publicDocumentCount: documentSnapshot.publicDocumentCount,
    signedDocumentCount: documentSnapshot.signedDocumentCount,
    responseTimeHours: insight?.response_time_hours || null,
    conversionRate: insight?.conversion_rate || null,
    customerSatisfactionScore: insight?.customer_satisfaction_score || null,
    projectCount: projects.length,
    trustHighlights,
  } satisfies PublicAgencySnapshot;
}

export const publicDiscoveryService = {
  async getAgencyDirectory(limit = 12) {
    const organizations = await organizationService.getVerifiedOrganizations(Math.max(limit * 2, 18));
    const snapshots = await Promise.all(organizations.map((org) => enrichAgency(org)));

    return snapshots
      .sort((a, b) => {
        if (b.publicListingCount !== a.publicListingCount) {
          return b.publicListingCount - a.publicListingCount;
        }
        return Number(b.averageTrustScore || 0) - Number(a.averageTrustScore || 0);
      })
      .slice(0, limit);
  },

  async getAgencyProfile(slug: string) {
    const organization = await organizationService.getOrganizationBySlug(slug);
    const [snapshot, listings, documentSnapshot] = await Promise.all([
      enrichAgency(organization),
      listingService.getOrganizationListings(organization.id),
      getOrganizationDocumentSnapshot(organization.id).catch(() => ({
        documents: [],
        publicDocumentCount: 0,
        signedDocumentCount: 0,
      })),
    ]);

    const activeListings = (listings || []).filter(
      (listing) => listing.status === "listed" && listing.visibility === "public"
    ) as PublicListing[];
    const publicListings = activeListings.map(
      (listing) =>
        ({
          ...listing,
          organization: {
            name: organization.name,
            slug: organization.slug,
            verified: organization.verified,
            logo_url: organization.logo_url,
          },
        }) as PublicListing
    );
    const projects = groupListingsIntoProjects(publicListings);

    return {
      ...snapshot,
      organization,
      listings: publicListings,
      projects,
      publicDocuments: documentSnapshot.documents,
    } satisfies AgencyProfile;
  },

  async getAreaGuides(limit = 6) {
    await ghanaMarketService.getLocationInsights();
    const listings = await listingService.getPublicListings(PUBLIC_LISTING_SAMPLE_SIZE, 0);
    return buildAreaGuidesFromListings(listings).slice(0, limit);
  },

  async getAreaGuideBySlug(slug: string) {
    const guides = await this.getAreaGuides(36);
    return guides.find((guide) => guide.slug === slug) || null;
  },

  async getMarketTrendSnapshots(limit = 6) {
    await ghanaMarketService.getLocationInsights();

    const requestedTrendCount = Math.max(limit * 2, 12);
    const [topLocations, listings, areaGuides] = await Promise.all([
      marketIntelligenceService
        .getTopLocations(requestedTrendCount)
        .catch(() => [] as LocationTrendRow[]),
      listingService.getPublicListings(PUBLIC_LISTING_SAMPLE_SIZE, 0),
      this.getAreaGuides(Math.max(limit * 3, 18)).catch(() => [] as AreaGuide[]),
    ]);

    const fallbackTrends =
      topLocations.length > 0
        ? topLocations
        : areaGuides.map((guide) => ({
            id: guide.slug,
            city: guide.city,
            region: guide.region,
            demand_level: guide.demandLevel,
            growth_rate: null,
            investment_score: guide.investmentScore,
            safety_score: guide.safetyScore,
            accessibility_score: guide.accessibilityScore,
            trending_up: false,
            updated_at: null,
          })) as LocationTrendRow[];

    const analyticsByLocation = await marketIntelligenceService
      .getLatestMarketAnalyticsByLocations(
        fallbackTrends.map((trend) => trend.city),
        "monthly"
      )
      .catch(() => ({} as Record<string, MarketAnalyticsRow>));

    return fallbackTrends
      .map((trend) => {
        const analytics = analyticsByLocation[normalizeText(trend.city)] || null;
        const areaGuide =
          areaGuides.find(
            (guide) =>
              buildMarketLocationKey(guide.city, guide.region) ===
              buildMarketLocationKey(trend.city, trend.region)
          ) ||
          areaGuides.find((guide) => normalizeText(guide.city) === normalizeText(trend.city)) ||
          null;
        const regionalListings = listings.filter((listing) => {
          const property = getProperty(listing);
          return (
            buildMarketLocationKey(property?.city, property?.region) ===
            buildMarketLocationKey(trend.city, trend.region)
          );
        });
        const comparableListings =
          regionalListings.length > 0
            ? regionalListings
            : listings.filter(
                (listing) => normalizeText(getProperty(listing)?.city) === normalizeText(trend.city)
              );
        const searchQuery = areaGuide?.neighborhood || trend.city;
        const locationInsight = ghanaMarketService.getLocationInsight(
          trend.city,
          trend.region,
          areaGuide?.neighborhood || null
        );
        const prices = comparableListings
          .map((listing) => Number(listing.price || 0))
          .filter((value) => value > 0);

        return {
          slug: slugify(`${trend.city}-${trend.region}`),
          title: `${trend.city}, ${trend.region}`,
          city: trend.city,
          region: trend.region,
          guideSlug: areaGuide?.slug || null,
          searchQuery,
          demandLevel: trend.demand_level || areaGuide?.demandLevel || "medium",
          growthRate: trend.growth_rate ?? null,
          priceTrend: analytics?.price_trend ?? null,
          averagePrice: analytics?.avg_price ?? average(prices),
          medianPrice: analytics?.median_price ?? median(prices),
          totalListings: analytics?.total_listings ?? comparableListings.length,
          newListings: analytics?.new_listings ?? 0,
          investmentScore: trend.investment_score ?? areaGuide?.investmentScore ?? null,
          safetyScore: trend.safety_score ?? areaGuide?.safetyScore ?? null,
          accessibilityScore: trend.accessibility_score ?? areaGuide?.accessibilityScore ?? null,
          floodRiskLevel: locationInsight?.floodRiskLevel || areaGuide?.floodRiskLevel || "unknown",
          notes: buildMarketNote(trend, analytics, areaGuide),
        } satisfies MarketTrendSnapshot;
      })
      .sort(compareMarketTrendSnapshots)
      .slice(0, limit);
  },

  async getProjectCollections(limit = 12) {
    const listings = await listingService.getPublicListings(PUBLIC_LISTING_SAMPLE_SIZE, 0);
    return groupListingsIntoProjects(listings).slice(0, limit);
  },

  async getProjectCollectionBySlug(slug: string) {
    const projects = await this.getProjectCollections(24);
    return projects.find((project) => project.slug === slug) || null;
  },

  async getVendorReputationSnapshot(limit = 8, testimonialLimit = 6) {
    const vendorGroups = await Promise.all(
      PUBLIC_VENDOR_CATEGORIES.map((category) =>
        vendorService
          .getVerifiedVendors(category, Math.max(4, Math.ceil(limit / 2)))
          .catch(() => [] as VendorRow[])
      )
    );
    const vendors = dedupeVendors(vendorGroups.flat());

    const ratingsByVendor = Object.fromEntries(
      await Promise.all(
        vendors.map(async (vendor) => [
          vendor.id,
          await vendorService.getVendorRatings(vendor.id).catch(() => [] as VendorRatingRow[]),
        ])
      )
    ) as Record<string, VendorRatingRow[]>;

    return {
      topPartners: buildPublicVendorSpotlights(vendors, ratingsByVendor, limit),
      testimonials: buildPublicVendorTestimonials(vendors, ratingsByVendor, testimonialLimit),
    } satisfies VendorReputationSnapshot;
  },

  async getPublicReputationSnapshot() {
    const [vendors, agencies, projects] = await Promise.all([
      this.getVendorReputationSnapshot(9, 6),
      this.getAgencyDirectory(6),
      this.getProjectCollections(6),
    ]);

    return {
      vendors,
      agencies: buildAgencyReputationSpotlights(agencies, 6),
      projects: buildProjectReputationSpotlights(projects, 6),
    } satisfies PublicReputationSnapshot;
  },

  async getMobileExperienceSnapshot() {
    const [iosVersion, androidVersion] = await Promise.all([
      mobileAppService.getAppVersion("ios"),
      mobileAppService.getAppVersion("android"),
    ]);

    return buildMobileExperienceSnapshot(iosVersion, androidVersion);
  },

  async getBuyerRequestBoard(limit = 24) {
    const { data, error } = await supabase
      .from("buyer_requests")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(mapBuyerRequestRow);
  },

  async submitBuyerRequest(input: {
    userId?: string | null;
    buyerName?: string | null;
    location: string;
    listingType: "rental" | "sale" | "lease";
    propertyType?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    bedrooms?: number | null;
    notes: string;
    channel?: string | null;
  }) {
    const titleParts = [
      input.listingType === "sale" ? "Need to buy" : input.listingType === "lease" ? "Seeking a lease" : "Need to rent",
      input.propertyType ? `${input.propertyType}` : "property",
      input.location ? `in ${input.location}` : null,
    ].filter(Boolean);

    const { data, error } = await supabase
      .from("buyer_requests")
      .insert({
        user_id: input.userId || null,
        title: titleParts.join(" "),
        buyer_label: normalizeBuyerLabel(input.buyerName),
        location: input.location.trim(),
        listing_type: input.listingType,
        property_type: normalizePropertyCategory(input.propertyType) || input.propertyType || null,
        budget_min: input.budgetMin ?? null,
        budget_max: input.budgetMax ?? null,
        bedrooms: input.bedrooms ?? null,
        notes: input.notes.trim(),
        channel: input.channel || null,
        is_public: true,
      })
      .select("*")
      .single();

    if (error) throw error;

    const entry = mapBuyerRequestRow(data as BuyerRequestRow);

    let alertSaved = false;
    if (input.userId) {
      try {
        await savedSearchAlertService.createAlert({
          userId: input.userId,
          title: entry.title,
          locationQuery: input.location,
          listingType: input.listingType,
          propertyType: input.propertyType || null,
          priceMin: input.budgetMin ?? null,
          priceMax: input.budgetMax ?? null,
          bedrooms: input.bedrooms ?? null,
          frequency: "daily",
        });
        alertSaved = true;
      } catch (error) {
        console.error("Failed to convert buyer request into saved alert:", error);
      }
    }

    return {
      entry,
      alertSaved,
    };
  },

  async estimateHomeValue(input: {
    city: string;
    region?: string | null;
    neighborhood?: string | null;
    propertyType?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    squareMeters?: number | null;
  }) {
    const listings = await listingService.getPublicListings(PUBLIC_LISTING_SAMPLE_SIZE, 0);
    return estimateValueFromComparables({
      ...input,
      listings,
    });
  },
};
