export type ApiKeyFreeFeatureStatus =
  | "available_now"
  | "provider_ready"
  | "legal_review"
  | "human_review"
  | "production_data_needed";

export interface ApiKeyFreeFeature {
  key: string;
  title: string;
  status: ApiKeyFreeFeatureStatus;
  category:
    | "content"
    | "media"
    | "finance"
    | "hyperlocal"
    | "community"
    | "trust"
    | "payments"
    | "iot"
    | "operations";
  userValue: string;
  noKeyImplementation: string;
  externalActivation: string;
}

export interface PropertyTaxInput {
  price: number;
  annualRent?: number;
  ownershipYears?: number;
  annualPropertyTaxRatePercent?: number;
  rentalIncomeTaxPercent?: number;
  maintenanceReservePercent?: number;
}

export interface AffordabilityScheduleInput {
  amount: number;
  currency?: string;
  cadence: "daily" | "weekly" | "monthly";
  installments: number;
  providerConfigured?: boolean;
  legalApproved?: boolean;
}

export interface MediaStudioInput {
  mediaTypes?: string[];
  hasMeasuredFloorPlan?: boolean;
  hasLiveOpenHouse?: boolean;
}

export interface ProviderActivationInput {
  provider: string;
  hasCredentials?: boolean;
  webhookConfigured?: boolean;
  sandboxEvidence?: boolean;
  legalApproved?: boolean;
}

export interface HyperlocalSignalInput {
  sourceKey: string;
  label: string;
  status?: "planned" | "manual_collection" | "connected" | "stale";
  confidenceScore?: number;
}

export const API_KEY_FREE_FEATURES: ApiKeyFreeFeature[] = [
  {
    key: "content_cms_newsletter",
    title: "Blog, CMS, and newsletter hub",
    status: "available_now",
    category: "content",
    userValue: "Publishes market guides, legal explainers, area updates, and buyer education.",
    noKeyImplementation:
      "Use local editorial cards, newsletter capture UI, moderation states, and SEO-ready routes.",
    externalActivation:
      "Connect a CMS/email provider later for scheduled sends, audience segments, and analytics.",
  },
  {
    key: "creator_marketplace",
    title: "Creator and local expert marketplace",
    status: "human_review",
    category: "content",
    userValue: "Lets photographers, local guides, and referral partners contribute verified content.",
    noKeyImplementation:
      "Use contributor profiles, payout review states, content QA, and tax-note placeholders.",
    externalActivation:
      "Add payout provider, contributor terms, and finance approval before money moves.",
  },
  {
    key: "virtual_media_studio",
    title: "3D/360 tours, live open houses, and measured floor plans",
    status: "provider_ready",
    category: "media",
    userValue: "Improves remote buyer confidence before site visits or deposits.",
    noKeyImplementation:
      "Accept virtual tour links, floor plan metadata, livestream URLs, readiness scores, and missing-media tasks.",
    externalActivation:
      "Connect tour capture, video streaming, and floor-plan measurement tools when selected.",
  },
  {
    key: "tax_impact_simulator",
    title: "Tax impact simulator",
    status: "available_now",
    category: "finance",
    userValue: "Shows configurable property tax, rental tax, reserve, and holding-cost estimates.",
    noKeyImplementation:
      "Use frontend-only calculators with strong legal/tax disclaimers and editable rates.",
    externalActivation:
      "Replace defaults with counsel/accounting-approved Ghana and diaspora tax rules.",
  },
  {
    key: "hyperlocal_feeds",
    title: "Flood, power, water, safety, transit, and density feeds",
    status: "production_data_needed",
    category: "hyperlocal",
    userValue: "Turns Ghana-specific neighborhood reality into search and listing confidence.",
    noKeyImplementation:
      "Show manual source readiness, confidence scores, disclosures, and last-updated states.",
    externalActivation:
      "Connect government, utility, transport, weather, field-agent, and partner data sources.",
  },
  {
    key: "community_spaces",
    title: "Neighborhood chats, Q&A, emergency alerts, and local guides",
    status: "human_review",
    category: "community",
    userValue: "Builds trust through local knowledge that global portals cannot copy.",
    noKeyImplementation:
      "Use pre-moderated community spaces, contribution queues, report actions, and broadcast gates.",
    externalActivation:
      "Approve moderation SLAs, abuse handling, WhatsApp/SMS broadcasts, and contributor operations.",
  },
  {
    key: "identity_registry_fraud",
    title: "Ghana Card, registry checks, liveness, sanctions, and image authenticity",
    status: "provider_ready",
    category: "trust",
    userValue: "Reduces fake profiles, ghost properties, stolen media, and high-risk transactions.",
    noKeyImplementation:
      "Use consent screens, manual review states, fraud signals, investigation notes, and human review gates.",
    externalActivation:
      "Add Ghana Card/liveness, registry, image authenticity, device fingerprinting, and sanctions providers.",
  },
  {
    key: "affordability_payments",
    title: "Weekly/daily rent plans, BNPL, and USSD handoff",
    status: "legal_review",
    category: "payments",
    userValue: "Makes rentals and deposits accessible without turning BaytMiftah into an informal lender.",
    noKeyImplementation:
      "Show plan schedules, consent language, legal guardrails, provider readiness, and PaymentService routing.",
    externalActivation:
      "Sign lender/payment partner contracts and obtain legal approval before activation.",
  },
  {
    key: "wallet_checkout",
    title: "Apple Pay, Google Pay, and mobile wallet checkout readiness",
    status: "provider_ready",
    category: "payments",
    userValue: "Improves checkout speed for diaspora and mobile-heavy users.",
    noKeyImplementation:
      "Display wallet readiness, provider fallback, and device support without importing SDK secrets.",
    externalActivation:
      "Enable wallets inside Stripe/Flutterwave/Paystack dashboards where supported.",
  },
  {
    key: "iot_provider_activation",
    title: "Smart locks, parking gates, dock doors, and occupancy sensors",
    status: "provider_ready",
    category: "iot",
    userValue: "Turns listings into managed smart properties after owner/agency approval.",
    noKeyImplementation:
      "Use provider-neutral device registry, access grants, audit rows, test scenarios, and revocation UI.",
    externalActivation:
      "Add TTLock, Yale, Tuya, parking gate, dock door, occupancy, and CCTV credentials server-side.",
  },
  {
    key: "sandbox_and_backup_evidence",
    title: "Provider sandbox evidence, audit anchoring, and backup restore drills",
    status: "human_review",
    category: "operations",
    userValue: "Proves money movement, fallback, audit integrity, and recovery before public launch.",
    noKeyImplementation:
      "Track evidence rows, scenario matrices, weekly anchor plan, and recovery drill checklists.",
    externalActivation:
      "Run real provider sandbox events, configure cron secrets, and attach recovery evidence.",
  },
];

