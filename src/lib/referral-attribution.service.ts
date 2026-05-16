import { hasReferralContext, type ReferralContext } from "./referral-context";

export type ReferralEventType =
  | "visit"
  | "search_alert"
  | "buyer_request"
  | "deal_case_created"
  | "deal_won";

export interface ReferralEvent {
  id: string;
  eventType: ReferralEventType;
  referrerKey: string;
  channel: string;
  createdAt: string;
  source?: string | null;
  landingPath?: string | null;
  organizationId?: string | null;
  listingId?: string | null;
  dealCaseId?: string | null;
  caseType?: string | null;
  rewardEstimateMinor?: number | null;
}

export interface ReferralCampaignPerformance {
  referrerKey: string;
  channel: string;
  visits: number;
  savedAlerts: number;
  buyerRequests: number;
  leads: number;
  wonDeals: number;
  estimatedRewardMinor: number;
  lastTouchedAt: string | null;
  recentActivity: ReferralEvent[];
}

export interface ReferralPerformanceSnapshot {
  totals: {
    visits: number;
    savedAlerts: number;
    buyerRequests: number;
    leads: number;
    wonDeals: number;
    estimatedRewardMinor: number;
  };
  campaigns: ReferralCampaignPerformance[];
}

interface ReferralMetadataPayload {
  ref: string;
  channel: string;
  capturedAt?: string | null;
  source?: string | null;
}

const STORAGE_KEY = "baytmiftah_referral_events_v1";
const EVENT_LIMIT = 250;
const REFERRAL_METADATA_PATTERN = /<!--\s*baytmiftah:referral\s+(\{.*?\})\s*-->$/s;

const LEAD_REWARD_BY_CASE_TYPE: Record<string, number> = {
  purchase_offer: 15000,
  rental_application: 8000,
  lease_application: 10000,
};

const WIN_REWARD_BY_CASE_TYPE: Record<string, number> = {
  purchase_offer: 95000,
  rental_application: 30000,
  lease_application: 45000,
};

