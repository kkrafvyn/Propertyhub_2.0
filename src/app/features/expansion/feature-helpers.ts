import { ghanaMarketService } from "../../../lib/ghana-market.service";
import { stripReferralMetadata } from "../../../lib/referral-attribution.service";

export interface ComparisonProperty {
  id: string;
  title: string;
  address: string;
  city: string;
  region: string;
  neighborhood?: string | null;
  price: number;
  currency?: string | null;
  listingType?: string | null;
  category?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareMeters?: number | null;
  amenities?: string[] | null;
  qualityScore?: number | null;
  floodRiskLevel?: string | null;
  locationConfidence?: number | null;
}

export interface DealTimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "lead" | "viewing" | "payment" | "document" | "message";
}

export interface AgentPerformanceRow {
  id: string;
  name: string;
  activeLeads: number;
  negotiations: number;
  wonDeals: number;
  assignedViewings: number;
  completedViewings: number;
  verifiedPayments: number;
  collectedRevenueMinor: number;
}

export interface ParsedOfferSummary {
  amount: number | null;
  financing: string | null;
  targetCloseDate: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  notes: string | null;
}

export interface ListingTrustSignal {
  label: string;
  complete: boolean;
  weight: number;
  helper: string;
}

export interface ListingTrustScore {
  score: number;
  label: "High trust" | "Strong" | "Developing" | "Needs review";
  signals: ListingTrustSignal[];
}

export interface EscrowMilestone {
  label: string;
  helper: string;
  complete: boolean;
}

export interface DecisionLineItem {
  label: string;
  amount: number;
  helper: string;
}

export interface ClosingCostEstimate {
  total: number;
  recommendedReserve: number;
  lineItems: DecisionLineItem[];
  guidance: string;
}

export interface RentVsBuyAnalysis {
  monthlyOwnershipCost: number;
  monthlyRentCost: number;
  totalOwnershipCost: number;
  totalRentCost: number;
  equityAfterPeriod: number;
  breakEvenYears: number | null;
  recommendation: string;
}

export interface ReadinessCheck {
  label: string;
  complete: boolean;
  helper: string;
}

export interface ReadinessScore {
  score: number;
  label: "Ready" | "Review" | "At Risk";
  checks: ReadinessCheck[];
  actions: string[];
}

export interface NegotiationSignal {
  label: string;
  stance: "positive" | "watch" | "risk";
  helper: string;
}

export interface BuyerNegotiationPlan {
  anchor: number;
  target: number;
  stretch: number;
  confidence: "Strong" | "Balanced" | "Cautious";
  leverage: "Buyer leverage" | "Balanced leverage" | "Seller leverage";
  message: string;
  signals: NegotiationSignal[];
  nextSteps: string[];
}

export interface ViewingPrepItem {
  label: string;
  helper: string;
  priority: "urgent" | "high" | "medium";
}

export interface ViewingPrepPlan {
  mode: "Remote-first" | "Hybrid" | "In-person";
  headline: string;
  checklist: ViewingPrepItem[];
  arrivalNotes: string[];
}

export interface SellerNetSheet {
  grossInventoryValue: number;
  activePipelineValue: number;
  collectedProofValue: number;
  estimatedCommission: number;
  estimatedClosingCosts: number;
  ownerNetProjection: number;
  lineItems: DecisionLineItem[];
  guidance: string;
}

export interface ListingLaunchAction {
  label: string;
  status: "ready" | "watch" | "blocked";
  helper: string;
}

export interface ListingLaunchPlan {
  readyCount: number;
  needsWorkCount: number;
  averageQuality: number;
  ownerUpdate: string;
  actions: ListingLaunchAction[];
}

export function formatLabel(value?: string | null) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatCaseType(caseType?: string | null) {
  switch (caseType) {
    case "purchase_offer":
      return "Purchase Offer";
    case "lease_application":
      return "Lease Application";
    case "rental_application":
      return "Rental Application";
    default:
      return formatLabel(caseType);
  }
}

export function formatMoney(
  amount?: number | null,
  currency = "GHS",
  options?: { locale?: string; isMinor?: boolean; maximumFractionDigits?: number }
) {
  const locale = options?.locale || "en-GH";
  const maximumFractionDigits = options?.maximumFractionDigits ?? (options?.isMinor ? 2 : 0);
  const normalizedAmount = options?.isMinor ? Number(amount || 0) / 100 : Number(amount || 0);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: options?.isMinor ? 2 : 0,
    maximumFractionDigits,
  }).format(normalizedAmount);
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return "Recently";

  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

export function calculateMonthlyMortgage(
  principal: number,
  annualRatePercent: number,
  termYears: number
) {
  if (principal <= 0 || termYears <= 0) return 0;

  const monthlyRate = annualRatePercent / 100 / 12;
  const totalPayments = termYears * 12;

  if (monthlyRate === 0) return principal / totalPayments;

  return (
    (principal * monthlyRate * (1 + monthlyRate) ** totalPayments) /
    ((1 + monthlyRate) ** totalPayments - 1)
  );
}