export function summarizeApiKeyFreeFeatures(features = API_KEY_FREE_FEATURES) {
  const totals = features.reduce(
    (acc, feature) => {
      acc.total += 1;
      acc.byStatus[feature.status] = (acc.byStatus[feature.status] || 0) + 1;
      acc.byCategory[feature.category] = (acc.byCategory[feature.category] || 0) + 1;
      return acc;
    },
    {
      total: 0,
      byStatus: {} as Record<ApiKeyFreeFeatureStatus, number>,
      byCategory: {} as Record<ApiKeyFreeFeature["category"], number>,
    }
  );

  const apiKeyFreeCount = features.filter((feature) =>
    ["available_now", "human_review", "legal_review", "provider_ready", "production_data_needed"].includes(
      feature.status
    )
  ).length;

  return {
    ...totals,
    apiKeyFreeCount,
    externalActivationCount: features.length - (totals.byStatus.available_now || 0),
    percentLocallyDemonstrable: features.length
      ? Math.round((apiKeyFreeCount / features.length) * 100)
      : 0,
  };
}

export function calculatePropertyTaxImpact(input: PropertyTaxInput) {
  const price = Math.max(Number(input.price || 0), 0);
  const annualRent = Math.max(Number(input.annualRent || 0), 0);
  const ownershipYears = Math.max(Number(input.ownershipYears || 1), 1);
  const annualPropertyTaxRatePercent = input.annualPropertyTaxRatePercent ?? 0.5;
  const rentalIncomeTaxPercent = input.rentalIncomeTaxPercent ?? 8;
  const maintenanceReservePercent = input.maintenanceReservePercent ?? 1.5;

  const estimatedAnnualPropertyTax = price * (annualPropertyTaxRatePercent / 100);
  const estimatedAnnualRentalTax = annualRent * (rentalIncomeTaxPercent / 100);
  const annualMaintenanceReserve = price * (maintenanceReservePercent / 100);
  const annualCarryingCost =
    estimatedAnnualPropertyTax + estimatedAnnualRentalTax + annualMaintenanceReserve;
  const holdingPeriodCost = annualCarryingCost * ownershipYears;
  const netAnnualRentAfterEstimatedTaxAndReserve = Math.max(
    annualRent - estimatedAnnualRentalTax - annualMaintenanceReserve,
    0
  );

  return {
    estimatedAnnualPropertyTax,
    estimatedAnnualRentalTax,
    annualMaintenanceReserve,
    annualCarryingCost,
    holdingPeriodCost,
    netAnnualRentAfterEstimatedTaxAndReserve,
    disclaimer:
      "This is an editable planning estimate only. It is not tax, legal, lending, valuation, or investment advice.",
  };
}