function normalizeValue(value?: string | null) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function createEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `referral-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function normalizeContext(context?: ReferralContext | null) {
  return {
    ref: normalizeValue(context?.ref),
    channel: normalizeValue(context?.channel) || "trusted-referral",
  };
}

function readStoredEvents() {
  if (typeof window === "undefined") return [] as ReferralEvent[];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ReferralEvent[]) : [];
  } catch (error) {
    console.error("Failed to read referral attribution events:", error);
    return [];
  }
}

function writeStoredEvents(events: ReferralEvent[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, EVENT_LIMIT)));
  } catch (error) {
    console.error("Failed to persist referral attribution events:", error);
  }
}

function isRecentDuplicate(events: ReferralEvent[], candidate: ReferralEvent) {
  if (candidate.eventType !== "visit") return false;

  const candidateTime = new Date(candidate.createdAt).getTime();
  return events.some((event) => {
    if (
      event.eventType !== candidate.eventType ||
      event.referrerKey !== candidate.referrerKey ||
      event.channel !== candidate.channel ||
      event.landingPath !== candidate.landingPath
    ) {
      return false;
    }

    const eventTime = new Date(event.createdAt).getTime();
    return Math.abs(candidateTime - eventTime) < 1000 * 60 * 30;
  });
}

function rewardForCase(caseType?: string | null, won = false) {
  if (!caseType) return 0;
  return won
    ? WIN_REWARD_BY_CASE_TYPE[caseType] || 0
    : LEAD_REWARD_BY_CASE_TYPE[caseType] || 0;
}

export function stripReferralMetadata(message?: string | null) {
  return String(message || "").replace(REFERRAL_METADATA_PATTERN, "").trim();
}

export function appendReferralMetadata(
  message: string,
  context?: ReferralContext | null,
  extra?: { source?: string | null; capturedAt?: string | null }
) {
  if (!hasReferralContext(context) || !normalizeValue(context?.ref)) {
    return message;
  }

  const payload: ReferralMetadataPayload = {
    ref: normalizeValue(context?.ref)!,
    channel: normalizeValue(context?.channel) || "trusted-referral",
    capturedAt: normalizeValue(extra?.capturedAt) || new Date().toISOString(),
    source: normalizeValue(extra?.source),
  };

  const baseMessage = stripReferralMetadata(message);
  return `${baseMessage}\n\n<!-- baytmiftah:referral ${JSON.stringify(payload)} -->`;
}

export function parseReferralMetadata(message?: string | null) {
  const source = String(message || "");
  const match = source.match(REFERRAL_METADATA_PATTERN);
  if (!match?.[1]) return null;

  try {
    const parsed = JSON.parse(match[1]) as ReferralMetadataPayload;
    const ref = normalizeValue(parsed.ref);
    if (!ref) return null;

    return {
      ref,
      channel: normalizeValue(parsed.channel) || "trusted-referral",
      capturedAt: normalizeValue(parsed.capturedAt),
      source: normalizeValue(parsed.source),
    };
  } catch (error) {
    console.error("Failed to parse referral metadata:", error);
    return null;
  }
}

export function recordReferralEvent(input: Omit<ReferralEvent, "id" | "createdAt"> & { createdAt?: string }) {
  const referrerKey = normalizeValue(input.referrerKey);
  if (!referrerKey) return null;

  const nextEvent: ReferralEvent = {
    ...input,
    id: createEventId(),
    createdAt: input.createdAt || new Date().toISOString(),
    referrerKey,
    channel: normalizeValue(input.channel) || "trusted-referral",
    source: normalizeValue(input.source),
    landingPath: normalizeValue(input.landingPath),
    organizationId: normalizeValue(input.organizationId),
    listingId: normalizeValue(input.listingId),
    dealCaseId: normalizeValue(input.dealCaseId),
    caseType: normalizeValue(input.caseType),
    rewardEstimateMinor: input.rewardEstimateMinor ?? null,
  };

  const events = readStoredEvents();
  if (isRecentDuplicate(events, nextEvent)) {
    return nextEvent;
  }

  writeStoredEvents([nextEvent, ...events]);
  return nextEvent;
}

export function getStoredReferralEvents(referrerKey?: string | null) {
  const normalizedKey = normalizeValue(referrerKey);
  const events = readStoredEvents();
  if (!normalizedKey) return events;
  return events.filter((event) => event.referrerKey === normalizedKey);
}

export function trackReferralVisit(
  context?: ReferralContext | null,
  details?: { source?: string | null; landingPath?: string | null; listingId?: string | null; organizationId?: string | null }
) {
  const normalized = normalizeContext(context);
  if (!normalized.ref) return null;

  return recordReferralEvent({
    eventType: "visit",
    referrerKey: normalized.ref,
    channel: normalized.channel,
    source: details?.source || null,
    landingPath: details?.landingPath || null,
    listingId: details?.listingId || null,
    organizationId: details?.organizationId || null,
  });
}

export function trackReferralSearchAlert(
  context?: ReferralContext | null,
  details?: { source?: string | null; landingPath?: string | null }
) {
  const normalized = normalizeContext(context);
  if (!normalized.ref) return null;

  return recordReferralEvent({
    eventType: "search_alert",
    referrerKey: normalized.ref,
    channel: normalized.channel,
    source: details?.source || null,
    landingPath: details?.landingPath || null,
  });
}

export function trackReferralBuyerRequest(
  context?: ReferralContext | null,
  details?: { source?: string | null; landingPath?: string | null }
) {
  const normalized = normalizeContext(context);
  if (!normalized.ref) return null;

  return recordReferralEvent({
    eventType: "buyer_request",
    referrerKey: normalized.ref,
    channel: normalized.channel,
    source: details?.source || null,
    landingPath: details?.landingPath || null,
  });
}

export function trackReferralDealCaseCreated(
  context?: ReferralContext | null,
  details: {
    dealCaseId: string;
    caseType?: string | null;
    listingId?: string | null;
    organizationId?: string | null;
    source?: string | null;
  }
) {
  const normalized = normalizeContext(context);
  if (!normalized.ref) return null;

  return recordReferralEvent({
    eventType: "deal_case_created",
    referrerKey: normalized.ref,
    channel: normalized.channel,
    source: details.source || null,
    dealCaseId: details.dealCaseId,
    caseType: details.caseType || null,
    listingId: details.listingId || null,
    organizationId: details.organizationId || null,
    rewardEstimateMinor: rewardForCase(details.caseType, false),
  });
}

export function trackReferralDealWon(
  referrerKey: string,
  channel: string,
  details: { dealCaseId: string; caseType?: string | null; organizationId?: string | null }
) {
  return recordReferralEvent({
    eventType: "deal_won",
    referrerKey,
    channel,
    dealCaseId: details.dealCaseId,
    caseType: details.caseType || null,
    organizationId: details.organizationId || null,
    rewardEstimateMinor: rewardForCase(details.caseType, true),
  });
}

export function buildReferralPerformanceSnapshot(input: {
  events?: ReferralEvent[];
  cases?: any[];
  referrerKey?: string | null;
}) {
  const grouped = new Map<string, ReferralCampaignPerformance>();
  const normalizedFilter = normalizeValue(input.referrerKey);

  const ensureGroup = (referrerKey: string, channel: string) => {
    const key = `${referrerKey}::${channel}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        referrerKey,
        channel,
        visits: 0,
        savedAlerts: 0,
        buyerRequests: 0,
        leads: 0,
        wonDeals: 0,
        estimatedRewardMinor: 0,
        lastTouchedAt: null,
        recentActivity: [],
      });
    }

    return grouped.get(key)!;
  };

  const addTimestamp = (group: ReferralCampaignPerformance, createdAt?: string | null) => {
    if (!createdAt) return;
    if (!group.lastTouchedAt || new Date(createdAt).getTime() > new Date(group.lastTouchedAt).getTime()) {
      group.lastTouchedAt = createdAt;
    }
  };

  (input.events || []).forEach((event) => {
    if (normalizedFilter && event.referrerKey !== normalizedFilter) return;
    const group = ensureGroup(event.referrerKey, event.channel);
    group.recentActivity.push(event);
    addTimestamp(group, event.createdAt);

    switch (event.eventType) {
      case "visit":
        group.visits += 1;
        break;
      case "search_alert":
        group.savedAlerts += 1;
        break;
      case "buyer_request":
        group.buyerRequests += 1;
        break;
      case "deal_case_created":
        group.leads += 1;
        group.estimatedRewardMinor += Number(event.rewardEstimateMinor || 0);
        break;
      case "deal_won":
        group.wonDeals += 1;
        group.estimatedRewardMinor += Number(event.rewardEstimateMinor || 0);
        break;
    }
  });

  (input.cases || []).forEach((dealCase) => {
    const metadata = parseReferralMetadata(dealCase.message);
    if (!metadata?.ref) return;
    if (normalizedFilter && metadata.ref !== normalizedFilter) return;

    const group = ensureGroup(metadata.ref, metadata.channel);
    group.leads += 1;
    group.estimatedRewardMinor += rewardForCase(dealCase.case_type, false);
    addTimestamp(group, dealCase.updated_at || dealCase.created_at || null);

    const isWon = dealCase.pipeline_stage === "won" || dealCase.status === "closed";
    if (isWon) {
      group.wonDeals += 1;
      group.estimatedRewardMinor += rewardForCase(dealCase.case_type, true);
    }
  });

  const campaigns = [...grouped.values()]
    .map((campaign) => ({
      ...campaign,
      recentActivity: campaign.recentActivity
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    }))
    .sort((a, b) => {
      if (b.wonDeals !== a.wonDeals) return b.wonDeals - a.wonDeals;
      if (b.leads !== a.leads) return b.leads - a.leads;
      return new Date(b.lastTouchedAt || 0).getTime() - new Date(a.lastTouchedAt || 0).getTime();
    });

  return {
    totals: campaigns.reduce(
      (totals, campaign) => ({
        visits: totals.visits + campaign.visits,
        savedAlerts: totals.savedAlerts + campaign.savedAlerts,
        buyerRequests: totals.buyerRequests + campaign.buyerRequests,
        leads: totals.leads + campaign.leads,
        wonDeals: totals.wonDeals + campaign.wonDeals,
        estimatedRewardMinor: totals.estimatedRewardMinor + campaign.estimatedRewardMinor,
      }),
      {
        visits: 0,
        savedAlerts: 0,
        buyerRequests: 0,
        leads: 0,
        wonDeals: 0,
        estimatedRewardMinor: 0,
      }
    ),
    campaigns,
  } satisfies ReferralPerformanceSnapshot;
}