export function estimateClosingCosts(input: {
  price?: number | null;
  listingType?: string | null;
  inspectionFee?: number | null;
  agencyFeePercent?: number;
  legalFeePercent?: number;
  stampDutyPercent?: number;
  registrationPercent?: number;
  movingBufferPercent?: number;
}): ClosingCostEstimate {
  const price = Math.max(Number(input.price || 0), 0);
  const isSale = input.listingType === "sale";
  const agencyFeePercent = input.agencyFeePercent ?? (isSale ? 3 : 10);
  const legalFeePercent = input.legalFeePercent ?? (isSale ? 1.5 : 0.5);
  const stampDutyPercent = input.stampDutyPercent ?? (isSale ? 1 : 0);
  const registrationPercent = input.registrationPercent ?? (isSale ? 0.75 : 0);
  const movingBufferPercent = input.movingBufferPercent ?? (isSale ? 1 : 8);
  const inspectionFee = Math.max(Number(input.inspectionFee || 0), 0);
  const lineItems: DecisionLineItem[] = [
    {
      label: isSale ? "Agency / facilitation" : "Agent or placement fee",
      amount: price * (agencyFeePercent / 100),
      helper: isSale ? "Typical sales facilitation reserve." : "Modeled as a share of annual rent or listing target.",
    },
    {
      label: "Legal review",
      amount: price * (legalFeePercent / 100),
      helper: "Budget for agreement, title, lease, or mandate review.",
    },
    {
      label: "Inspection and due diligence",
      amount: inspectionFee || Math.max(price * 0.0025, isSale ? 1500 : 350),
      helper: "Covers local inspection, photos, or representative walkthrough.",
    },
    {
      label: isSale ? "Stamp duty and registration" : "Move-in and utilities buffer",
      amount: isSale
        ? price * ((stampDutyPercent + registrationPercent) / 100)
        : price * (movingBufferPercent / 100),
      helper: isSale
        ? "Modeled public filing and registration reserve."
        : "Utility activation, cleaning, moving, and first-service buffer.",
    },
  ];
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const recommendedReserve = total + price * (isSale ? 0.01 : 0.03);

  return {
    total,
    recommendedReserve,
    lineItems,
    guidance: isSale
      ? "Hold this reserve outside the offer amount until documents, title, and payment milestones are reviewed."
      : "Keep this buffer separate from rent so move-in, utilities, and inspection issues do not break the plan.",
  };
}

export function buildRentVsBuyAnalysis(input: {
  purchasePrice?: number | null;
  monthlyRent?: number | null;
  depositPercent?: number;
  annualRatePercent?: number;
  termYears?: number;
  ownershipYears?: number;
  annualAppreciationPercent?: number;
  annualMaintenancePercent?: number;
  closingCostPercent?: number;
}): RentVsBuyAnalysis {
  const purchasePrice = Math.max(Number(input.purchasePrice || 0), 0);
  const monthlyRent = Math.max(Number(input.monthlyRent || 0), 0);
  const depositPercent = input.depositPercent ?? 20;
  const annualRatePercent = input.annualRatePercent ?? 18;
  const termYears = input.termYears ?? 20;
  const ownershipYears = input.ownershipYears ?? 5;
  const deposit = purchasePrice * (depositPercent / 100);
  const loanPrincipal = Math.max(purchasePrice - deposit, 0);
  const mortgage = calculateMonthlyMortgage(loanPrincipal, annualRatePercent, termYears);
  const monthlyMaintenance = (purchasePrice * ((input.annualMaintenancePercent ?? 1.25) / 100)) / 12;
  const closingCosts = purchasePrice * ((input.closingCostPercent ?? 5) / 100);
  const monthlyOwnershipCost = mortgage + monthlyMaintenance;
  const totalOwnershipCost =
    deposit + closingCosts + monthlyOwnershipCost * ownershipYears * 12;
  const totalRentCost = monthlyRent * ownershipYears * 12;
  const futureValue =
    purchasePrice * (1 + (input.annualAppreciationPercent ?? 6) / 100) ** ownershipYears;
  const equityAfterPeriod = Math.max(futureValue - loanPrincipal, 0);
  const monthlyDelta = monthlyOwnershipCost - monthlyRent;
  const breakEvenYears =
    monthlyDelta <= 0 || equityAfterPeriod <= 0
      ? null
      : Math.max(1, Math.ceil((deposit + closingCosts) / (monthlyDelta * 12)));

  const recommendation =
    purchasePrice <= 0
      ? "Add a purchase price to compare rent and buy paths."
      : monthlyRent <= 0
        ? "Add a realistic monthly rent alternative before deciding."
        : equityAfterPeriod + totalRentCost > totalOwnershipCost
          ? "Buying can make sense if the title, documents, and payment milestones check out."
          : "Renting keeps more flexibility unless price, financing, or appreciation improves.";

  return {
    monthlyOwnershipCost,
    monthlyRentCost: monthlyRent,
    totalOwnershipCost,
    totalRentCost,
    equityAfterPeriod,
    breakEvenYears,
    recommendation,
  };
}

export function buildDiasporaChecklist(listingType?: string | null) {
  const closingTrack =
    listingType === "sale"
      ? [
          "Verify title or mandate documents and keep signed versions in the deal room.",
          "Confirm FX timing and deposit route before sending large transfer instructions.",
          "Schedule virtual walkthrough and attorney review before signing the final agreement.",
        ]
      : [
          "Confirm viewing notes, move-in date, and utilities handoff with the local rep.",
          "Send lease summary, payment schedule, and inventory checklist into the deal room.",
          "Prepare remote onboarding pack with keys, emergency contacts, and neighborhood tips.",
        ];

  return [
    "Share documents and approvals in one thread so remote buyers never lose context.",
    "Use a verified payment path and hold proof of payment in the workspace timeline.",
    ...closingTrack,
  ];
}

export function getNeighborhoodSnapshot(property?: Partial<ComparisonProperty> | null) {
  if (!property) return null;
  return ghanaMarketService.getLocationInsight(
    property.city || null,
    property.region || null,
    property.neighborhood || null
  );
}

