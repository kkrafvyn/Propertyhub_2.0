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
  const url = new URL(baseUrl || "https://propertyhub.example");
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
