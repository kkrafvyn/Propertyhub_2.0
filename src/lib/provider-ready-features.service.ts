import { supabase } from "./supabase";
import type { PaymentGatewayProvider } from "./payment.service";

const db = supabase as any;

export type EditorialPostType =
  | "guide"
  | "market_report"
  | "legal_explainer"
  | "tutorial"
  | "newsletter"
  | "announcement";

export type SmsUssdChannel = "sms" | "ussd" | "whatsapp";

export interface EditorialDraftInput {
  title: string;
  body: string;
  postType?: EditorialPostType;
  authorUserId?: string | null;
  region?: string | null;
  city?: string | null;
  category?: string | null;
  seoDescription?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NewsletterSubscriptionInput {
  email: string;
  userId?: string | null;
  source?: string;
  preferredTopics?: string[];
  preferredChannels?: string[];
  metadata?: Record<string, unknown>;
}

export interface OpenHouseEventInput {
  listingId: string;
  organizationId: string;
  hostUserId?: string | null;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  streamUrl?: string | null;
  replayUrl?: string | null;
  status?: "draft" | "scheduled" | "live" | "completed" | "cancelled" | "archived";
  requiresRegistration?: boolean;
  metadata?: Record<string, unknown>;
}

export interface FloorPlanRoom {
  name: string;
  length?: number | null;
  width?: number | null;
  area?: number | null;
}

export interface FloorPlanMeasurementInput {
  listingId: string;
  propertyId?: string | null;
  mediaId?: string | null;
  createdBy?: string | null;
  unit?: "sqm" | "sqft";
  rooms: FloorPlanRoom[];
  measurementConfidence?: number | null;
  status?: "draft" | "submitted" | "approved" | "rejected" | "archived";
  metadata?: Record<string, unknown>;
}

export interface SmsUssdRequestInput {
  userId: string;
  channel: SmsUssdChannel;
  command: string;
  phone: string;
  organizationId?: string | null;
  listingId?: string | null;
  providerKey?: string | null;
  consentRecordedAt?: string | null;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CommunitySpaceInput {
  name: string;
  neighborhood: string;
  region?: string | null;
  district?: string | null;
  createdBy?: string | null;
  status?: "draft" | "active" | "paused" | "archived";
  moderationMode?: "pre_moderated" | "post_moderated" | "trusted_members";
  metadata?: Record<string, unknown>;
}

export interface CommunityContributionInput {
  spaceId?: string | null;
  contributorUserId?: string | null;
  contributionType:
    | "area_guide"
    | "event"
    | "emergency_alert"
    | "flood_report"
    | "power_report"
    | "water_report"
    | "review"
    | "photo";
  title: string;
  body?: string | null;
  rewardEligible?: boolean;
  metadata?: Record<string, unknown>;
}

export interface OfficialVerificationInput {
  checkType:
    | "ghana_card_liveness"
    | "business_registration"
    | "tax_identity"
    | "land_registry"
    | "lands_commission"
    | "utility_bill"
    | "sanctions_pep";
  organizationId?: string | null;
  listingId?: string | null;
  userId?: string | null;
  providerKey?: string | null;
  subjectReference?: string | null;
  consentRecordedAt?: string | null;
  resultSummary?: string | null;
  riskLevel?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
}

export interface AdvancedFraudSignalInput {
  signalType:
    | "device_fingerprint"
    | "image_authenticity"
    | "identity_liveness"
    | "sanctions_pep"
    | "suspicious_price"
    | "ghost_property"
    | "repeat_dispute"
    | "behavioral_velocity";
  summary: string;
  organizationId?: string | null;
  listingId?: string | null;
  userId?: string | null;
  riskLevel?: "low" | "medium" | "high" | "critical";
  signalHash?: string | null;
  evidence?: Record<string, unknown>;
}

export interface ReferralRewardInput {
  rewardType:
    | "visit_bonus"
    | "lead_bonus"
    | "rental_success"
    | "sale_success"
    | "agency_signup"
    | "content_contribution";
  referrerUserId?: string | null;
  referredUserId?: string | null;
  organizationId?: string | null;
  listingId?: string | null;
  dealCaseId?: string | null;
  amountMinor?: number;
  currency?: string;
  fraudHold?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AffordabilityPlanInput {
  planType: "weekly_rent" | "daily_rent" | "installment_purchase" | "bnpl_partner" | "ussd_handoff";
  organizationId?: string | null;
  listingId?: string | null;
  providerKey?: string | null;
  currency?: string;
  amountMinor?: number | null;
  cadence?: string | null;
  termsSummary?: string | null;
  legalReviewRequired?: boolean;
  metadata?: Record<string, unknown>;
}

export interface HyperlocalSourceInput {
  sourceKey: string;
  sourceName: string;
  signalType:
    | "flood"
    | "drainage"
    | "power"
    | "water"
    | "safety"
    | "transit"
    | "traffic"
    | "commercial_density"
    | "rental_yield"
    | "sales_comparable";
  coverageArea?: string | null;
  status?: "planned" | "manual_collection" | "connected" | "stale" | "disabled";
  confidenceScore?: number | null;
  refreshFrequency?: string | null;
  disclosure?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ConstructionProgressInput {
  updateTitle: string;
  projectId?: string | null;
  organizationId?: string | null;
  progressPercent?: number | null;
  observedAt?: string | null;
  estimatedCompletionDate?: string | null;
  photoStoragePaths?: string[];
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ContributorPayoutInput {
  contributorProfileId: string;
  itemType: "area_guide" | "photo" | "review" | "referral" | "field_report";
  contributionId?: string | null;
  rewardLedgerId?: string | null;
  amountMinor?: number;
  currency?: string;
  taxNote?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NewsletterCampaignInput {
  title: string;
  subject: string;
  editorialPostId?: string | null;
  channel?: "email" | "sms" | "whatsapp";
  targetTopics?: string[];
  providerKey?: string | null;
  scheduledAt?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}

export interface OpenHouseRegistrationInput {
  openHouseEventId: string;
  email: string;
  userId?: string | null;
  fullName?: string | null;
  phone?: string | null;
  remindersEnabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CommunityReportInput {
  reason: string;
  reporterUserId?: string | null;
  contributionId?: string | null;
  spaceId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ContributorProfileInput {
  userId: string;
  contributorType: "area_guide" | "photographer" | "local_expert" | "referral_partner";
  bio?: string | null;
  serviceArea?: string | null;
  metadata?: Record<string, unknown>;
}

export interface FeatureOperationEventInput {
  featureKey: string;
  entityTable: string;
  action: string;
  entityId?: string | null;
  actorUserId?: string | null;
  status?: "recorded" | "queued" | "completed" | "failed" | "cancelled";
  payload?: Record<string, unknown>;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function slugifyTitle(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || `post-${Date.now()}`;
}

function clampPercent(value?: number | null) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function calculateRoomArea(room: FloorPlanRoom) {
  if (typeof room.area === "number") return Math.max(room.area, 0);
  if (typeof room.length === "number" && typeof room.width === "number") {
    return Math.max(room.length, 0) * Math.max(room.width, 0);
  }
  return 0;
}

export function buildEditorialDraftPayload(input: EditorialDraftInput) {
  const title = input.title.trim();
  const excerpt =
    input.seoDescription ||
    input.body
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);

  return {
    slug: `${slugifyTitle(title)}-${Date.now().toString(36)}`,
    title,
    excerpt,
    body: input.body,
    post_type: input.postType || "guide",
    status: "draft",
    author_user_id: input.authorUserId || null,
    region: input.region || null,
    city: input.city || null,
    category: input.category || null,
    seo_title: title.slice(0, 70),
    seo_description: excerpt,
    metadata: {
      api_keys_required: false,
      source: "no_api_feature_functions",
      ...(input.metadata || {}),
    },
  };
}

export function buildNewsletterSubscriberPayload(input: NewsletterSubscriptionInput) {
  return {
    email: normalizeEmail(input.email),
    user_id: input.userId || null,
    status: "pending",
    source: input.source || "public_site",
    consent_recorded_at: new Date().toISOString(),
    preferred_topics: input.preferredTopics || ["market_updates"],
    preferred_channels: input.preferredChannels || ["email"],
    metadata: {
      api_keys_required: false,
      provider_sync_status: "pending_provider",
      ...(input.metadata || {}),
    },
  };
}

export function buildOpenHousePayload(input: OpenHouseEventInput) {
  return {
    listing_id: input.listingId,
    organization_id: input.organizationId,
    host_user_id: input.hostUserId || null,
    title: input.title,
    description: input.description || null,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    stream_url: input.streamUrl || null,
    replay_url: input.replayUrl || null,
    status: input.status || "draft",
    requires_registration: input.requiresRegistration ?? true,
    metadata: {
      provider_mode: input.streamUrl ? "manual_stream_url" : "provider_pending",
      api_keys_required: Boolean(!input.streamUrl),
      ...(input.metadata || {}),
    },
  };
}

export function buildFloorPlanPayload(input: FloorPlanMeasurementInput) {
  const rooms = input.rooms.map((room) => ({
    ...room,
    area: calculateRoomArea(room),
  }));
  const totalArea = rooms.reduce((sum, room) => sum + Number(room.area || 0), 0);

  return {
    listing_id: input.listingId,
    property_id: input.propertyId || null,
    media_id: input.mediaId || null,
    created_by: input.createdBy || null,
    unit: input.unit || "sqm",
    total_area: Number(totalArea.toFixed(2)),
    room_count: rooms.length,
    rooms,
    measurement_confidence: clampPercent(input.measurementConfidence ?? (rooms.length ? 65 : 0)),
    status: input.status || "draft",
    metadata: {
      measurement_mode: "manual_until_provider",
      api_keys_required: false,
      ...(input.metadata || {}),
    },
  };
}

export function buildSmsUssdRequestPayload(input: SmsUssdRequestInput) {
  return {
    user_id: input.userId,
    organization_id: input.organizationId || null,
    listing_id: input.listingId || null,
    channel: input.channel,
    command: input.command.trim().toUpperCase(),
    phone: input.phone.trim(),
    payload: input.payload || {},
    status: input.providerKey ? "queued" : "provider_pending",
    provider_key: input.providerKey || null,
    consent_recorded_at: input.consentRecordedAt || null,
    metadata: {
      api_keys_required: Boolean(!input.providerKey),
      ...(input.metadata || {}),
    },
  };
}

export function buildNewsletterCampaignPayload(input: NewsletterCampaignInput) {
  return {
    editorial_post_id: input.editorialPostId || null,
    title: input.title.trim(),
    subject: input.subject.trim(),
    channel: input.channel || "email",
    status: input.providerKey ? "queued" : "provider_pending",
    target_topics: input.targetTopics || ["market_updates"],
    provider_key: input.providerKey || null,
    scheduled_at: input.scheduledAt || null,
    queued_at: input.providerKey ? new Date().toISOString() : null,
    recipient_count: 0,
    created_by: input.createdBy || null,
    metadata: {
      api_keys_required: Boolean(!input.providerKey),
      provider_sync_status: input.providerKey ? "queued" : "pending_provider",
      ...(input.metadata || {}),
    },
  };
}

export function buildOpenHouseRegistrationPayload(input: OpenHouseRegistrationInput) {
  return {
    open_house_event_id: input.openHouseEventId,
    user_id: input.userId || null,
    full_name: input.fullName || null,
    email: normalizeEmail(input.email),
    phone: input.phone || null,
    status: "registered",
    reminders_enabled: input.remindersEnabled ?? true,
    metadata: {
      api_keys_required: false,
      reminder_provider_status: "provider_optional",
      ...(input.metadata || {}),
    },
  };
}

export function buildCommunityReportPayload(input: CommunityReportInput) {
  return {
    contribution_id: input.contributionId || null,
    space_id: input.spaceId || null,
    reporter_user_id: input.reporterUserId || null,
    reason: input.reason,
    status: "submitted",
    metadata: {
      review_first: true,
      ...(input.metadata || {}),
    },
  };
}

export function buildFeatureOperationEventPayload(input: FeatureOperationEventInput) {
  return {
    feature_key: input.featureKey,
    entity_table: input.entityTable,
    entity_id: input.entityId || null,
    action: input.action,
    status: input.status || "recorded",
    actor_user_id: input.actorUserId || null,
    payload: input.payload || {},
  };
}

export function buildPaymentFallbackFunctionPlan(input: {
  requestedProvider?: PaymentGatewayProvider | null;
  currency?: string | null;
  configuredProviders?: PaymentGatewayProvider[];
}) {
  const configured = new Set(input.configuredProviders || ["paystack"]);
  const requested = input.requestedProvider || (input.currency === "USD" || input.currency === "GBP" ? "stripe" : "paystack");
  const defaults: PaymentGatewayProvider[] =
    input.currency === "USD" || input.currency === "GBP"
      ? ["stripe", "flutterwave", "paystack"]
      : ["paystack", "flutterwave", "stripe"];
  const ordered = [requested, ...defaults].filter(
    (provider, index, arr) => arr.indexOf(provider) === index
  );

  return {
    requestedProvider: requested,
    orderedProviders: ordered,
    firstConfiguredProvider: ordered.find((provider) => configured.has(provider)) || "paystack",
    fallbackRequired: !configured.has(requested),
    gaps: ordered
      .filter((provider) => !configured.has(provider))
      .map((provider) => `${provider} credentials are not configured yet.`),
  };
}

export function buildWalletCheckoutFunctionPlan(input: {
  provider?: PaymentGatewayProvider;
  wallet?: "apple_pay" | "google_pay" | "mobile_money" | "card";
  deviceSupported?: boolean;
  providerConfigured?: boolean;
}) {
  const provider = input.provider || "paystack";
  const wallet = input.wallet || "mobile_money";
  const supportedByProvider =
    wallet === "mobile_money"
      ? ["paystack", "flutterwave"].includes(provider)
      : wallet === "apple_pay" || wallet === "google_pay"
        ? ["stripe", "flutterwave"].includes(provider)
        : true;

  return {
    provider,
    wallet,
    canAttempt: Boolean(input.deviceSupported && input.providerConfigured && supportedByProvider),
    gaps: [
      input.deviceSupported ? null : "Device or browser wallet support is not confirmed.",
      input.providerConfigured ? null : "Provider credentials must be added server-side.",
      supportedByProvider ? null : `${provider} does not support ${wallet} in this lane.`,
    ].filter(Boolean) as string[],
  };
}

export const providerReadyFeaturesService = {
  async recordFeatureOperationEvent(input: FeatureOperationEventInput) {
    const { data, error } = await db
      .from("feature_operation_events")
      .insert(buildFeatureOperationEventPayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createEditorialDraft(input: EditorialDraftInput) {
    const { data, error } = await db
      .from("editorial_posts")
      .insert(buildEditorialDraftPayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEditorialStatus(input: {
    postId: string;
    status: "submitted" | "approved" | "published" | "rejected" | "archived";
    actorUserId?: string | null;
    moderationNote?: string | null;
    publishNow?: boolean;
  }) {
    const { data, error } = await db
      .from("editorial_posts")
      .update({
        status: input.status,
        published_at:
          input.status === "published"
            ? new Date().toISOString()
            : input.publishNow
              ? new Date().toISOString()
              : undefined,
        metadata: {
          last_action: input.status,
          moderation_note: input.moderationNote || null,
          actor_user_id: input.actorUserId || null,
        },
      })
      .eq("id", input.postId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "editorial_posts",
      entityTable: "editorial_posts",
      entityId: input.postId,
      action: input.status,
      actorUserId: input.actorUserId || null,
      status: "completed",
      payload: { moderationNote: input.moderationNote || null },
    }).catch(() => null);
    return data;
  },

  async subscribeNewsletter(input: NewsletterSubscriptionInput) {
    const payload = buildNewsletterSubscriberPayload(input);
    const { data, error } = await db
      .from("newsletter_subscribers")
      .upsert(payload, { onConflict: "email" })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateNewsletterSubscription(input: {
    email: string;
    status: "confirmed" | "unsubscribed" | "bounced" | "complained";
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("newsletter_subscribers")
      .update({
        status: input.status,
        metadata: input.metadata || {},
      })
      .eq("email", normalizeEmail(input.email))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createNewsletterCampaign(input: NewsletterCampaignInput) {
    const { data, error } = await db
      .from("newsletter_campaigns")
      .insert(buildNewsletterCampaignPayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateNewsletterCampaignStatus(input: {
    campaignId: string;
    status: "queued" | "provider_pending" | "sent" | "cancelled" | "archived";
    providerKey?: string | null;
    recipientCount?: number | null;
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("newsletter_campaigns")
      .update({
        status: input.status,
        provider_key: input.providerKey || null,
        queued_at: input.status === "queued" ? now : undefined,
        sent_at: input.status === "sent" ? now : undefined,
        recipient_count:
          input.recipientCount == null ? undefined : Math.max(0, Number(input.recipientCount)),
        metadata: input.metadata || {},
      })
      .eq("id", input.campaignId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "newsletter_campaigns",
      entityTable: "newsletter_campaigns",
      entityId: input.campaignId,
      action: input.status,
      actorUserId: input.actorUserId || null,
      status: input.status === "sent" ? "completed" : "queued",
      payload: { recipientCount: input.recipientCount || 0 },
    }).catch(() => null);
    return data;
  },

  async createOpenHouseEvent(input: OpenHouseEventInput) {
    const { data, error } = await db
      .from("open_house_events")
      .insert(buildOpenHousePayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateOpenHouseStatus(input: {
    openHouseEventId: string;
    status: "scheduled" | "live" | "completed" | "cancelled" | "archived";
    actorUserId?: string | null;
    streamUrl?: string | null;
    replayUrl?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("open_house_events")
      .update({
        status: input.status,
        stream_url: input.streamUrl || undefined,
        replay_url: input.replayUrl || undefined,
        metadata: input.metadata || {},
      })
      .eq("id", input.openHouseEventId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "open_house_events",
      entityTable: "open_house_events",
      entityId: input.openHouseEventId,
      action: input.status,
      actorUserId: input.actorUserId || null,
      status: input.status === "completed" ? "completed" : "recorded",
    }).catch(() => null);
    return data;
  },

  async registerForOpenHouse(input: OpenHouseRegistrationInput) {
    const { data, error } = await db
      .from("open_house_registrations")
      .upsert(buildOpenHouseRegistrationPayload(input), {
        onConflict: "open_house_event_id,email",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateOpenHouseRegistrationStatus(input: {
    registrationId: string;
    status: "confirmed" | "attended" | "no_show" | "cancelled";
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("open_house_registrations")
      .update({
        status: input.status,
        metadata: input.metadata || {},
      })
      .eq("id", input.registrationId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "open_house_registrations",
      entityTable: "open_house_registrations",
      entityId: input.registrationId,
      action: input.status,
      actorUserId: input.actorUserId || null,
    }).catch(() => null);
    return data;
  },

  async saveFloorPlanMeasurement(input: FloorPlanMeasurementInput) {
    const { data, error } = await db
      .from("floor_plan_measurements")
      .insert(buildFloorPlanPayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateFloorPlanMeasurementStatus(input: {
    measurementId: string;
    status: "submitted" | "approved" | "rejected" | "archived";
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("floor_plan_measurements")
      .update({
        status: input.status,
        metadata: input.metadata || {},
      })
      .eq("id", input.measurementId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "floor_plan_measurements",
      entityTable: "floor_plan_measurements",
      entityId: input.measurementId,
      action: input.status,
      actorUserId: input.actorUserId || null,
    }).catch(() => null);
    return data;
  },

  async createSmsUssdRequest(input: SmsUssdRequestInput) {
    const { data, error } = await db
      .from("sms_ussd_requests")
      .insert(buildSmsUssdRequestPayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSmsUssdRequestStatus(input: {
    requestId: string;
    status: "queued" | "provider_pending" | "sent" | "failed" | "cancelled";
    providerKey?: string | null;
    failureReason?: string | null;
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("sms_ussd_requests")
      .update({
        status: input.status,
        provider_key: input.providerKey || null,
        failure_reason: input.failureReason || null,
        metadata: input.metadata || {},
      })
      .eq("id", input.requestId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "sms_ussd_requests",
      entityTable: "sms_ussd_requests",
      entityId: input.requestId,
      action: input.status,
      actorUserId: input.actorUserId || null,
      status: input.status === "sent" ? "completed" : input.status === "failed" ? "failed" : "queued",
    }).catch(() => null);
    return data;
  },

  async createCommunitySpace(input: CommunitySpaceInput) {
    const { data, error } = await db
      .from("neighborhood_community_spaces")
      .upsert(
        {
          name: input.name,
          region: input.region || null,
          district: input.district || null,
          neighborhood: input.neighborhood,
          status: input.status || "draft",
          moderation_mode: input.moderationMode || "pre_moderated",
          created_by: input.createdBy || null,
          metadata: input.metadata || {},
        },
        { onConflict: "region,district,neighborhood" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async submitCommunityContribution(input: CommunityContributionInput) {
    const { data, error } = await db
      .from("community_contributions")
      .insert({
        space_id: input.spaceId || null,
        contributor_user_id: input.contributorUserId || null,
        contribution_type: input.contributionType,
        title: input.title,
        body: input.body || null,
        status: "submitted",
        reward_eligible: Boolean(input.rewardEligible),
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCommunityContributionStatus(input: {
    contributionId: string;
    status: "approved" | "rejected" | "needs_changes" | "published" | "archived";
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("community_contributions")
      .update({
        status: input.status,
        reviewed_by: input.actorUserId || null,
        reviewed_at: ["approved", "rejected", "published", "archived"].includes(input.status)
          ? new Date().toISOString()
          : null,
        metadata: input.metadata || {},
      })
      .eq("id", input.contributionId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "community_contributions",
      entityTable: "community_contributions",
      entityId: input.contributionId,
      action: input.status,
      actorUserId: input.actorUserId || null,
      status: input.status === "published" ? "completed" : "recorded",
    }).catch(() => null);
    return data;
  },

  async reportCommunityContent(input: CommunityReportInput) {
    const { data, error } = await db
      .from("community_reports")
      .insert(buildCommunityReportPayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async reviewCommunityReport(input: {
    reportId: string;
    status: "reviewed" | "dismissed" | "actioned";
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("community_reports")
      .update({
        status: input.status,
        reviewed_by: input.actorUserId || null,
        reviewed_at: new Date().toISOString(),
        metadata: input.metadata || {},
      })
      .eq("id", input.reportId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "community_reports",
      entityTable: "community_reports",
      entityId: input.reportId,
      action: input.status,
      actorUserId: input.actorUserId || null,
    }).catch(() => null);
    return data;
  },

  async createManualVerificationCheck(input: OfficialVerificationInput) {
    const { data, error } = await db
      .from("official_verification_checks")
      .insert({
        organization_id: input.organizationId || null,
        listing_id: input.listingId || null,
        user_id: input.userId || null,
        check_type: input.checkType,
        provider_key: input.providerKey || null,
        subject_reference: input.subjectReference || null,
        consent_recorded_at: input.consentRecordedAt || null,
        status: input.providerKey ? "submitted" : "needs_manual_review",
        result_summary: input.resultSummary || null,
        risk_level: input.riskLevel || "medium",
        metadata: {
          api_keys_required: Boolean(!input.providerKey),
          ...(input.metadata || {}),
        },
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateVerificationCheckStatus(input: {
    checkId: string;
    status: "submitted" | "verified" | "failed" | "needs_manual_review" | "expired";
    actorUserId?: string | null;
    resultSummary?: string | null;
    riskLevel?: "low" | "medium" | "high" | "critical";
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("official_verification_checks")
      .update({
        status: input.status,
        result_summary: input.resultSummary || null,
        risk_level: input.riskLevel || undefined,
        reviewed_by: ["verified", "failed", "needs_manual_review"].includes(input.status)
          ? input.actorUserId || null
          : undefined,
        reviewed_at: ["verified", "failed", "needs_manual_review"].includes(input.status)
          ? new Date().toISOString()
          : undefined,
        metadata: input.metadata || {},
      })
      .eq("id", input.checkId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "official_verification_checks",
      entityTable: "official_verification_checks",
      entityId: input.checkId,
      action: input.status,
      actorUserId: input.actorUserId || null,
    }).catch(() => null);
    return data;
  },

  async recordAdvancedFraudSignal(input: AdvancedFraudSignalInput) {
    const { data, error } = await db
      .from("advanced_fraud_signals")
      .insert({
        organization_id: input.organizationId || null,
        listing_id: input.listingId || null,
        user_id: input.userId || null,
        signal_type: input.signalType,
        risk_level: input.riskLevel || "medium",
        status: "open",
        signal_hash: input.signalHash || null,
        summary: input.summary,
        evidence: input.evidence || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async reviewAdvancedFraudSignal(input: {
    signalId: string;
    status: "investigating" | "cleared" | "confirmed" | "false_positive";
    actorUserId?: string | null;
    evidence?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("advanced_fraud_signals")
      .update({
        status: input.status,
        reviewed_by: input.actorUserId || null,
        reviewed_at: new Date().toISOString(),
        evidence: input.evidence || {},
      })
      .eq("id", input.signalId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "advanced_fraud_signals",
      entityTable: "advanced_fraud_signals",
      entityId: input.signalId,
      action: input.status,
      actorUserId: input.actorUserId || null,
    }).catch(() => null);
    return data;
  },

  async createReferralReward(input: ReferralRewardInput) {
    const { data, error } = await db
      .from("referral_reward_ledger")
      .insert({
        referrer_user_id: input.referrerUserId || null,
        referred_user_id: input.referredUserId || null,
        organization_id: input.organizationId || null,
        listing_id: input.listingId || null,
        deal_case_id: input.dealCaseId || null,
        reward_type: input.rewardType,
        status: "pending_review",
        amount_minor: Math.max(0, Number(input.amountMinor || 0)),
        currency: input.currency || "GHS",
        fraud_hold: input.fraudHold ?? true,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async decideReferralReward(input: {
    rewardId: string;
    decision: "approved" | "rejected" | "paid" | "voided" | "fraud_hold";
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const now = new Date().toISOString();
    const status = input.decision === "fraud_hold" ? "pending_review" : input.decision;
    const { data, error } = await db
      .from("referral_reward_ledger")
      .update({
        status,
        fraud_hold: input.decision === "fraud_hold" ? true : input.decision === "approved" ? false : undefined,
        approved_by: input.decision === "approved" ? input.actorUserId || null : undefined,
        approved_at: input.decision === "approved" ? now : undefined,
        paid_at: input.decision === "paid" ? now : undefined,
        metadata: input.metadata || {},
      })
      .eq("id", input.rewardId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "referral_reward_ledger",
      entityTable: "referral_reward_ledger",
      entityId: input.rewardId,
      action: input.decision,
      actorUserId: input.actorUserId || null,
      status: input.decision === "paid" ? "completed" : "recorded",
    }).catch(() => null);
    return data;
  },

  async createAffordabilityPlan(input: AffordabilityPlanInput) {
    const { data, error } = await db
      .from("affordability_payment_plans")
      .insert({
        organization_id: input.organizationId || null,
        listing_id: input.listingId || null,
        plan_type: input.planType,
        provider_key: input.providerKey || null,
        status: input.legalReviewRequired === false && input.providerKey ? "provider_review" : "legal_review",
        currency: input.currency || "GHS",
        amount_minor: input.amountMinor || null,
        cadence: input.cadence || null,
        terms_summary: input.termsSummary || null,
        legal_review_required: input.legalReviewRequired ?? true,
        metadata: {
          payment_service_required: true,
          api_keys_required: Boolean(!input.providerKey),
          ...(input.metadata || {}),
        },
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAffordabilityPlanStatus(input: {
    planId: string;
    status: "legal_review" | "provider_review" | "active" | "paused" | "retired";
    actorUserId?: string | null;
    providerKey?: string | null;
    legalReviewRequired?: boolean;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("affordability_payment_plans")
      .update({
        status: input.status,
        provider_key: input.providerKey || undefined,
        legal_review_required: input.legalReviewRequired,
        metadata: input.metadata || {},
      })
      .eq("id", input.planId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "affordability_payment_plans",
      entityTable: "affordability_payment_plans",
      entityId: input.planId,
      action: input.status,
      actorUserId: input.actorUserId || null,
      status: input.status === "active" ? "completed" : "recorded",
    }).catch(() => null);
    return data;
  },

  async upsertHyperlocalSource(input: HyperlocalSourceInput) {
    const { data, error } = await db
      .from("hyperlocal_data_sources")
      .upsert(
        {
          source_key: input.sourceKey,
          source_name: input.sourceName,
          signal_type: input.signalType,
          coverage_area: input.coverageArea || null,
          status: input.status || "planned",
          confidence_score:
            input.confidenceScore == null ? null : clampPercent(input.confidenceScore),
          refresh_frequency: input.refreshFrequency || null,
          disclosure: input.disclosure || null,
          metadata: input.metadata || {},
        },
        { onConflict: "source_key" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async recordHyperlocalImportResult(input: {
    sourceKey: string;
    status: "manual_collection" | "connected" | "stale" | "disabled";
    confidenceScore?: number | null;
    lastImportedAt?: string | null;
    disclosure?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("hyperlocal_data_sources")
      .update({
        status: input.status,
        confidence_score:
          input.confidenceScore == null ? undefined : clampPercent(input.confidenceScore),
        last_imported_at: input.lastImportedAt || new Date().toISOString(),
        disclosure: input.disclosure || undefined,
        metadata: input.metadata || {},
      })
      .eq("source_key", input.sourceKey)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createConstructionProgressUpdate(input: ConstructionProgressInput) {
    const { data, error } = await db
      .from("construction_progress_updates")
      .insert({
        project_id: input.projectId || null,
        organization_id: input.organizationId || null,
        update_title: input.updateTitle,
        progress_percent:
          input.progressPercent == null ? null : clampPercent(input.progressPercent),
        status: "submitted",
        observed_at: input.observedAt || null,
        estimated_completion_date: input.estimatedCompletionDate || null,
        forecast_confidence: input.progressPercent == null ? null : clampPercent(input.progressPercent * 0.75),
        photo_storage_paths: input.photoStoragePaths || [],
        notes: input.notes || null,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async reviewConstructionProgressUpdate(input: {
    progressUpdateId: string;
    status: "verified" | "published" | "rejected" | "archived";
    actorUserId?: string | null;
    forecastConfidence?: number | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("construction_progress_updates")
      .update({
        status: input.status,
        forecast_confidence:
          input.forecastConfidence == null ? undefined : clampPercent(input.forecastConfidence),
        verified_by: ["verified", "published"].includes(input.status)
          ? input.actorUserId || null
          : undefined,
        verified_at: ["verified", "published"].includes(input.status)
          ? new Date().toISOString()
          : undefined,
        metadata: input.metadata || {},
      })
      .eq("id", input.progressUpdateId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "construction_progress_updates",
      entityTable: "construction_progress_updates",
      entityId: input.progressUpdateId,
      action: input.status,
      actorUserId: input.actorUserId || null,
    }).catch(() => null);
    return data;
  },

  async createContributorProfile(input: ContributorProfileInput) {
    const { data, error } = await db
      .from("contributor_profiles")
      .upsert(
        {
          user_id: input.userId,
          contributor_type: input.contributorType,
          status: "pending_review",
          payout_status: "not_configured",
          bio: input.bio || null,
          service_area: input.serviceArea || null,
          metadata: input.metadata || {},
        },
        { onConflict: "user_id,contributor_type" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async reviewContributorProfile(input: {
    contributorProfileId: string;
    status: "approved" | "suspended" | "rejected";
    actorUserId?: string | null;
    payoutStatus?: "not_configured" | "pending_verification" | "verified" | "disabled";
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await db
      .from("contributor_profiles")
      .update({
        status: input.status,
        payout_status: input.payoutStatus || undefined,
        reviewed_by: input.actorUserId || null,
        reviewed_at: new Date().toISOString(),
        metadata: input.metadata || {},
      })
      .eq("id", input.contributorProfileId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "contributor_profiles",
      entityTable: "contributor_profiles",
      entityId: input.contributorProfileId,
      action: input.status,
      actorUserId: input.actorUserId || null,
    }).catch(() => null);
    return data;
  },

  async createContributorPayoutItem(input: ContributorPayoutInput) {
    const { data, error } = await db
      .from("contributor_payout_items")
      .insert({
        contributor_profile_id: input.contributorProfileId,
        contribution_id: input.contributionId || null,
        reward_ledger_id: input.rewardLedgerId || null,
        item_type: input.itemType,
        status: "pending_review",
        amount_minor: Math.max(0, Number(input.amountMinor || 0)),
        currency: input.currency || "GHS",
        tax_note: input.taxNote || null,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async decideContributorPayoutItem(input: {
    payoutItemId: string;
    decision: "approved" | "rejected" | "paid" | "voided";
    actorUserId?: string | null;
    taxNote?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("contributor_payout_items")
      .update({
        status: input.decision,
        tax_note: input.taxNote || undefined,
        approved_by: input.decision === "approved" ? input.actorUserId || null : undefined,
        approved_at: input.decision === "approved" ? now : undefined,
        paid_at: input.decision === "paid" ? now : undefined,
        metadata: input.metadata || {},
      })
      .eq("id", input.payoutItemId)
      .select()
      .single();

    if (error) throw error;
    await this.recordFeatureOperationEvent({
      featureKey: "contributor_payout_items",
      entityTable: "contributor_payout_items",
      entityId: input.payoutItemId,
      action: input.decision,
      actorUserId: input.actorUserId || null,
      status: input.decision === "paid" ? "completed" : "recorded",
    }).catch(() => null);
    return data;
  },
};

export const implementedProviderReadyFunctionNames = [
  "recordFeatureOperationEvent",
  "createEditorialDraft",
  "updateEditorialStatus",
  "subscribeNewsletter",
  "updateNewsletterSubscription",
  "createNewsletterCampaign",
  "updateNewsletterCampaignStatus",
  "createOpenHouseEvent",
  "updateOpenHouseStatus",
  "registerForOpenHouse",
  "updateOpenHouseRegistrationStatus",
  "saveFloorPlanMeasurement",
  "updateFloorPlanMeasurementStatus",
  "createSmsUssdRequest",
  "updateSmsUssdRequestStatus",
  "createCommunitySpace",
  "submitCommunityContribution",
  "updateCommunityContributionStatus",
  "reportCommunityContent",
  "reviewCommunityReport",
  "createManualVerificationCheck",
  "updateVerificationCheckStatus",
  "recordAdvancedFraudSignal",
  "reviewAdvancedFraudSignal",
  "createReferralReward",
  "decideReferralReward",
  "createAffordabilityPlan",
  "updateAffordabilityPlanStatus",
  "upsertHyperlocalSource",
  "recordHyperlocalImportResult",
  "createConstructionProgressUpdate",
  "reviewConstructionProgressUpdate",
  "createContributorProfile",
  "reviewContributorProfile",
  "createContributorPayoutItem",
  "decideContributorPayoutItem",
  "buildPaymentFallbackFunctionPlan",
  "buildWalletCheckoutFunctionPlan",
] as const;
