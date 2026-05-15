import { describe, expect, it } from "vitest";
import {
  buildAgencyReputationSpotlights,
  buildMobileExperienceSnapshot,
  buildProjectReputationSpotlights,
  buildPublicVendorTestimonials,
  buildAreaGuidesFromListings,
  calculatePublicReputationScore,
  estimateValueFromComparables,
  groupListingsIntoProjects,
  slugify,
} from "./public-discovery.service";

const sampleListings = [
  {
    id: "listing-1",
    organization_id: "org-1",
    listing_type: "sale",
    price: 1100000,
    quality_score: 88,
    organization: {
      name: "Prime Estates",
      slug: "prime-estates",
      verified: true,
      logo_url: null,
    },
    property: {
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "East Legon",
      category: "apartment",
      bedrooms: 3,
      bathrooms: 3,
      square_meters: 180,
      amenities: ["Parking", "Security", "Pool"],
      media: [{ public_url: "https://example.com/a.jpg" }],
    },
  },
  {
    id: "listing-2",
    organization_id: "org-1",
    listing_type: "sale",
    price: 1180000,
    quality_score: 84,
    organization: {
      name: "Prime Estates",
      slug: "prime-estates",
      verified: true,
      logo_url: null,
    },
    property: {
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "East Legon",
      category: "apartment",
      bedrooms: 3,
      bathrooms: 2,
      square_meters: 190,
      amenities: ["Parking", "Gym"],
      media: [{ public_url: "https://example.com/b.jpg" }],
    },
  },
  {
    id: "listing-3",
    organization_id: "org-2",
    listing_type: "sale",
    price: 870000,
    quality_score: 77,
    organization: {
      name: "City Homes",
      slug: "city-homes",
      verified: true,
      logo_url: null,
    },
    property: {
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "Osu",
      category: "apartment",
      bedrooms: 2,
      bathrooms: 2,
      square_meters: 120,
      amenities: ["Security"],
      media: [{ public_url: "https://example.com/c.jpg" }],
    },
  },
  {
    id: "listing-4",
    organization_id: "org-3",
    listing_type: "rental",
    price: 7500,
    quality_score: 81,
    organization: {
      name: "Airport Living",
      slug: "airport-living",
      verified: true,
      logo_url: null,
    },
    property: {
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "Airport Residential",
      category: "apartment",
      bedrooms: 2,
      bathrooms: 2,
      square_meters: 130,
      amenities: ["Lift", "Generator"],
      media: [{ public_url: "https://example.com/d.jpg" }],
    },
  },
] as any[];

const sampleVendors = [
  {
    id: "vendor-1",
    business_name: "Gold Coast Electric",
    business_category: "electrician",
    verified: true,
    rating_avg: 4.8,
    response_time_minutes: 35,
    total_jobs_completed: 44,
    service_areas: ["East Legon", "Airport Residential"],
    services: [{ id: "service-1", service_name: "Wiring" }],
  },
  {
    id: "vendor-2",
    business_name: "Swift Clean Ghana",
    business_category: "cleaner",
    verified: true,
    rating_avg: 4.6,
    response_time_minutes: 50,
    total_jobs_completed: 28,
    service_areas: ["Osu"],
    services: [{ id: "service-2", service_name: "Deep cleaning" }],
  },
] as any[];

const sampleRatings = {
  "vendor-1": [
    {
      id: "rating-1",
      vendor_id: "vendor-1",
      assignment_id: "assignment-1",
      rating: 5,
      review_text: "Fast, tidy, and transparent from quote to completion.",
      created_at: "2026-05-10T08:00:00.000Z",
    },
  ],
  "vendor-2": [
    {
      id: "rating-2",
      vendor_id: "vendor-2",
      assignment_id: null,
      rating: 4,
      review_text: "Very responsive and easy to coordinate for move-out prep.",
      created_at: "2026-05-09T08:00:00.000Z",
    },
  ],
} as any;