export function buildListingTrustScore(input: {
  listing?: any;
  property?: any;
  organization?: any;
  mediaCount?: number;
  trustSnapshot?: any;
}): ListingTrustScore {
  const { listing, property, organization, mediaCount = 0, trustSnapshot } = input;
  const qualityScore =
    typeof listing?.quality_score === "number" ? Math.max(0, Math.min(100, listing.quality_score)) : 0;
  const locationConfidence =
    typeof property?.location_confidence === "number"
      ? Math.max(0, Math.min(100, property.location_confidence))
      : 0;
  const organizationVerified = Boolean(
    trustSnapshot?.organizationVerified || organization?.verified || listing?.organization?.verified
  );
  const listingVerified = ["verified", "approved"].includes(String(listing?.verification_status || ""));
  const hasDocuments = Number(trustSnapshot?.publicDocumentCount || 0) > 0;
  const hasCoordinates =
    typeof property?.latitude === "number" && typeof property?.longitude === "number";

  const signals: ListingTrustSignal[] = [
    {
      label: "Verified organization",
      complete: organizationVerified,
      weight: 15,
      helper: "Workspace identity is verified.",
    },
    {
      label: "Listing review",
      complete: listingVerified,
      weight: 15,
      helper: "Internal listing verification has passed.",
    },
    {
      label: "Quality score",
      complete: qualityScore >= 75,
      weight: Math.round((qualityScore / 100) * 20),
      helper: "Price, media, address, and completeness signal.",
    },
    {
      label: "Address confidence",
      complete: locationConfidence >= 80 || Boolean(property?.ghana_post_gps),
      weight: Math.round((Math.max(locationConfidence, property?.ghana_post_gps ? 85 : 0) / 100) * 15),
      helper: "Coordinates, GhanaPostGPS, and area data improve safety.",
    },
    {
      label: "Visual coverage",
      complete: mediaCount >= 5,
      weight: mediaCount >= 5 ? 10 : mediaCount >= 3 ? 7 : mediaCount >= 1 ? 4 : 0,
      helper: "Remote buyers need enough photos, video, or plans.",
    },
    {
      label: "Public documents",
      complete: hasDocuments,
      weight: hasDocuments ? 15 : 0,
      helper: "Published title, mandate, offer, or agreement records.",
    },
    {
      label: "Map confidence",
      complete: hasCoordinates,
      weight: hasCoordinates ? 10 : 0,
      helper: "Precise coordinates support directions and arrival checks.",
    },
  ];
  const score = Math.min(100, signals.reduce((total, signal) => total + signal.weight, 0));
  const label =
    score >= 85 ? "High trust" : score >= 70 ? "Strong" : score >= 45 ? "Developing" : "Needs review";

  return { score, label, signals };
}

export function buildEscrowMilestones(input: {
  listingType?: string | null;
  hasViewing?: boolean;
  hasOffer?: boolean;
  hasDocuments?: boolean;
  hasPayment?: boolean;
  hasVerification?: boolean;
}): EscrowMilestone[] {
  const saleFlow = input.listingType === "sale";

  return [
    {
      label: "Identity and agency check",
      helper: "Confirm buyer profile, listing team identity, and authorization to transact.",
      complete: Boolean(input.hasVerification),
    },
    {
      label: saleFlow ? "Viewing or virtual walkthrough" : "Inspection or move-in walkthrough",
      helper: "Document the condition before offer, booking fee, or lease signing.",
      complete: Boolean(input.hasViewing),
    },
    {
      label: saleFlow ? "Offer terms captured" : "Lease terms captured",
      helper: "Record amount, close date, contingencies, and payment schedule in the deal room.",
      complete: Boolean(input.hasOffer),
    },
    {
      label: saleFlow ? "Title and agreement review" : "Lease and inventory review",
      helper: "Keep signed documents, legal notes, and revisions attached to the same workflow.",
      complete: Boolean(input.hasDocuments),
    },
    {
      label: "Protected payment milestone",
      helper: "Use a tracked payment route and keep receipt verification before handoff.",
      complete: Boolean(input.hasPayment),
    },
  ];
}

export function buildAiConciergePrompts(listing?: any) {
  const property = listing?.property || {};
  const address = property.address || "this property";
  const city = property.city || "this area";
  const salePrompts = [
    `What risks should I check before making an offer on ${address}?`,
    `Compare the asking price with similar ${city} options.`,
    "What documents should I request before sending a deposit?",
  ];
  const rentalPrompts = [
    `What should I inspect before renting ${address}?`,
    "What lease terms and utility questions should I ask?",
    `Is ${city} a good fit for a commuting renter?`,
  ];

  return [
    listing?.listing_type === "sale" ? "Build my offer checklist." : "Build my viewing checklist.",
    ...(listing?.listing_type === "sale" ? salePrompts : rentalPrompts),
    "Write a concise message to the listing team.",
  ];
}

export function buildNeighborhoodIntelCards(property?: any) {
  const snapshot = getNeighborhoodSnapshot(
    property
      ? {
          city: property.city,
          region: property.region,
          neighborhood: property.neighborhood,
        }
      : null
  );

  return [
    {
      label: "Commute readiness",
      value: property?.latitude && property?.longitude ? "Directions ready" : "Map check needed",
      helper: "Precise coordinates unlock route planning and arrival checks.",
    },
    {
      label: "Market demand",
      value: snapshot ? formatLabel(snapshot.demandLevel) : "Unknown",
      helper: snapshot?.notes || "Save more local context before comparing this area.",
    },
    {
      label: "Flood and access",
      value: snapshot ? formatLabel(snapshot.floodRiskLevel) : formatLabel(property?.flood_risk_level),
      helper: "Buyers should check road access, drainage, and rainy-season movement.",
    },
    {
      label: "Daily-living fit",
      value: snapshot ? `${snapshot.walkabilityScore}/5 walkability` : "Needs local review",
      helper: "Schools, shops, hospitals, utilities, internet, and security should be verified.",
    },
  ];
}

export function buildRemoteBuyerReadiness(input: {
  property?: any;
  listing?: any;
  mediaItems?: any[];
  documents?: any[];
  trustSnapshot?: any;
}): ReadinessScore {
  const property = input.property || input.listing?.property || {};
  const mediaItems = input.mediaItems || property.media || property.property_media || [];
  const documents = input.documents || input.trustSnapshot?.publicDocuments || [];
  const hasCoordinates =
    typeof property.latitude === "number" && typeof property.longitude === "number";
  const hasRichMedia =
    mediaItems.length >= 5 ||
    mediaItems.some((item: any) => ["video", "virtual_tour", "floor_plan"].includes(item.media_type));
  const checks: ReadinessCheck[] = [
    {
      label: "Verified address",
      complete: Boolean(property.ghana_post_gps || hasCoordinates || Number(property.location_confidence || 0) >= 75),
      helper: "Remote buyers need confidence that the address, map, and arrival route match.",
    },
    {
      label: "Media evidence",
      complete: hasRichMedia,
      helper: "Ask for room-by-room photos, a video walkthrough, or a floor plan.",
    },
    {
      label: "Public trust documents",
      complete: documents.length > 0 || Boolean(input.trustSnapshot?.publicDocumentCount),
      helper: "Title, mandate, lease, or agreement records should be visible before money moves.",
    },
    {
      label: "Organization trust",
      complete: Boolean(input.trustSnapshot?.organizationVerified || input.listing?.organization?.verified),
      helper: "The listing team should be tied to a verified workspace or review trail.",
    },
    {
      label: "Payment milestone plan",
      complete: input.listing?.verification_status === "verified" || input.listing?.verification_status === "approved",
      helper: "Keep deposit, receipt, and handoff timing in the deal room.",
    },
  ];
  const completed = checks.filter((check) => check.complete).length;
  const score = Math.round((completed / checks.length) * 100);
  const label = score >= 80 ? "Ready" : score >= 50 ? "Review" : "At Risk";
  const actions = checks
    .filter((check) => !check.complete)
    .map((check) => check.helper)
    .slice(0, 3);

  return {
    score,
    label,
    checks,
    actions: actions.length > 0 ? actions : ["Remote buyer pack is strong. Keep all updates inside the deal room."],
  };
}

