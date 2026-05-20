export interface ReviewSummaryInput {
  reviews?: Array<{
    rating?: number | null;
    verified?: boolean | null;
    status?: string | null;
  }>;
}

export interface FinanceCalculatorInput {
  price: number;
  currency?: string;
  downPaymentPercent?: number;
  annualRatePercent?: number;
  termYears?: number;
  monthlyRentEstimate?: number;
  monthlyOperatingCostPercent?: number;
}

export interface MediaReadinessInput {
  media?: Array<{
    media_type?: string | null;
    external_embed_url?: string | null;
    public_url?: string | null;
  }>;
}

export function buildReviewSummary(input: ReviewSummaryInput) {
  const approvedReviews = (input.reviews || []).filter(
    (review) => !review.status || review.status === "approved"
  );
  const reviewCount = approvedReviews.length;
  const ratingTotal = approvedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  const averageRating = reviewCount > 0 ? Number((ratingTotal / reviewCount).toFixed(1)) : 0;
  const verifiedCount = approvedReviews.filter((review) => Boolean(review.verified)).length;

  return {
    averageRating,
    reviewCount,
    verifiedCount,
    verifiedShare: reviewCount > 0 ? Math.round((verifiedCount / reviewCount) * 100) : 0,
    label:
      reviewCount === 0
        ? "No public reviews yet"
        : `${averageRating.toFixed(1)} from ${reviewCount} review${reviewCount === 1 ? "" : "s"}`,
  };
}

export function canMarkReviewVerified(input: {
  inquiryId?: string | null;
  viewingId?: string | null;
  paymentId?: string | null;
  dealCaseId?: string | null;
}) {
  if (input.paymentId) return { verified: true, source: "payment" as const };
  if (input.viewingId) return { verified: true, source: "viewing" as const };
  if (input.dealCaseId) return { verified: true, source: "deal" as const };
  if (input.inquiryId) return { verified: true, source: "inquiry" as const };
  return { verified: false, source: null };
}

export function calculateBuyerFinance(input: FinanceCalculatorInput) {
  const price = Math.max(Number(input.price || 0), 0);
  const downPaymentPercent = input.downPaymentPercent ?? 20;
  const annualRatePercent = input.annualRatePercent ?? 12;
  const termYears = input.termYears ?? 15;
  const monthlyOperatingCostPercent = input.monthlyOperatingCostPercent ?? 1.25;
  const downPayment = price * (downPaymentPercent / 100);
  const principal = Math.max(price - downPayment, 0);
  const months = Math.max(termYears * 12, 1);
  const monthlyRate = annualRatePercent / 100 / 12;
  const monthlyMortgage =
    monthlyRate > 0
      ? (principal * monthlyRate * (1 + monthlyRate) ** months) /
        ((1 + monthlyRate) ** months - 1)
      : principal / months;
  const closingCosts = price * 0.045;
  const cashNeeded = downPayment + closingCosts;
  const monthlyRentEstimate =
    input.monthlyRentEstimate && input.monthlyRentEstimate > 0
      ? input.monthlyRentEstimate
      : price * 0.0075;
  const annualRent = monthlyRentEstimate * 12;
  const annualOperatingCost = price * (monthlyOperatingCostPercent / 100);
  const annualNetIncome = Math.max(annualRent - annualOperatingCost, 0);
  const grossYieldPercent = price > 0 ? (annualRent / price) * 100 : 0;
  const netYieldPercent = price > 0 ? (annualNetIncome / price) * 100 : 0;
  const rentVsBuyDelta = monthlyMortgage - monthlyRentEstimate;

  return {
    currency: input.currency || "GHS",
    downPayment,
    principal,
    monthlyMortgage,
    closingCosts,
    cashNeeded,
    monthlyRentEstimate,
    grossYieldPercent,
    netYieldPercent,
    rentVsBuyDelta,
    disclaimer:
      "Estimates are informational only and are not financial, tax, lending, or legal advice.",
  };
}