describe("publicDiscoveryService helpers", () => {
  it("slugifies discovery labels", () => {
    expect(slugify("East Legon, Accra")).toBe("east-legon-accra");
  });

  it("groups listings into project collections", () => {
    const projects = groupListingsIntoProjects(sampleListings as any);

    expect(projects[0]?.organizationName).toBe("Prime Estates");
    expect(projects[0]?.listingCount).toBe(2);
    expect(projects[0]?.bedroomMix).toContain("3-bed");
    expect(projects[0]?.amenityHighlights).toContain("Parking");
  });

  it("builds area guides with listing metrics", () => {
    const guides = buildAreaGuidesFromListings(sampleListings as any);
    const eastLegon = guides.find((guide) => guide.slug === "east-legon-accra");

    expect(eastLegon).toBeTruthy();
    expect(eastLegon?.listingCount).toBe(2);
    expect(eastLegon?.averagePrice).toBeGreaterThan(1000000);
    expect(eastLegon?.demandLevel).toBe("very_high");
  });

  it("estimates home value from comparable sale listings", () => {
    const estimate = estimateValueFromComparables({
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "East Legon",
      propertyType: "apartment",
      bedrooms: 3,
      bathrooms: 2,
      squareMeters: 185,
      listings: sampleListings as any,
    });

    expect(estimate.comparableCount).toBeGreaterThan(1);
    expect(estimate.suggestedAsk).toBeGreaterThan(1000000);
    expect(estimate.upperBound).toBeGreaterThan(estimate.lowerBound);
    expect(["Medium", "High"]).toContain(estimate.confidenceLabel);
  });

  it("builds anonymized public vendor testimonials from verified ratings", () => {
    const testimonials = buildPublicVendorTestimonials(sampleVendors as any, sampleRatings, 2);

    expect(testimonials).toHaveLength(2);
    expect(testimonials[0]?.vendorName).toBe("Gold Coast Electric");
    expect(testimonials[0]?.reviewerLabel).toBe("Verified job client");
    expect(testimonials[0]?.highlight).toContain("Replies in about");
  });

  it("builds a public mobile experience snapshot from release data", () => {
    const snapshot = buildMobileExperienceSnapshot(
      {
        latest_version: "1.2.0",
        minimum_version: "1.0.0",
        update_url: "https://apps.apple.com/app/propertyhub",
        force_update: false,
        current_version: "1.0.0",
      },
      {
        latest_version: "1.3.0",
        minimum_version: "1.1.0",
        update_url: "https://play.google.com/store/apps/details?id=com.propertyhub",
        force_update: true,
        current_version: "1.0.0",
      }
    );

    expect(snapshot.platforms).toHaveLength(2);
    expect(snapshot.releaseHeadline).toContain("Android 1.3.0");
    expect(snapshot.platforms[1]?.forceUpdate).toBe(true);
  });

  it("scores agency reputation from trust inputs", () => {
    expect(
      calculatePublicReputationScore({
        verified: true,
        averageTrustScore: 86,
        customerSatisfactionScore: 4.7,
        responseTimeHours: 2,
        documentCount: 3,
        listingCount: 8,
      })
    ).toBeGreaterThan(70);
  });

  it("builds agency and project reputation spotlights", () => {
    const agencies = buildAgencyReputationSpotlights([
      {
        id: "org-1",
        slug: "prime-estates",
        name: "Prime Estates",
        description: null,
        logoUrl: null,
        bannerUrl: null,
        verified: true,
        verificationStatus: "verified",
        website: null,
        email: null,
        phone: null,
        serviceAreas: ["East Legon"],
        publicListingCount: 8,
        activeListingCount: 8,
        startingPrice: 1100000,
        averageTrustScore: 88,
        publicDocumentCount: 3,
        signedDocumentCount: 2,
        responseTimeHours: 2,
        conversionRate: 0.2,
        customerSatisfactionScore: 4.8,
        projectCount: 2,
        trustHighlights: ["Verified organization", "Average listing trust 88/100"],
      },
    ] as any);
    const projects = buildProjectReputationSpotlights(groupListingsIntoProjects(sampleListings as any), 2);

    expect(agencies[0]?.reviewScore).toBeGreaterThan(70);
    expect(projects[0]?.reviewScore).toBeGreaterThan(60);
    expect(projects[0]?.organizationName).toBeTruthy();
  });
});