export function buildInspectionChecklist(input: {
  property?: any;
  listing?: any;
  mediaItems?: any[];
}) {
  const property = input.property || input.listing?.property || {};
  const mediaItems = input.mediaItems || property.media || property.property_media || [];
  const isLand = property.category === "land";
  const isSale = input.listing?.listing_type === "sale";

  return [
    {
      label: isLand ? "Boundary and access check" : "Structure and finish check",
      helper: isLand
        ? "Confirm plot markers, road access, drainage, and neighboring encroachment."
        : "Inspect walls, ceilings, windows, floors, fixtures, and visible water damage.",
      priority: "high",
    },
    {
      label: "Utilities and service reliability",
      helper: "Ask for water, electricity, internet, backup power, waste, and security details.",
      priority: "high",
    },
    {
      label: isSale ? "Title, mandate, and ownership trail" : "Lease, inventory, and deposit terms",
      helper: isSale
        ? "Do not release funds until title or mandate proof is reviewed."
        : "Confirm what is refundable, who maintains what, and handoff condition.",
      priority: "high",
    },
    {
      label: "Rainy-season and flood review",
      helper: formatLabel(property.flood_risk_level || "unknown") + " flood risk. Ask locals about access during heavy rain.",
      priority: property.flood_risk_level === "high" ? "urgent" : "medium",
    },
    {
      label: "Remote evidence pack",
      helper:
        mediaItems.length >= 5
          ? "Media coverage is decent; request missing rooms or defects."
          : "Request a fuller photo set, short video, and floor plan before approving remotely.",
      priority: mediaItems.length >= 5 ? "medium" : "high",
    },
  ];
}

function clampScore(value?: number | null) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function clampRate(value: number) {
  return Math.max(0.72, Math.min(1.04, value));
}

function signalFromScore(
  score: number,
  label: string,
  positiveHelper: string,
  watchHelper: string,
  riskHelper: string
): NegotiationSignal {
  if (score >= 75) {
    return {
      label,
      stance: "positive",
      helper: positiveHelper,
    };
  }

  if (score >= 50) {
    return {
      label,
      stance: "watch",
      helper: watchHelper,
    };
  }

  return {
    label,
    stance: "risk",
    helper: riskHelper,
  };
}

export function buildBuyerNegotiationPlan(input: {
  listing?: any;
  property?: any;
  trustScore?: number | null;
  readinessScore?: number | null;
  mediaReadinessScore?: number | null;
  closingReserve?: number | null;
  activeDemand?: string | null;
}): BuyerNegotiationPlan {
  const listing = input.listing || {};
  const property = input.property || listing.property || {};
  const price = Math.max(Number(listing.price || 0), 0);
  const currency = listing.currency || "GHS";
  const isSale = listing.listing_type === "sale";
  const trustScore = clampScore(input.trustScore ?? listing.quality_score);
  const readinessScore = clampScore(input.readinessScore);
  const mediaScore = clampScore(input.mediaReadinessScore);
  const reserve = Math.max(Number(input.closingReserve || 0), 0);
  const demand = String(input.activeDemand || "balanced").toLowerCase();
  const address = property.address || "this property";

  if (!price) {
    return {
      anchor: 0,
      target: 0,
      stretch: 0,
      confidence: "Cautious",
      leverage: "Balanced leverage",
      message: "Add a listing price before generating a negotiation plan.",
      signals: [],
      nextSteps: ["Confirm the asking price, included fees, and payment schedule before negotiating."],
    };
  }

  const baseBand = isSale
    ? { anchor: 0.93, target: 0.96, stretch: 0.99 }
    : { anchor: 0.96, target: 0.98, stretch: 1 };
  const riskDiscount =
    (trustScore < 50 ? 0.04 : trustScore < 70 ? 0.02 : 0) +
    (readinessScore < 50 ? 0.03 : readinessScore < 75 ? 0.015 : 0) +
    (mediaScore > 0 && mediaScore < 55 ? 0.015 : 0);
  const demandAdjustment = demand.includes("high") ? 0.015 : demand.includes("low") ? -0.01 : 0;
  const reservePressure = reserve > price * (isSale ? 0.08 : 0.18) ? 0.01 : 0;
  const anchorRate = clampRate(baseBand.anchor - riskDiscount - reservePressure + demandAdjustment);
  const targetRate = clampRate(baseBand.target - riskDiscount / 2 - reservePressure / 2 + demandAdjustment / 2);
  const stretchRate = clampRate(baseBand.stretch - Math.max(0, riskDiscount - 0.02) + demandAdjustment / 2);
  const signals: NegotiationSignal[] = [
    signalFromScore(
      trustScore,
      "Trust posture",
      "Strong trust signals support a cleaner offer with fewer objections.",
      "Keep document and identity checks as explicit conditions.",
      "Use verification gaps as leverage and do not waive due diligence."
    ),
    signalFromScore(
      readinessScore,
      "Remote readiness",
      "The listing is prepared enough for an out-of-town buyer to move quickly.",
      "Ask for the missing remote buyer items before increasing the offer.",
      "Treat remote-readiness gaps as a reason to slow down or negotiate lower."
    ),
    signalFromScore(
      mediaScore || (readinessScore > 0 ? readinessScore : trustScore),
      "Evidence quality",
      "Media coverage makes the condition conversation easier.",
      "Request targeted photos, video, or a floor plan before final terms.",
      "Poor evidence should become a price or contingency discussion."
    ),
    {
      label: "Market pressure",
      stance: demand.includes("high") ? "watch" : demand.includes("low") ? "positive" : "watch",
      helper: demand.includes("high")
        ? "High demand means move faster, but keep verification milestones."
        : demand.includes("low")
          ? "Lower demand can support a firmer buyer-first opening."
          : "Use a balanced opening and let seller response reveal urgency.",
    },
  ];
  const riskCount = signals.filter((signal) => signal.stance === "risk").length;
  const watchCount = signals.filter((signal) => signal.stance === "watch").length;
  const confidence: BuyerNegotiationPlan["confidence"] =
    riskCount > 0 ? "Cautious" : watchCount > 1 ? "Balanced" : "Strong";
  const leverage: BuyerNegotiationPlan["leverage"] =
    riskCount > 0 || demand.includes("low")
      ? "Buyer leverage"
      : demand.includes("high") && trustScore >= 70
        ? "Seller leverage"
        : "Balanced leverage";
  const nextSteps = [
    trustScore < 70 ? "Request title, mandate, lease, or agreement proof before raising the offer." : null,
    readinessScore < 75 ? "Complete the remote buyer checklist before committing funds." : null,
    mediaScore > 0 && mediaScore < 70 ? "Ask for a video walkthrough, missing room photos, and floor plan." : null,
    isSale
      ? "Keep the offer valid for 3-5 business days and tie deposit release to escrow milestones."
      : "Confirm refundable deposit rules, utility handoff, and repair responsibility in writing.",
    "Move accepted terms into the deal room so payments, documents, and handoff stay traceable.",
  ].filter((step): step is string => Boolean(step));

  return {
    anchor: Math.round(price * anchorRate),
    target: Math.round(price * targetRate),
    stretch: Math.round(price * stretchRate),
    confidence,
    leverage,
    message: `I am interested in ${address}. Based on the evidence, verification status, and closing reserve, I would like to discuss terms around ${formatMoney(
      Math.round(price * targetRate),
      currency
    )} subject to document review and tracked payment milestones.`,
    signals,
    nextSteps,
  };
}