export function buildAffordabilitySchedule(input: AffordabilityScheduleInput) {
  const installments = Math.max(Number(input.installments || 1), 1);
  const amount = Math.max(Number(input.amount || 0), 0);
  const installmentAmount = installments ? amount / installments : amount;
  const cadenceLabel =
    input.cadence === "daily" ? "Daily" : input.cadence === "weekly" ? "Weekly" : "Monthly";
  const canActivate = Boolean(input.providerConfigured && input.legalApproved);

  return {
    currency: input.currency || "GHS",
    cadence: input.cadence,
    cadenceLabel,
    installments,
    installmentAmount,
    totalAmount: amount,
    canActivate,
    activationGaps: [
      input.providerConfigured ? null : "Provider contract and credentials are pending.",
      input.legalApproved ? null : "Legal review is required before offering structured payments.",
    ].filter(Boolean) as string[],
  };
}

export function buildMediaStudioPlan(input: MediaStudioInput = {}) {
  const mediaTypes = new Set(input.mediaTypes || []);
  const tasks = [
    {
      key: "video",
      label: "Property video walkthrough",
      complete: mediaTypes.has("video"),
    },
    {
      key: "virtual_tour",
      label: "3D/360 virtual tour link",
      complete: mediaTypes.has("virtual_tour"),
    },
    {
      key: "floor_plan",
      label: "Measured floor plan",
      complete: Boolean(input.hasMeasuredFloorPlan || mediaTypes.has("floor_plan")),
    },
    {
      key: "live_open_house",
      label: "Live open-house stream URL",
      complete: Boolean(input.hasLiveOpenHouse || mediaTypes.has("live_open_house")),
    },
    {
      key: "drone",
      label: "Drone/exterior context",
      complete: mediaTypes.has("drone"),
    },
    {
      key: "renovation_before_after",
      label: "Before/after renovation gallery",
      complete: mediaTypes.has("renovation_before_after"),
    },
  ];
  const complete = tasks.filter((task) => task.complete).length;

  return {
    score: Math.round((complete / tasks.length) * 100),
    tasks,
    missingTasks: tasks.filter((task) => !task.complete),
    readyForRemoteBuyer: complete >= 4,
  };
}

export function buildProviderActivationPlan(input: ProviderActivationInput) {
  const checks = [
    {
      label: "Server-side credentials",
      complete: Boolean(input.hasCredentials),
      helper: "Never put provider API keys in frontend code.",
    },
    {
      label: "Webhook/callback configured",
      complete: Boolean(input.webhookConfigured),
      helper: "Signed callbacks must be verified before updating money or access state.",
    },
    {
      label: "Sandbox evidence attached",
      complete: Boolean(input.sandboxEvidence),
      helper: "Test success, failure, duplicate events, refunds, transfers, and fallback.",
    },
    {
      label: "Legal/ops approval",
      complete: Boolean(input.legalApproved),
      helper: "High-risk providers stay gated until policy and support runbooks are signed off.",
    },
  ];

  return {
    provider: input.provider,
    canGoLive: checks.every((check) => check.complete),
    checks,
    missing: checks.filter((check) => !check.complete).map((check) => check.label),
  };
}

export function buildHyperlocalSourceSummary(sources: HyperlocalSignalInput[]) {
  const normalized = sources.map((source) => ({
    ...source,
    status: source.status || "planned",
    confidenceScore: Math.max(0, Math.min(100, Number(source.confidenceScore || 0))),
  }));
  const connected = normalized.filter((source) => source.status === "connected").length;
  const manual = normalized.filter((source) => source.status === "manual_collection").length;
  const averageConfidence = normalized.length
    ? Math.round(
        normalized.reduce((sum, source) => sum + Number(source.confidenceScore || 0), 0) /
          normalized.length
      )
    : 0;

  return {
    connected,
    manual,
    plannedOrStale: normalized.length - connected - manual,
    averageConfidence,
    sources: normalized,
    disclosure:
      "Hyperlocal signals should show source, freshness, and confidence before they influence trust badges.",
  };
}
