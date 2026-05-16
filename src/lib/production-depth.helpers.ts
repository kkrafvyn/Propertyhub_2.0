export type EscrowMilestoneType =
  | "identity_agency_check"
  | "viewing_walkthrough"
  | "offer_terms"
  | "document_review"
  | "protected_payment"
  | "handoff"
  | "custom";

export type EscrowMilestoneStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "waived";

export type CrmTaskType =
  | "hot_lead_follow_up"
  | "stale_deal_nudge"
  | "viewing_confirmation"
  | "payment_follow_up"
  | "document_follow_up"
  | "custom";

export type CrmTaskPriority = "low" | "medium" | "high" | "urgent";

export interface EscrowMilestoneDraft {
  milestone_type: EscrowMilestoneType;
  label: string;
  status: EscrowMilestoneStatus;
  due_at: string;
  release_conditions: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface CrmTaskDraft {
  task_type: CrmTaskType;
  priority: CrmTaskPriority;
  status: "open";
  due_at: string;
  title: string;
  description: string;
  lead_id?: string | null;
  deal_case_id?: string | null;
  assigned_to?: string | null;
  metadata: Record<string, unknown>;
}

export interface MediaReadinessSummary {
  score: number;
  photos: number;
  videos: number;
  floorPlans: number;
  virtualTours: number;
  documents: number;
  readyItems: number;
  pendingItems: number;
  actions: string[];
}

function addDays(baseDate: Date, days: number) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function getListingType(dealCase: any) {
  return dealCase?.listing?.listing_type || dealCase?.listing_type || "rental";
}

function getDealAddress(dealCase: any) {
  return dealCase?.listing?.property?.address || "this property";
}

export function buildDefaultEscrowMilestoneDrafts(input: {
  dealCase: any;
  now?: Date;
}): EscrowMilestoneDraft[] {
  const baseDate = input.now || new Date();
  const saleFlow = getListingType(input.dealCase) === "sale";
  const address = getDealAddress(input.dealCase);

  return [
    {
      milestone_type: "identity_agency_check",
      label: "Identity and agency check",
      status: "pending",
      due_at: addDays(baseDate, 1),
      release_conditions: {
        required: ["buyer_identity", "agency_authorization"],
      },
      metadata: {
        address,
        guidance: "Confirm buyer identity and the listing team's authority before money moves.",
      },
    },
    {
      milestone_type: "viewing_walkthrough",
      label: saleFlow ? "Viewing or virtual walkthrough" : "Inspection or move-in walkthrough",
      status: "pending",
      due_at: addDays(baseDate, 3),
      release_conditions: {
        required: ["condition_notes", "photo_or_video_evidence"],
      },
      metadata: {
        address,
        guidance: "Document condition, access, utilities, and visible defects.",
      },
    },
    {
      milestone_type: "offer_terms",
      label: saleFlow ? "Offer terms captured" : "Lease terms captured",
      status: "pending",
      due_at: addDays(baseDate, 5),
      release_conditions: {
        required: saleFlow ? ["price", "close_date", "contingencies"] : ["rent", "term", "deposit"],
      },
      metadata: {
        address,
        guidance: "Keep pricing, timing, contingencies, and approval notes in the deal room.",
      },
    },
    {
      milestone_type: "document_review",
      label: saleFlow ? "Title and agreement review" : "Lease and inventory review",
      status: "pending",
      due_at: addDays(baseDate, 7),
      release_conditions: {
        required: saleFlow ? ["title_or_mandate", "draft_agreement"] : ["lease", "inventory"],
      },
      metadata: {
        address,
        guidance: "Attach signed documents, legal notes, and requested changes.",
      },
    },
    {
      milestone_type: "protected_payment",
      label: "Protected payment milestone",
      status: "pending",
      due_at: addDays(baseDate, 10),
      release_conditions: {
        required: ["tracked_payment", "receipt_review"],
      },
      metadata: {
        address,
        guidance: "Use a tracked payment route and confirm receipt before release or handoff.",
      },
    },
    {
      milestone_type: "handoff",
      label: saleFlow ? "Closing and handoff" : "Move-in handoff",
      status: "pending",
      due_at: addDays(baseDate, 14),
      release_conditions: {
        required: ["keys_or_access", "final_condition_note"],
      },
      metadata: {
        address,
        guidance: "Finish keys, utilities, contact notes, and first-service expectations.",
      },
    },
  ];
}

export function buildCrmTaskDrafts(input: {
  cases?: any[];
  leads?: any[];
  viewings?: any[];
  payments?: any[];
  now?: Date;
}): CrmTaskDraft[] {
  const now = input.now || new Date();
  const soon = addDays(now, 1);
  const drafts: CrmTaskDraft[] = [];

  (input.leads || [])
    .filter((lead) => Number(lead.lead_score || lead.leadScore || 0) >= 75)
    .slice(0, 10)
    .forEach((lead) => {
      const score = Number(lead.lead_score || lead.leadScore || 0);
      drafts.push({
        task_type: "hot_lead_follow_up",
        priority: score >= 90 ? "urgent" : "high",
        status: "open",
        due_at: soon,
        title: `Follow up with ${lead.lead_name || lead.leadName || "hot lead"}`,
        description: `Lead score ${Math.round(score)} from ${lead.source || "incoming source"}. Send same-day response and route to a deal room if qualified.`,
        lead_id: lead.id || null,
        assigned_to: lead.assigned_to || lead.assignedTo || null,
        metadata: {
          leadScore: score,
          source: lead.source || null,
        },
      });
    });

  (input.cases || [])
    .filter((dealCase) => {
      const updatedAt = new Date(dealCase.updated_at || dealCase.created_at || 0).getTime();
      const stale = now.getTime() - updatedAt > 1000 * 60 * 60 * 24 * 2;
      return stale && !["closed", "rejected"].includes(String(dealCase.status || ""));
    })
    .slice(0, 10)
    .forEach((dealCase) => {
      drafts.push({
        task_type: "stale_deal_nudge",
        priority: dealCase.priority === "urgent" ? "urgent" : "high",
        status: "open",
        due_at: soon,
        title: `Revive ${dealCase.listing?.property?.address || "stale deal room"}`,
        description: "Send the buyer a clear next step before the opportunity cools off.",
        deal_case_id: dealCase.id || null,
        assigned_to: dealCase.assigned_to || null,
        metadata: {
          caseType: dealCase.case_type || null,
          lastTouchedAt: dealCase.updated_at || dealCase.created_at || null,
        },
      });
    });

  (input.viewings || [])
    .filter((viewing) => ["requested", "pending"].includes(String(viewing.status || "")))
    .slice(0, 10)
    .forEach((viewing) => {
      drafts.push({
        task_type: "viewing_confirmation",
        priority: "medium",
        status: "open",
        due_at: soon,
        title: `Confirm viewing for ${viewing.listing?.property?.address || "property"}`,
        description: "Assign an agent, confirm time, and add arrival instructions.",
        deal_case_id: viewing.deal_case_id || null,
        assigned_to: viewing.assigned_to || null,
        metadata: {
          viewingId: viewing.id || null,
          requestedAt: viewing.requested_datetime || null,
        },
      });
    });

  (input.payments || [])
    .filter((payment) => ["pending", "initialized"].includes(String(payment.status || "")))
    .slice(0, 10)
    .forEach((payment) => {
      drafts.push({
        task_type: "payment_follow_up",
        priority: "high",
        status: "open",
        due_at: soon,
        title: `Follow up ${String(payment.purpose || "payment").replaceAll("_", " ")}`,
        description: "Confirm whether the buyer needs a new checkout link, receipt review, or payment guidance.",
        deal_case_id: payment.deal_case_id || null,
        assigned_to: payment.assigned_to || null,
        metadata: {
          paymentId: payment.id || null,
          status: payment.status || null,
          amountMinor: payment.amount_minor || null,
        },
      });
    });

  return drafts;
}

export function buildPropertyMediaReadiness(mediaItems: any[] = []): MediaReadinessSummary {
  const photos = mediaItems.filter((item) => !item.media_type || item.media_type === "photo").length;
  const videos = mediaItems.filter((item) => item.media_type === "video").length;
  const floorPlans = mediaItems.filter((item) => item.media_type === "floor_plan").length;
  const virtualTours = mediaItems.filter((item) => item.media_type === "virtual_tour").length;
  const documents = mediaItems.filter((item) => item.media_type === "document").length;
  const readyItems = mediaItems.filter((item) => !item.processing_status || item.processing_status === "ready").length;
  const pendingItems = Math.max(mediaItems.length - readyItems, 0);
  const score = Math.min(
    100,
    photos >= 8 ? 45 : photos >= 5 ? 35 : photos >= 3 ? 25 : photos > 0 ? 15 : 0
  ) + Math.min(55, videos * 15 + floorPlans * 15 + virtualTours * 15 + documents * 10);

  const actions = [
    photos >= 5 ? "Photo coverage is ready for remote review." : "Add at least five room-by-room photos.",
    videos > 0 ? "Video walkthrough is attached." : "Request a short video walkthrough for remote buyers.",
    floorPlans > 0 ? "Floor plan is available for layout comparison." : "Attach a floor plan or dimensions before serious offers.",
    virtualTours > 0 ? "Virtual tour support is ready." : "Add a 3D tour link for diaspora and executive buyers.",
    pendingItems > 0 ? `${pendingItems} media item(s) still need processing.` : "All attached media is marked ready.",
  ];

  return {
    score: Math.min(100, score),
    photos,
    videos,
    floorPlans,
    virtualTours,
    documents,
    readyItems,
    pendingItems,
    actions,
  };
}

export function buildConciergeResponsePreview(input: {
  prompt: string;
  listing?: any;
  dealCase?: any;
}) {
  const listing = input.listing || input.dealCase?.listing || {};
  const property = listing.property || {};
  const address = property.address || "this property";
  const city = property.city || "the local market";
  const price = listing.price ? `GHS ${Number(listing.price).toLocaleString()}` : "the listed price";
  const isSale = listing.listing_type === "sale" || input.dealCase?.case_type === "purchase_offer";

  return [
    `For ${address}, start with the safest next action rather than the fastest one.`,
    isSale
      ? `Pressure-test the ${price} ask against comparable ${city} listings, then confirm title or mandate proof before offer money moves.`
      : `Confirm viewing condition, lease terms, utility responsibility, and deposit handling before you commit to ${price}.`,
    "Keep every answer, document, and receipt inside the deal room so family, legal, and local reviewers see the same source of truth.",
    `Your prompt was: ${input.prompt}`,
  ].join(" ");
}