export function buildViewingPrepPlan(input: {
  listing?: any;
  property?: any;
  mediaItems?: any[];
  readinessScore?: number | null;
}): ViewingPrepPlan {
  const listing = input.listing || {};
  const property = input.property || listing.property || {};
  const mediaItems = input.mediaItems || property.media || property.property_media || [];
  const readinessScore = clampScore(input.readinessScore);
  const hasCoordinates =
    typeof property.latitude === "number" && typeof property.longitude === "number";
  const hasVideoEvidence = mediaItems.some((item: any) =>
    ["video", "virtual_tour", "floor_plan"].includes(item.media_type)
  );
  const mediaCount = mediaItems.length;
  const mode: ViewingPrepPlan["mode"] =
    readinessScore >= 75 && hasVideoEvidence
      ? "Remote-first"
      : readinessScore >= 50 || hasCoordinates || mediaCount >= 3
        ? "Hybrid"
        : "In-person";
  const isSale = listing.listing_type === "sale";
  const checklist: ViewingPrepItem[] = [
    {
      label: "Address and arrival route",
      helper: hasCoordinates
        ? "Open the map pin, confirm landmark directions, and save the route before the visit."
        : "Ask the team for GhanaPostGPS, a map pin, and nearby landmark before traveling.",
      priority: hasCoordinates ? "medium" : "high",
    },
    {
      label: "Room-by-room evidence",
      helper:
        mediaCount >= 5
          ? "Use the existing media to focus the viewing on defects and missing angles."
          : "Capture photos or video of every room, exterior, access road, meters, and fixtures.",
      priority: mediaCount >= 5 ? "medium" : "high",
    },
    {
      label: "Utilities and service test",
      helper: "Check water flow, electricity, backup power, internet signal, drainage, security, and waste service.",
      priority: "high",
    },
    {
      label: isSale ? "Document match" : "Lease and inventory match",
      helper: isSale
        ? "Confirm the inspected property matches the title, mandate, plan, and seller authority."
        : "Confirm inventory, deposit rules, move-in condition, and who repairs what.",
      priority: "high",
    },
    {
      label: "Neighborhood timing check",
      helper: "Visit near commute hours or after rain when possible to test traffic, access, noise, and flooding.",
      priority: property.flood_risk_level === "high" ? "urgent" : "medium",
    },
  ];
  const arrivalNotes = [
    property.ghana_post_gps ? `Use GhanaPostGPS ${property.ghana_post_gps} as the first route check.` : null,
    hasCoordinates ? "Share live location with your buyer group or local representative." : "Request a precise pin before dispatching a local representative.",
    property.flood_risk_level === "high" ? "Prioritize drainage, access road, and rainy-season proof." : null,
    "Bring ID, keep receipts, and avoid cash handoff outside the tracked deal room.",
  ].filter((note): note is string => Boolean(note));

  return {
    mode,
    headline:
      mode === "Remote-first"
        ? "This listing can start with remote review before a final representative visit."
        : mode === "Hybrid"
          ? "Use remote evidence first, then send a representative for the gaps."
          : "Plan an in-person or representative-led viewing before making commitments.",
    checklist,
    arrivalNotes,
  };
}

export function buildBuyingGroupPlan(input: {
  savedProperties?: any[];
  dealCases?: any[];
  conversations?: any[];
}) {
  const savedCount = input.savedProperties?.length || 0;
  const activeDeals = (input.dealCases || []).filter(
    (dealCase) => !["closed", "rejected"].includes(dealCase.status)
  ).length;
  const unreadThreads = (input.conversations || []).filter((conversation) =>
    (conversation.messages || []).some((message: any) => !message.read_at)
  ).length;

  return {
    roles: [
      {
        label: "Buyer",
        helper: "Own shortlist, budget, offer terms, and final approval.",
      },
      {
        label: "Family reviewer",
        helper: "Compare saved homes, comment on location, and join walkthroughs.",
      },
      {
        label: "Legal reviewer",
        helper: "Review title, mandate, lease, and payment milestone documents.",
      },
      {
        label: "Local representative",
        helper: "Attend viewings, inspect condition, and confirm handoff details.",
      },
    ],
    actions: [
      savedCount > 0 ? `${savedCount} saved listing(s) ready to share.` : "Save at least two listings before inviting reviewers.",
      activeDeals > 0 ? `${activeDeals} active deal room(s) can anchor the group.` : "Start an inquiry to create a deal room.",
      unreadThreads > 0 ? `${unreadThreads} thread(s) need group visibility.` : "Keep questions in one shared conversation.",
    ],
  };
}