export function buildMediaReadinessLabels(input: MediaReadinessInput) {
  const media = input.media || [];
  const countByType = (type: string) =>
    media.filter((item) => item.media_type === type || item.external_embed_url?.includes(type))
      .length;
  const photos = media.filter((item) => !item.media_type || item.media_type === "photo").length;
  const videos = countByType("video");
  const floorPlans = countByType("floor_plan");
  const virtualTours = countByType("virtual_tour");
  const drone = countByType("drone");
  const renovation = countByType("renovation_before_after");

  return {
    photos,
    videos,
    floorPlans,
    virtualTours,
    drone,
    renovation,
    score: Math.min(
      100,
      (photos >= 8 ? 35 : photos >= 5 ? 25 : photos > 0 ? 15 : 0) +
        Math.min(65, videos * 15 + floorPlans * 15 + virtualTours * 15 + drone * 10 + renovation * 10)
    ),
    readyLabels: [
      photos > 0 ? `${photos} photo${photos === 1 ? "" : "s"}` : "Photos pending",
      videos > 0 ? "Video attached" : "Video ready to request",
      floorPlans > 0 ? "Floor plan attached" : "Floor plan pending",
      virtualTours > 0 ? "Virtual tour attached" : "Virtual tour pending",
      drone > 0 ? "Drone media attached" : "Drone media optional",
      renovation > 0 ? "Before/after media attached" : "Before/after media optional",
    ],
  };
}

export function buildAiListingDraft(input: {
  address?: string;
  city?: string;
  region?: string;
  neighborhood?: string;
  category?: string;
  listingType?: string;
  price?: string | number;
  amenities?: string;
  bedrooms?: string | number;
  bathrooms?: string | number;
}) {
  const area = [input.neighborhood, input.city, input.region].filter(Boolean).join(", ");
  const category = String(input.category || "property").replaceAll("_", " ");
  const listingType = input.listingType === "sale" ? "for sale" : input.listingType === "lease" ? "for lease" : "for rent";
  const amenities = String(input.amenities || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const amenitySentence =
    amenities.length > 0
      ? `Key features include ${amenities.slice(0, 5).join(", ")}.`
      : "Add standout amenities such as parking, backup power, security, or water storage to sharpen the listing.";

  return {
    title: `${category.charAt(0).toUpperCase()}${category.slice(1)} ${listingType} in ${input.neighborhood || input.city || "Ghana"}`,
    summary: `${input.address || "This listing"} is positioned for buyers and renters comparing verified options in ${area || "Ghana"}.`,
    description: [
      `${input.address || "This property"} is a ${category} ${listingType} in ${area || "a convenient Ghana location"}.`,
      input.bedrooms || input.bathrooms
        ? `The space includes ${input.bedrooms || "flexible"} bedroom(s) and ${input.bathrooms || "well-planned"} bathroom(s), with room for practical daily living.`
        : "The layout should be confirmed through viewing notes, photos, and a floor plan before commitment.",
      amenitySentence,
      "BaytMiftah recommends confirming ownership documents, viewing condition, payment route, and handoff expectations inside the platform workflow.",
    ].join("\n\n"),
    seoDescription: `${category} ${listingType} in ${area || "Ghana"} with BaytMiftah trust, viewing, and payment workflows.`,
    neighborhoodCopy: area
      ? `${area} buyers should compare access roads, drainage, water reliability, commute routes, and nearby services before final selection.`
      : "Add neighborhood details so BaytMiftah can surface stronger local intelligence for buyers and renters.",
  };
}

export function selectRecommendationRails(listings: any[], currentListing?: any) {
  const currentId = currentListing?.id;
  const currentProperty = currentListing?.property || {};
  const filtered = listings.filter((listing) => listing.id !== currentId);
  const similarVerified = filtered
    .filter(
      (listing) =>
        listing.organization?.verified ||
        listing.verification_status === "verified" ||
        listing.property?.category === currentProperty.category
    )
    .slice(0, 4);
  const newInSearch = [...filtered]
    .sort(
      (a, b) =>
        new Date(b.published_at || b.created_at || 0).getTime() -
        new Date(a.published_at || a.created_at || 0).getTime()
    )
    .slice(0, 4);
  const priceChanged = filtered
    .filter((listing) => Boolean(listing.previous_price || listing.metadata?.previous_price))
    .slice(0, 4);

  return {
    similarVerified,
    newInSearch,
    priceChanged,
    youMightLike: similarVerified.length > 0 ? similarVerified : newInSearch,
  };
}
