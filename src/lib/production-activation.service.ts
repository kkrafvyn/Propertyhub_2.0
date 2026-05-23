import { supabase } from "./supabase";

const db = supabase as any;

export type ProductionProviderCategory =
  | "payment"
  | "iot"
  | "sms"
  | "ussd"
  | "identity"
  | "registry"
  | "hyperlocal_data"
  | "ai"
  | "fraud"
  | "communications"
  | "monitoring"
  | "backup";

export type LegalSignoffDomain =
  | "escrow"
  | "refunds"
  | "data_protection"
  | "property_verification"
  | "sms"
  | "ai"
  | "iot_privacy"
  | "referral_payouts"
  | "affordability_payments"
  | "general_terms";

export type HyperlocalSignalType =
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

export interface ProviderIntegrationRunInput {
  providerCategory: ProductionProviderCategory;
  providerKey: string;
  runType:
    | "connectivity_check"
    | "sandbox_certification"
    | "production_health_check"
    | "webhook_probe"
    | "fallback_drill"
    | "data_import"
    | "manual_evidence";
  status?: "queued" | "running" | "passed" | "failed" | "blocked" | "needs_review";
  externalReference?: string | null;
  checkedBy?: string | null;
  evidence?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface LegalComplianceSignoffInput {
  domain: LegalSignoffDomain;
  policyTitle: string;
  policyVersion?: string;
  status?: "draft" | "ready_for_counsel" | "approved" | "rejected" | "expired";
  reviewerName?: string | null;
  reviewerRole?: string | null;
  reviewedBy?: string | null;
  evidenceUrl?: string | null;
  riskSummary?: string | null;
  requiredChanges?: string[];
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface HyperlocalObservationInput {
  signalType: HyperlocalSignalType;
  sourceId?: string | null;
  region?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  observedAt?: string | null;
  signalValue?: number | null;
  severity?: "low" | "medium" | "high" | "critical";
  confidenceScore?: number | null;
  publicSummary?: string | null;
  evidence?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CommunityBroadcastInput {
  broadcastType:
    | "emergency_alert"
    | "flood_warning"
    | "power_notice"
    | "water_notice"
    | "security_notice"
    | "event_update"
    | "market_update";
  title: string;
  body: string;
  spaceId?: string | null;
  channels?: string[];
  scheduledAt?: string | null;
  expiresAt?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CommunityChatThreadInput {
  spaceId: string;
  title: string;
  createdBy?: string | null;
  visibility?: "public" | "members" | "moderators";
  metadata?: Record<string, unknown>;
}

export interface CommunityChatMessageInput {
  threadId: string;
  body: string;
  authorUserId?: string | null;
  status?: "submitted" | "published" | "hidden" | "removed";
  metadata?: Record<string, unknown>;
}

export interface AffordabilityEnrollmentInput {
  planId: string;
  userId?: string | null;
  listingId?: string | null;
  amountMinor: number;
  currency?: string;
  cadence?: string;
  nextDueAt?: string | null;
  providerKey?: string | null;
  providerReference?: string | null;
  legalDisclaimerAcceptedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface InvestmentScoreReviewInput {
  listingId?: string | null;
  investmentScoreId?: string | null;
  areaKey?: string | null;
  score?: number | null;
  confidenceScore?: number | null;
  modelVersion?: string;
  rationale?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ContributorMarketplaceListingInput {
  contributorProfileId: string;
  serviceType:
    | "area_guide"
    | "photography"
    | "field_report"
    | "neighborhood_review"
    | "property_video"
    | "inspection_support";
  title: string;
  description?: string | null;
  priceMinor?: number | null;
  currency?: string;
  serviceArea?: string | null;
  portfolioUrls?: string[];
  metadata?: Record<string, unknown>;
}

export interface ConstructionForecastInput {
  forecastType:
    | "completion_date"
    | "occupancy"
    | "price_escalation"
    | "delay_risk"
    | "presale_readiness";
  forecastValue: string;
  projectId?: string | null;
  organizationId?: string | null;
  confidenceScore?: number | null;
  evidenceSummary?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DeveloperVerificationInput {
  organizationId: string;
  projectId?: string | null;
  businessRegistrationReference?: string | null;
  permitReference?: string | null;
  landReference?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface WhiteLabelPackageInput {
  organizationId: string;
  packageName: string;
  customDomain?: string | null;
  brandPalette?: Record<string, unknown>;
  featureFlags?: Record<string, unknown>;
  configuredBy?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CommissionRuleInput {
  organizationId: string;
  name: string;
  appliesTo?: "all_deals" | "rentals" | "sales" | "leases" | "commercial" | "agent_specific";
  percentage?: number | null;
  flatAmountMinor?: number | null;
  currency?: string;
  payoutCadence?: string;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}

const CONNECTOR_REQUIREMENTS: Record<
  string,
  { label: string; envKeys: string[]; manualFallback: string; reviewRequired: boolean }
> = {
  ghana_card_liveness: {
    label: "Ghana Card and liveness",
    envKeys: ["GHANA_CARD_API_ENDPOINT", "GHANA_CARD_API_KEY", "LIVENESS_API_KEY"],
    manualFallback: "manual_identity_review",
    reviewRequired: true,
  },
  lands_commission_manual: {
    label: "Lands Commission / registry",
    envKeys: ["LAND_REGISTRY_API_ENDPOINT", "LAND_REGISTRY_API_KEY"],
    manualFallback: "manual_registry_review",
    reviewRequired: true,
  },
  sanctions_pep: {
    label: "Sanctions and PEP screening",
    envKeys: ["SANCTIONS_SCREENING_API_KEY"],
    manualFallback: "manual_fraud_review",
    reviewRequired: true,
  },
  image_authenticity: {
    label: "Image authenticity screening",
    envKeys: ["FRAUD_IMAGE_AUTH_API_KEY"],
    manualFallback: "manual_image_review",
    reviewRequired: true,
  },
  flood_drainage_feed: {
    label: "Flood and drainage data",
    envKeys: ["FLOOD_DATA_ENDPOINT", "HYPERLOCAL_DATA_API_KEY"],
    manualFallback: "manual_field_collection",
    reviewRequired: false,
  },
  utilities_reliability_feed: {
    label: "Power and water reliability data",
    envKeys: ["POWER_RELIABILITY_DATA_ENDPOINT", "WATER_RELIABILITY_DATA_ENDPOINT"],
    manualFallback: "manual_field_collection",
    reviewRequired: false,
  },
  mobility_safety_feed: {
    label: "Transit, traffic, safety, and commercial density data",
    envKeys: ["SAFETY_DATA_ENDPOINT", "TRANSIT_DATA_ENDPOINT"],
    manualFallback: "manual_field_collection",
    reviewRequired: false,
  },
};

function clampPercent(value?: number | null) {
  if (value == null) return null;
  return Math.max(0, Math.min(100, Number(value)));
}

function nonNegative(value?: number | null) {
  return Math.max(0, Number(value || 0));
}

export function buildProviderConnectorPlan(input: {
  providerKey: string;
  configuredEnvKeys?: string[];
}) {
  const requirement = CONNECTOR_REQUIREMENTS[input.providerKey] || {
    label: input.providerKey,
    envKeys: [],
    manualFallback: "manual_review",
    reviewRequired: true,
  };
  const configured = new Set(input.configuredEnvKeys || []);
  const missingEnvKeys = requirement.envKeys.filter((key) => !configured.has(key));

  return {
    providerKey: input.providerKey,
    label: requirement.label,
    requiredEnvKeys: requirement.envKeys,
    missingEnvKeys,
    canAttemptLiveConnection: requirement.envKeys.length > 0 && missingEnvKeys.length === 0,
    manualFallback: requirement.manualFallback,
    reviewRequired: requirement.reviewRequired,
    secretsStayServerSide: true,
  };
}

export function buildProviderIntegrationRunPayload(input: ProviderIntegrationRunInput) {
  const now = new Date().toISOString();
  return {
    provider_category: input.providerCategory,
    provider_key: input.providerKey,
    run_type: input.runType,
    status: input.status || "queued",
    external_reference: input.externalReference || null,
    started_at: input.status === "running" ? now : null,
    completed_at: ["passed", "failed", "blocked", "needs_review"].includes(input.status || "")
      ? now
      : null,
    checked_by: input.checkedBy || null,
    evidence: input.evidence || {},
    metadata: {
      api_keys_stored_here: false,
      ...(input.metadata || {}),
    },
  };
}

export function buildLegalComplianceSignoffPayload(input: LegalComplianceSignoffInput) {
  const status = input.status || "draft";
  return {
    domain: input.domain,
    status,
    policy_title: input.policyTitle,
    policy_version: input.policyVersion || "v1",
    reviewer_name: input.reviewerName || null,
    reviewer_role: input.reviewerRole || null,
    reviewed_by: input.reviewedBy || null,
    reviewed_at: ["approved", "rejected", "expired"].includes(status) ? new Date().toISOString() : null,
    expires_at: input.expiresAt || null,
    evidence_url: input.evidenceUrl || null,
    risk_summary: input.riskSummary || null,
    required_changes: input.requiredChanges || [],
    metadata: {
      counsel_review_required: status !== "approved",
      ...(input.metadata || {}),
    },
  };
}

export function buildHyperlocalObservationPayload(input: HyperlocalObservationInput) {
  return {
    source_id: input.sourceId || null,
    signal_type: input.signalType,
    region: input.region || null,
    district: input.district || null,
    neighborhood: input.neighborhood || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    observed_at: input.observedAt || new Date().toISOString(),
    signal_value: input.signalValue ?? null,
    severity: input.severity || "medium",
    confidence_score: clampPercent(input.confidenceScore),
    public_summary: input.publicSummary || null,
    evidence: input.evidence || {},
    metadata: {
      source_disclosure_required: true,
      ...(input.metadata || {}),
    },
  };
}

export function buildCommunityBroadcastPayload(input: CommunityBroadcastInput) {
  const channels = input.channels?.length ? input.channels : ["in_app"];
  return {
    space_id: input.spaceId || null,
    broadcast_type: input.broadcastType,
    title: input.title.trim(),
    body: input.body.trim(),
    status: channels.some((channel) => channel !== "in_app") ? "queued" : "draft",
    channels,
    scheduled_at: input.scheduledAt || null,
    expires_at: input.expiresAt || null,
    created_by: input.createdBy || null,
    metadata: {
      external_provider_required: channels.some((channel) => channel !== "in_app"),
      moderation_required: true,
      ...(input.metadata || {}),
    },
  };
}

export function buildAffordabilityEnrollmentPayload(input: AffordabilityEnrollmentInput) {
  return {
    plan_id: input.planId,
    user_id: input.userId || null,
    listing_id: input.listingId || null,
    status: input.providerKey ? "pending_kyc" : "pending_provider",
    amount_minor: nonNegative(input.amountMinor),
    currency: input.currency || "GHS",
    cadence: input.cadence || "weekly",
    next_due_at: input.nextDueAt || null,
    provider_key: input.providerKey || null,
    provider_reference: input.providerReference || null,
    legal_disclaimer_accepted_at: input.legalDisclaimerAcceptedAt || null,
    metadata: {
      legal_review_required: true,
      lender_decisioning: false,
      ...(input.metadata || {}),
    },
  };
}

export function buildInvestmentScoreReviewPayload(input: InvestmentScoreReviewInput) {
  return {
    investment_score_id: input.investmentScoreId || null,
    listing_id: input.listingId || null,
    area_key: input.areaKey || null,
    status: "human_review",
    score: clampPercent(input.score),
    confidence_score: clampPercent(input.confidenceScore),
    model_version: input.modelVersion || "manual-v1",
    rationale: input.rationale || null,
    metadata: {
      not_financial_advice: true,
      publish_requires_human_review: true,
      ...(input.metadata || {}),
    },
  };
}

export const productionActivationService = {
  async recordProviderIntegrationRun(input: ProviderIntegrationRunInput) {
    const { data, error } = await db
      .from("provider_integration_runs")
      .insert(buildProviderIntegrationRunPayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async upsertLegalComplianceSignoff(input: LegalComplianceSignoffInput) {
    const { data, error } = await db
      .from("legal_compliance_signoffs")
      .upsert(buildLegalComplianceSignoffPayload(input), {
        onConflict: "domain,policy_version",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async recordHyperlocalObservation(input: HyperlocalObservationInput) {
    const { data, error } = await db
      .from("hyperlocal_observations")
      .insert(buildHyperlocalObservationPayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createCommunityBroadcast(input: CommunityBroadcastInput) {
    const { data, error } = await db
      .from("community_broadcasts")
      .insert(buildCommunityBroadcastPayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createCommunityChatThread(input: CommunityChatThreadInput) {
    const { data, error } = await db
      .from("community_chat_threads")
      .insert({
        space_id: input.spaceId,
        title: input.title,
        visibility: input.visibility || "public",
        created_by: input.createdBy || null,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createCommunityChatMessage(input: CommunityChatMessageInput) {
    const { data, error } = await db
      .from("community_chat_messages")
      .insert({
        thread_id: input.threadId,
        author_user_id: input.authorUserId || null,
        body: input.body,
        status: input.status || "submitted",
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async enrollAffordabilityPlan(input: AffordabilityEnrollmentInput) {
    const { data, error } = await db
      .from("affordability_plan_enrollments")
      .insert(buildAffordabilityEnrollmentPayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createInvestmentScoreReview(input: InvestmentScoreReviewInput) {
    const { data, error } = await db
      .from("investment_score_reviews")
      .insert(buildInvestmentScoreReviewPayload(input))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createContributorMarketplaceListing(input: ContributorMarketplaceListingInput) {
    const { data, error } = await db
      .from("contributor_marketplace_listings")
      .insert({
        contributor_profile_id: input.contributorProfileId,
        service_type: input.serviceType,
        title: input.title,
        description: input.description || null,
        price_minor: input.priceMinor == null ? null : nonNegative(input.priceMinor),
        currency: input.currency || "GHS",
        service_area: input.serviceArea || null,
        portfolio_urls: input.portfolioUrls || [],
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createConstructionForecast(input: ConstructionForecastInput) {
    const { data, error } = await db
      .from("construction_forecasts")
      .insert({
        project_id: input.projectId || null,
        organization_id: input.organizationId || null,
        forecast_type: input.forecastType,
        forecast_value: input.forecastValue,
        confidence_score: clampPercent(input.confidenceScore),
        evidence_summary: input.evidenceSummary || null,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createDeveloperVerification(input: DeveloperVerificationInput) {
    const { data, error } = await db
      .from("developer_verifications")
      .insert({
        organization_id: input.organizationId,
        project_id: input.projectId || null,
        business_registration_reference: input.businessRegistrationReference || null,
        permit_reference: input.permitReference || null,
        land_reference: input.landReference || null,
        notes: input.notes || null,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async upsertWhiteLabelPackage(input: WhiteLabelPackageInput) {
    const { data, error } = await db
      .from("white_label_packages")
      .upsert(
        {
          organization_id: input.organizationId,
          package_name: input.packageName,
          custom_domain: input.customDomain || null,
          brand_palette: input.brandPalette || {},
          feature_flags: input.featureFlags || {},
          configured_by: input.configuredBy || null,
          metadata: input.metadata || {},
        },
        { onConflict: "organization_id,package_name" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async upsertCommissionRule(input: CommissionRuleInput) {
    const { data, error } = await db
      .from("commission_rules")
      .upsert(
        {
          organization_id: input.organizationId,
          name: input.name,
          applies_to: input.appliesTo || "all_deals",
          percentage: input.percentage == null ? null : clampPercent(input.percentage),
          flat_amount_minor: input.flatAmountMinor == null ? null : nonNegative(input.flatAmountMinor),
          currency: input.currency || "GHS",
          payout_cadence: input.payoutCadence || "on_close",
          created_by: input.createdBy || null,
          metadata: input.metadata || {},
        },
        { onConflict: "organization_id,name" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export const implementedProductionActivationFunctionNames = [
  "buildProviderConnectorPlan",
  "recordProviderIntegrationRun",
  "upsertLegalComplianceSignoff",
  "recordHyperlocalObservation",
  "createCommunityBroadcast",
  "createCommunityChatThread",
  "createCommunityChatMessage",
  "enrollAffordabilityPlan",
  "createInvestmentScoreReview",
  "createContributorMarketplaceListing",
  "createConstructionForecast",
  "createDeveloperVerification",
  "upsertWhiteLabelPackage",
  "upsertCommissionRule",
] as const;