export function buildAgentCrmActions(input: {
  cases?: any[];
  leads?: any[];
  viewings?: any[];
  payments?: any[];
}) {
  const cases = input.cases || [];
  const leads = input.leads || [];
  const viewings = input.viewings || [];
  const payments = input.payments || [];
  const staleCases = cases.filter((dealCase) => {
    const updatedAt = new Date(dealCase.updated_at || dealCase.created_at || 0).getTime();
    return Date.now() - updatedAt > 1000 * 60 * 60 * 24 * 2 && !["closed", "rejected"].includes(dealCase.status);
  });
  const hotLeads = leads.filter((lead) => Number(lead.lead_score || lead.leadScore || 0) >= 75);
  const pendingViewings = viewings.filter((viewing) => ["requested", "pending"].includes(viewing.status));
  const pendingPayments = payments.filter((payment) => ["pending", "initialized"].includes(payment.status));

  return [
    {
      label: "Contact hot leads",
      count: hotLeads.length,
      helper: hotLeads.length
        ? "High-intent leads should receive same-day follow-up."
        : "No high-scoring external leads are waiting.",
    },
    {
      label: "Revive stale deal rooms",
      count: staleCases.length,
      helper: staleCases.length
        ? "Send a next-step reminder before the buyer cools off."
        : "Active deal rooms are recently touched.",
    },
    {
      label: "Confirm viewing requests",
      count: pendingViewings.length,
      helper: "Unconfirmed tours should be assigned or rescheduled quickly.",
    },
    {
      label: "Close payment gaps",
      count: pendingPayments.length,
      helper: "Booking fee, deposit, and receipt follow-up are conversion moments.",
    },
  ];
}

export function buildSellerPortalHealth(input: {
  listings?: any[];
  cases?: any[];
  documents?: any[];
  payments?: any[];
}) {
  const listings = input.listings || [];
  const cases = input.cases || [];
  const documents = input.documents || [];
  const payments = input.payments || [];
  const listedCount = listings.filter((listing) => listing.status === "listed").length;
  const avgQuality =
    listings.length > 0
      ? Math.round(
          listings.reduce((total, listing) => total + Number(listing.quality_score || 0), 0) /
            listings.length
        )
      : 0;
  const activeDemand = cases.filter((dealCase) => !["closed", "rejected"].includes(dealCase.status)).length;
  const signedDocs = documents.filter((document) => document.status === "signed").length;
  const successfulPayments = payments.filter((payment) => payment.status === "success").length;
  const score = Math.min(
    100,
    Math.round(avgQuality * 0.35 + Math.min(activeDemand, 8) * 5 + signedDocs * 4 + successfulPayments * 6)
  );

  return {
    score,
    listedCount,
    activeDemand,
    signedDocs,
    successfulPayments,
    actions: [
      avgQuality >= 75 ? "Listing quality is healthy." : "Improve photos, address confidence, and amenities.",
      activeDemand > 0 ? "Respond to active buyers before they compare away." : "Launch a referral or featured campaign.",
      signedDocs > 0 ? "Signed paperwork is available for stronger trust." : "Publish mandate/title/lease proof where safe.",
      successfulPayments > 0 ? "Payment proof can support seller confidence." : "Guide buyers toward protected payment milestones.",
    ],
  };
}

export function buildSellerNetSheet(input: {
  listings?: any[];
  cases?: any[];
  payments?: any[];
  commissionPercent?: number;
  sellerClosingPercent?: number;
  repairReservePercent?: number;
  marketingPercent?: number;
}): SellerNetSheet {
  const listings = input.listings || [];
  const cases = input.cases || [];
  const payments = input.payments || [];
  const listedInventory = listings.filter((listing) => listing.status === "listed");
  const inventoryPool = listedInventory.length > 0 ? listedInventory : listings;
  const grossInventoryValue = inventoryPool.reduce(
    (total, listing) => total + Number(listing.price || 0),
    0
  );
  const activePipelineValue = cases
    .filter((dealCase) => !["closed", "rejected"].includes(dealCase.status))
    .reduce((total, dealCase) => total + Number(dealCase.listing?.price || 0), 0);
  const collectedProofValue = payments
    .filter((payment) => payment.status === "success")
    .reduce((total, payment) => total + Number(payment.amount_minor || 0) / 100, 0);
  const projectionBasis = activePipelineValue || grossInventoryValue;
  const estimatedCommission = projectionBasis * ((input.commissionPercent ?? 3) / 100);
  const legalAndClosing = projectionBasis * ((input.sellerClosingPercent ?? 1.25) / 100);
  const repairReserve = projectionBasis * ((input.repairReservePercent ?? 1) / 100);
  const marketingReserve = grossInventoryValue * ((input.marketingPercent ?? 0.5) / 100);
  const estimatedClosingCosts = legalAndClosing + repairReserve + marketingReserve;
  const ownerNetProjection = Math.max(
    projectionBasis - estimatedCommission - estimatedClosingCosts,
    0
  );
  const lineItems: DecisionLineItem[] = [
    {
      label: "Projected gross basis",
      amount: projectionBasis,
      helper: activePipelineValue
        ? "Uses active buyer pipeline value because live demand exists."
        : "Uses listed inventory value until buyer demand is attached.",
    },
    {
      label: "Agency commission reserve",
      amount: estimatedCommission,
      helper: "Modeled agency, broker, or facilitation commission reserve.",
    },
    {
      label: "Legal and closing reserve",
      amount: legalAndClosing,
      helper: "Agreement review, ownership paperwork, filing, and handoff admin.",
    },
    {
      label: "Repair and make-ready reserve",
      amount: repairReserve,
      helper: "Owner buffer for inspection defects, cleaning, keys, utilities, and small repairs.",
    },
    {
      label: "Marketing and trust proof reserve",
      amount: marketingReserve,
      helper: "Media refresh, featured campaign, verification documents, or owner update collateral.",
    },
  ];

  return {
    grossInventoryValue,
    activePipelineValue,
    collectedProofValue,
    estimatedCommission,
    estimatedClosingCosts,
    ownerNetProjection,
    lineItems,
    guidance:
      projectionBasis > 0
        ? "Use this as a planning net sheet, then replace modeled reserves with signed mandate, commission, and closing instructions."
        : "Add listing prices or active deal rooms before sending an owner net projection.",
  };
}

export function buildListingLaunchPlan(input: {
  listings?: any[];
  cases?: any[];
  documents?: any[];
}): ListingLaunchPlan {
  const listings = input.listings || [];
  const cases = input.cases || [];
  const documents = input.documents || [];
  const listedCount = listings.filter((listing) => listing.status === "listed").length;
  const readyCount = listings.filter(
    (listing) => listing.status === "listed" && Number(listing.quality_score || 0) >= 75
  ).length;
  const averageQuality =
    listings.length > 0
      ? Math.round(
          listings.reduce((total, listing) => total + Number(listing.quality_score || 0), 0) /
            listings.length
        )
      : 0;
  const activeDemand = cases.filter((dealCase) => !["closed", "rejected"].includes(dealCase.status)).length;
  const signedOrPublicDocs = documents.filter((document) =>
    ["signed", "published", "approved"].includes(String(document.status || ""))
  ).length;
  const lowQualityCount = listings.filter((listing) => Number(listing.quality_score || 0) < 70).length;
  const needsWorkCount =
    listings.filter((listing) => listing.status !== "listed").length + lowQualityCount;
  const actions: ListingLaunchAction[] = [
    {
      label: "Publish ready inventory",
      status: listedCount > 0 ? "ready" : "blocked",
      helper: listedCount > 0
        ? `${listedCount} listing(s) are live for buyer discovery.`
        : "Publish at least one listing before sending owners a market update.",
    },
    {
      label: "Raise listing quality",
      status: averageQuality >= 75 ? "ready" : averageQuality >= 60 ? "watch" : "blocked",
      helper: averageQuality >= 75
        ? "Quality is strong enough for owner reporting."
        : "Improve photos, description, address confidence, amenities, and verification before scaling demand.",
    },
    {
      label: "Attach seller proof",
      status: signedOrPublicDocs > 0 ? "ready" : "watch",
      helper: signedOrPublicDocs > 0
        ? `${signedOrPublicDocs} proof document(s) can support owner confidence.`
        : "Add mandate, title, lease, owner approval, or inspection proof where safe.",
    },
    {
      label: "Convert active demand",
      status: activeDemand > 0 ? "ready" : "watch",
      helper: activeDemand > 0
        ? `${activeDemand} active buyer flow(s) should be included in the owner update.`
        : "Launch referral, featured listing, or diaspora campaign to create owner-visible demand.",
    },
  ];
  const ownerUpdate =
    listings.length === 0
      ? "No owner update is ready yet. Add inventory, prices, media, and proof first."
      : `Owner update: ${readyCount}/${listings.length} listing(s) are owner-ready, average quality is ${averageQuality}/100, and ${activeDemand} active buyer flow(s) need follow-up.`;

  return {
    readyCount,
    needsWorkCount,
    averageQuality,
    ownerUpdate,
    actions,
  };
}

export function buildPropertyComparisonRows(properties: ComparisonProperty[]) {
  const allAmenities = Array.from(
    new Set(properties.flatMap((property) => property.amenities || []).filter(Boolean))
  ).slice(0, 8);

  return [
    {
      label: "Price",
      values: properties.map((property) => formatMoney(property.price, property.currency || "GHS")),
    },
    {
      label: "Listing Type",
      values: properties.map((property) => formatLabel(property.listingType)),
    },
    {
      label: "Property Type",
      values: properties.map((property) => formatLabel(property.category)),
    },
    {
      label: "Bedrooms",
      values: properties.map((property) =>
        property.bedrooms != null ? String(property.bedrooms) : "N/A"
      ),
    },
    {
      label: "Bathrooms",
      values: properties.map((property) =>
        property.bathrooms != null ? String(property.bathrooms) : "N/A"
      ),
    },
    {
      label: "Size",
      values: properties.map((property) =>
        property.squareMeters ? `${property.squareMeters} sqm` : "N/A"
      ),
    },
    {
      label: "Trust Score",
      values: properties.map((property) =>
        property.qualityScore != null ? `${Math.round(property.qualityScore)}/100` : "Pending"
      ),
    },
    {
      label: "Address Confidence",
      values: properties.map((property) =>
        property.locationConfidence != null ? `${Math.round(property.locationConfidence)}%` : "N/A"
      ),
    },
    {
      label: "Flood Risk",
      values: properties.map((property) => formatLabel(property.floodRiskLevel || "unknown")),
    },
    ...allAmenities.map((amenity) => ({
      label: amenity,
      values: properties.map((property) =>
        (property.amenities || []).includes(amenity) ? "Included" : "Not listed"
      ),
    })),
  ];
}

export function buildDealTimeline(input: {
  dealCase: any;
  viewings?: any[];
  payments?: any[];
  documents?: any[];
  messages?: any[];
}) {
  const events: DealTimelineEvent[] = [];
  const { dealCase, viewings = [], payments = [], documents = [], messages = [] } = input;

  if (dealCase) {
    events.push({
      id: `lead-${dealCase.id}`,
      title: formatCaseType(dealCase.case_type),
      description: `${formatLabel(dealCase.pipeline_stage || dealCase.status)} stage`,
      timestamp: dealCase.updated_at || dealCase.created_at,
      type: "lead",
    });
  }

  viewings.forEach((viewing) => {
    events.push({
      id: `viewing-${viewing.id}`,
      title: `Viewing ${formatLabel(viewing.status)}`,
      description: viewing.listing?.property?.address || "Property viewing",
      timestamp: viewing.confirmed_datetime || viewing.requested_datetime || viewing.created_at,
      type: "viewing",
    });
  });

  payments.forEach((payment) => {
    events.push({
      id: `payment-${payment.id}`,
      title: `${formatLabel(payment.purpose)} payment`,
      description: `${formatLabel(payment.status)} / ${formatMoney(
        payment.amount_minor,
        payment.currency || "GHS",
        { isMinor: true }
      )}`,
      timestamp: payment.paid_at || payment.updated_at || payment.created_at,
      type: "payment",
    });
  });

  documents.forEach((document) => {
    events.push({
      id: `document-${document.id}`,
      title: document.title || formatLabel(document.document_type),
      description: `${formatLabel(document.status)} / ${formatLabel(document.document_type)}`,
      timestamp: document.signed_at || document.updated_at || document.created_at,
      type: "document",
    });
  });

  messages.forEach((message) => {
    events.push({
      id: `message-${message.id}`,
      title: "Conversation update",
      description:
        stripReferralMetadata(String(message.content || "")).slice(0, 120) ||
        "Lead conversation updated.",
      timestamp: message.created_at,
      type: "message",
    });
  });

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function buildOfferSuggestion(input: {
  listingPrice?: number | null;
  caseType?: string | null;
  priority?: string | null;
}) {
  const basePrice = Number(input.listingPrice || 0);
  if (!basePrice) {
    return {
      anchor: 0,
      stretch: 0,
      closeTarget: 0,
    };
  }

  const negotiationBand =
    input.caseType === "purchase_offer"
      ? { anchor: 0.93, stretch: 0.97, closeTarget: 0.95 }
      : { anchor: 0.96, stretch: 1, closeTarget: 0.98 };

  const priorityBoost = input.priority === "urgent" ? 0.01 : input.priority === "high" ? 0.005 : 0;

  return {
    anchor: Math.round(basePrice * (negotiationBand.anchor + priorityBoost)),
    stretch: Math.round(basePrice * Math.min(1.02, negotiationBand.stretch + priorityBoost)),
    closeTarget: Math.round(basePrice * Math.min(1.01, negotiationBand.closeTarget + priorityBoost)),
  };
}

export function parseOfferSummary(message?: string | null): ParsedOfferSummary | null {
  if (!message) return null;

  const lines = stripReferralMetadata(message)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const amountLine = lines.find((line) => line.startsWith("Offer amount:"));
  const financingLine = lines.find((line) => line.startsWith("Financing:"));
  const closeLine = lines.find((line) => line.startsWith("Target close date:"));
  const buyerLine = lines.find((line) => line.startsWith("Buyer:"));
  const phoneLine = lines.find((line) => line.startsWith("Phone:"));
  const notesStartIndex = lines.findIndex((line) => line.startsWith("Phone:"));
  const amountMatch = amountLine?.match(/([\d,]+(?:\.\d+)?)/);

  const notes =
    notesStartIndex >= 0
      ? lines
          .slice(notesStartIndex + 1)
          .join(" ")
          .trim() || null
      : null;

  if (!amountLine && !financingLine && !closeLine && !buyerLine) {
    return null;
  }

  return {
    amount: amountMatch ? Number(amountMatch[1].replaceAll(",", "")) : null,
    financing: financingLine?.replace("Financing:", "").trim() || null,
    targetCloseDate: closeLine?.replace("Target close date:", "").trim() || null,
    buyerName: buyerLine?.replace("Buyer:", "").trim() || null,
    buyerPhone: phoneLine?.replace("Phone:", "").trim() || null,
    notes,
  };
}

export function buildAgentPerformanceSnapshot(input: {
  cases: any[];
  viewings: any[];
  payments: any[];
  members: Record<string, any>;
}) {
  const rows = new Map<string, AgentPerformanceRow>();

  const ensureRow = (memberId: string) => {
    if (!rows.has(memberId)) {
      const member = input.members[memberId];
      rows.set(memberId, {
        id: memberId,
        name: member?.full_name || member?.email || "Team member",
        activeLeads: 0,
        negotiations: 0,
        wonDeals: 0,
        assignedViewings: 0,
        completedViewings: 0,
        verifiedPayments: 0,
        collectedRevenueMinor: 0,
      });
    }

    return rows.get(memberId)!;
  };

  input.cases.forEach((dealCase) => {
    if (!dealCase.assigned_to) return;
    const row = ensureRow(dealCase.assigned_to);
    if (!["closed", "rejected"].includes(dealCase.status)) row.activeLeads += 1;
    if (dealCase.pipeline_stage === "negotiation") row.negotiations += 1;
    if (dealCase.pipeline_stage === "won" || dealCase.status === "closed") row.wonDeals += 1;
  });

  input.viewings.forEach((viewing) => {
    if (!viewing.assigned_to) return;
    const row = ensureRow(viewing.assigned_to);
    row.assignedViewings += 1;
    if (viewing.status === "completed") row.completedViewings += 1;
  });

  input.payments.forEach((payment) => {
    const ownerId = payment.deal_case?.assigned_to || payment.assigned_to || payment.viewing?.assigned_to || null;
    if (!ownerId) return;

    const row = ensureRow(ownerId);
    if (payment.status === "success") {
      row.collectedRevenueMinor += Number(payment.amount_minor || 0);

      const receipt = Array.isArray(payment.receipt) ? payment.receipt[0] : payment.receipt;
      if (receipt?.blockchain_status === "confirmed") {
        row.verifiedPayments += 1;
      }
    }
  });

  return Array.from(rows.values()).sort((a, b) => {
    const revenueDiff = b.collectedRevenueMinor - a.collectedRevenueMinor;
    if (revenueDiff !== 0) return revenueDiff;
    return b.wonDeals - a.wonDeals;
  });
}

export function buildReferralLink(baseUrl: string, identifier: string, channel: string) {
  const url = new URL(baseUrl || "https://baytmiftah.example");
  url.searchParams.set("ref", identifier);
  url.searchParams.set("channel", channel);
  return url.toString();
}

export function getMaintenancePlaybooks() {
  return [
    {
      key: "move_in",
      title: "Move-in Handoff",
      helper: "Keys, inventory, utilities, and first-week check-in.",
    },
    {
      key: "preventive",
      title: "Preventive Maintenance",
      helper: "Quarterly HVAC, plumbing, generator, and water tank review.",
    },
    {
      key: "renewal",
      title: "Renewal & Retention",
      helper: "Pre-renewal outreach, pricing review, and property refresh scope.",
    },
  ];
}
