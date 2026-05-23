import type { Page } from "@playwright/test";

export type MockMode = "public" | "workspace" | "admin";

type MockTables = Record<string, Array<Record<string, unknown>>>;

interface MockFixtureState {
  authUsers: Record<Exclude<MockMode, "public">, Record<string, unknown>>;
  tables: MockTables;
}

function createFixtureState(): MockFixtureState {
  const nowIso = "2026-05-18T10:30:00.000Z";
  const yesterdayIso = "2026-05-17T10:30:00.000Z";
  const nowMs = Date.parse(nowIso);

  const organization = {
    id: "org-1",
    name: "Prime Estates",
    slug: "prime-estates",
    description: "Verified Accra brokerage focused on premium homes and executive rentals.",
    email: "hello@primeestates.gh",
    phone: "+233201112223",
    website: "https://primeestates.gh",
    logo_url: "https://placehold.co/80x80",
    banner_url: null,
    business_address: "5 Independence Avenue, Accra",
    license_number: "BM-AG-001",
    ghana_business_registration_number: "CS123456",
    property_types_handled: ["apartment", "house", "office"],
    owner_id: "user-admin-owner",
    verified: true,
    suspended: false,
    verification_status: "verified",
    verification_submitted_at: "2026-05-10T09:00:00.000Z",
    verified_at: "2026-05-11T09:00:00.000Z",
    paystack_transfer_recipient_code: "RCP_prime_estates",
    created_at: "2026-04-01T09:00:00.000Z",
    updated_at: nowIso,
  };

  const ownerUser = {
    id: "user-admin-owner",
    email: "admin@baytmiftah.app",
    full_name: "Amina Admin",
    phone: "+233241234567",
    verified: true,
    banned: false,
    preferred_contact_channel: "email",
    phone_verified_at: "2026-05-01T09:00:00.000Z",
    avatar_url: null,
    created_at: "2026-04-01T09:00:00.000Z",
    updated_at: nowIso,
    user_metadata: {
      full_name: "Amina Admin",
    },
    app_metadata: {
      provider: "email",
    },
    aud: "authenticated",
    role: "authenticated",
  };

  const buyerUser = {
    id: "user-buyer",
    email: "buyer@example.com",
    full_name: "Kojo Buyer",
    phone: "+233271112223",
    verified: true,
    banned: false,
    preferred_contact_channel: "sms",
    phone_verified_at: "2026-05-02T09:00:00.000Z",
    avatar_url: null,
    created_at: "2026-04-02T09:00:00.000Z",
    updated_at: nowIso,
  };

  const growthTier = {
    id: "growth",
    name: "Growth",
    description: "For active property teams managing verified inventory.",
    currency: "GHS",
    price_minor: 199000,
    billing_interval: "monthly",
    agent_seat_limit: 12,
    active_listing_limit: 50,
    paystack_plan_code: "plan_growth_live",
    stripe_price_id_usd: "price_growth_usd_live",
    stripe_price_id_gbp: "price_growth_gbp_live",
    stripe_price_id_eur: "price_growth_eur_live",
    flutterwave_plan_id_ghs: "flw_growth_ghs_live",
    flutterwave_plan_id_usd: "flw_growth_usd_live",
    flutterwave_plan_id_gbp: "flw_growth_gbp_live",
    flutterwave_plan_id_eur: "flw_growth_eur_live",
    feature_summary: ["12 team seats", "50 active public listings", "Escrow and billing controls"],
    is_active: true,
    sort_order: 2,
  };

  const starterTier = {
    ...growthTier,
    id: "starter",
    name: "Starter",
    price_minor: 79000,
    agent_seat_limit: 4,
    active_listing_limit: 12,
    paystack_plan_code: "plan_starter_live",
    stripe_price_id_usd: "price_starter_usd_live",
    stripe_price_id_gbp: "price_starter_gbp_live",
    stripe_price_id_eur: "price_starter_eur_live",
    flutterwave_plan_id_ghs: "flw_starter_ghs_live",
    flutterwave_plan_id_usd: "flw_starter_usd_live",
    flutterwave_plan_id_gbp: "flw_starter_gbp_live",
    flutterwave_plan_id_eur: "flw_starter_eur_live",
    feature_summary: ["4 team seats", "12 active public listings"],
    sort_order: 1,
  };

  const proTier = {
    ...growthTier,
    id: "pro",
    name: "Pro",
    price_minor: 399000,
    agent_seat_limit: 30,
    active_listing_limit: 150,
    paystack_plan_code: "plan_pro_live",
    stripe_price_id_usd: "price_pro_usd_live",
    stripe_price_id_gbp: "price_pro_gbp_live",
    stripe_price_id_eur: "price_pro_eur_live",
    flutterwave_plan_id_ghs: "flw_pro_ghs_live",
    flutterwave_plan_id_usd: "flw_pro_usd_live",
    flutterwave_plan_id_gbp: "flw_pro_gbp_live",
    flutterwave_plan_id_eur: "flw_pro_eur_live",
    feature_summary: ["30 team seats", "150 active public listings", "Advanced trust automation"],
    sort_order: 3,
  };

  const eastLegonSale = {
    id: "listing-east-legon-sale",
    organization_id: organization.id,
    property_id: "property-east-legon-sale",
    listing_type: "sale",
    price: 1850000,
    currency: "GHS",
    status: "listed",
    visibility: "public",
    verification_status: "verified",
    verification_notes: null,
    inspection_fee_amount: 50000,
    quality_score: 92,
    published_at: "2026-05-16T10:30:00.000Z",
    created_at: "2026-05-12T10:30:00.000Z",
    updated_at: nowIso,
    property: {
      id: "property-east-legon-sale",
      address: "5 Palm Avenue",
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "East Legon",
      country: "Ghana",
      category: "apartment",
      description: "Three-bedroom apartment with backup power, parking, and concierge access.",
      bedrooms: 3,
      bathrooms: 2,
      square_meters: 180,
      amenities: ["Parking", "Security", "Backup power"],
      ghana_post_gps: "GA-123-4567",
      latitude: 5.6402,
      longitude: -0.1514,
      location_confidence: 94,
      media: [
        {
          id: "media-east-legon-sale-1",
          property_id: "property-east-legon-sale",
          public_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
          media_type: "image",
          is_primary: true,
        },
      ],
    },
    organization: {
      name: organization.name,
      slug: organization.slug,
      verified: organization.verified,
      suspended: organization.suspended,
      logo_url: organization.logo_url,
      email: organization.email,
      phone: organization.phone,
    },
  };

  const cantonmentsRental = {
    id: "listing-cantonments-rental",
    organization_id: organization.id,
    property_id: "property-cantonments-rental",
    listing_type: "rental",
    price: 22000,
    currency: "GHS",
    status: "listed",
    visibility: "public",
    verification_status: "verified",
    verification_notes: null,
    inspection_fee_amount: 1500,
    quality_score: 88,
    published_at: "2026-05-15T10:30:00.000Z",
    created_at: "2026-05-11T10:30:00.000Z",
    updated_at: nowIso,
    property: {
      id: "property-cantonments-rental",
      address: "14 Embassy Road",
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "Cantonments",
      country: "Ghana",
      category: "apartment",
      description: "Furnished executive rental close to embassies and retail corridors.",
      bedrooms: 2,
      bathrooms: 2,
      square_meters: 135,
      amenities: ["Furnished", "Security", "Parking"],
      ghana_post_gps: "GA-222-8899",
      latitude: 5.5642,
      longitude: -0.1688,
      location_confidence: 91,
      media: [
        {
          id: "media-cantonments-rental-1",
          property_id: "property-cantonments-rental",
          public_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
          media_type: "image",
          is_primary: true,
        },
      ],
    },
    organization: {
      name: organization.name,
      slug: organization.slug,
      verified: organization.verified,
      suspended: organization.suspended,
      logo_url: organization.logo_url,
      email: organization.email,
      phone: organization.phone,
    },
  };

  const kumasiRental = {
    id: "listing-ahodwo-rental",
    organization_id: organization.id,
    property_id: "property-ahodwo-rental",
    listing_type: "rental",
    price: 9500,
    currency: "GHS",
    status: "listed",
    visibility: "public",
    verification_status: "in_review",
    verification_notes: "Field photos approved.",
    inspection_fee_amount: 1000,
    quality_score: 82,
    published_at: "2026-05-14T10:30:00.000Z",
    created_at: "2026-05-10T10:30:00.000Z",
    updated_at: nowIso,
    property: {
      id: "property-ahodwo-rental",
      address: "32 Lake Road",
      city: "Kumasi",
      region: "Ashanti",
      neighborhood: "Ahodwo",
      country: "Ghana",
      category: "house",
      description: "Detached family home in a quiet Kumasi residential corridor.",
      bedrooms: 4,
      bathrooms: 3,
      square_meters: 240,
      amenities: ["Water storage", "Parking", "Security"],
      ghana_post_gps: "AK-770-1100",
      latitude: 6.6885,
      longitude: -1.6244,
      location_confidence: 87,
      media: [
        {
          id: "media-ahodwo-rental-1",
          property_id: "property-ahodwo-rental",
          public_url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
          media_type: "image",
          is_primary: true,
        },
      ],
    },
    organization: {
      name: organization.name,
      slug: organization.slug,
      verified: organization.verified,
      suspended: organization.suspended,
      logo_url: organization.logo_url,
      email: organization.email,
      phone: organization.phone,
    },
  };

  const pendingOfficeListing = {
    id: "listing-airport-office",
    organization_id: organization.id,
    property_id: "property-airport-office",
    listing_type: "lease",
    price: 45000,
    currency: "GHS",
    status: "pending_review",
    visibility: "hidden",
    verification_status: "submitted",
    verification_notes: "Awaiting moderation review.",
    inspection_fee_amount: 0,
    quality_score: 74,
    published_at: null,
    created_at: "2026-05-13T10:30:00.000Z",
    updated_at: nowIso,
    property: {
      id: "property-airport-office",
      address: "1 Liberation Road",
      city: "Accra",
      region: "Greater Accra",
      neighborhood: "Airport Residential",
      country: "Ghana",
      category: "office",
      description: "Plug-and-play office floor with meeting rooms and secure access control.",
      bedrooms: 0,
      bathrooms: 2,
      square_meters: 320,
      amenities: ["Security", "Backup power", "Parking"],
      ghana_post_gps: "GA-555-0022",
      latitude: 5.6056,
      longitude: -0.1824,
      location_confidence: 89,
      media: [
        {
          id: "media-airport-office-1",
          property_id: "property-airport-office",
          public_url: "https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=1200&q=80",
          media_type: "image",
          is_primary: true,
        },
      ],
    },
    organization: {
      name: organization.name,
      slug: organization.slug,
      verified: organization.verified,
      suspended: organization.suspended,
      logo_url: organization.logo_url,
      email: organization.email,
      phone: organization.phone,
    },
  };

  const fraudAlert = {
    id: "fraud-alert-1",
    organization_id: organization.id,
    title: "Marketplace listing report",
    target_type: "listing",
    target_id: pendingOfficeListing.id,
    listing_id: pendingOfficeListing.id,
    lead_id: null,
    alert_type: "fake_listing",
    severity: "high",
    status: "pending",
    description: "A marketplace visitor flagged the office listing for inconsistent ownership proof.",
    evidence: { report_id: "fraud-report-1" },
    created_at: yesterdayIso,
    updated_at: nowIso,
  };

  const fraudReport = {
    id: "fraud-report-1",
    reporter_id: buyerUser.id,
    target_type: "listing",
    target_id: pendingOfficeListing.id,
    reason: "fake_listing",
    description: "The title pack did not match the street address shown in the listing gallery.",
    status: "pending",
    created_at: yesterdayIso,
    updated_at: nowIso,
  };

  return {
    authUsers: {
      workspace: ownerUser,
      admin: ownerUser,
    },
    tables: {
      analytics_events: [],
      audit_logs: [
        {
          id: "audit-1",
          admin_id: ownerUser.id,
          action: "fraud_case_created",
          target_type: "listing",
          target_id: pendingOfficeListing.id,
          details: { alert_id: fraudAlert.id },
          created_at: nowIso,
        },
      ],
      buyer_requests: [
        {
          id: "buyer-request-1",
          user_id: null,
          title: "Need to buy apartment in Airport Residential, Accra",
          buyer_label: "Akos buyer",
          location: "Airport Residential, Accra",
          listing_type: "sale",
          property_type: "apartment",
          budget_min: 1200000,
          budget_max: 1800000,
          bedrooms: 3,
          notes: "Needs verified title support, backup power, and an August move window.",
          channel: "anonymous",
          is_public: true,
          created_at: yesterdayIso,
        },
      ],
      currency_rates: [
        {
          from: "GHS",
          to: "USD",
          rate: 0.08,
          timestamp: nowMs,
        },
        {
          from: "GHS",
          to: "GBP",
          rate: 0.06,
          timestamp: nowMs,
        },
      ],
      fraud_alerts: [fraudAlert],
      fraud_case_events: [
        {
          id: "fraud-case-event-1",
          case_id: "fraud-case-1",
          actor_user_id: ownerUser.id,
          event_type: "case_assigned",
          note: "Assigned to platform admin for review.",
          metadata: { assigned_to: ownerUser.id },
          created_at: nowIso,
        },
      ],
      fraud_reports: [fraudReport],
      fraud_review_cases: [
        {
          id: "fraud-case-1",
          alert_id: fraudAlert.id,
          target_type: fraudAlert.target_type,
          target_id: fraudAlert.target_id,
          priority: "high",
          summary: "Review the Airport Residential office title pack before publishing.",
          assigned_to: ownerUser.id,
          status: "investigating",
          resolved_at: null,
          resolution_notes: null,
          created_at: yesterdayIso,
          updated_at: nowIso,
          alert: fraudAlert,
          report: fraudReport,
        },
      ],
      ghana_market_locations: [
        {
          id: "ghana-market-1",
          city: "Accra",
          region: "Greater Accra",
          neighborhood: "East Legon",
          safety_score: 4.1,
          investment_score: 4.4,
          accessibility_score: 4.2,
          walkability_score: 3.9,
          school_proximity_score: 4.2,
          healthcare_proximity_score: 4.0,
          flood_risk_level: "medium",
          demand_level: "very_high",
          notes: "Premium rental demand with strong expat, student, and professional tenant activity.",
        },
        {
          id: "ghana-market-2",
          city: "Kumasi",
          region: "Ashanti",
          neighborhood: "Ahodwo",
          safety_score: 4.0,
          investment_score: 3.9,
          accessibility_score: 3.8,
          walkability_score: 3.4,
          school_proximity_score: 3.8,
          healthcare_proximity_score: 3.9,
          flood_risk_level: "medium",
          demand_level: "high",
          notes: "Established residential and hospitality corridor in Kumasi.",
        },
      ],
      listings: [eastLegonSale, cantonmentsRental, kumasiRental, pendingOfficeListing],
      location_trends: [
        {
          id: "trend-1",
          city: "Accra",
          region: "Greater Accra",
          demand_level: "very_high",
          growth_rate: 7.4,
          investment_score: 4.4,
          safety_score: 4.1,
          accessibility_score: 4.2,
          trending_up: true,
          updated_at: nowIso,
        },
        {
          id: "trend-2",
          city: "Kumasi",
          region: "Ashanti",
          demand_level: "high",
          growth_rate: 4.1,
          investment_score: 3.9,
          safety_score: 4.0,
          accessibility_score: 3.8,
          trending_up: true,
          updated_at: yesterdayIso,
        },
      ],
      market_analytics: [
        {
          id: "analytics-1",
          location: "Accra",
          period: "monthly",
          avg_price: 962000,
          median_price: 910000,
          total_listings: 24,
          new_listings: 5,
          price_trend: 6.8,
          created_at: nowIso,
        },
        {
          id: "analytics-2",
          location: "Kumasi",
          period: "monthly",
          avg_price: 418000,
          median_price: 395000,
          total_listings: 11,
          new_listings: 2,
          price_trend: 3.6,
          created_at: yesterdayIso,
        },
      ],
      organization_billing_events: [
        {
          id: "billing-event-1",
          organization_id: organization.id,
          subscription_id: "subscription-1",
          actor_user_id: ownerUser.id,
          event_type: "subscription_renewed",
          message: "Growth plan renewed through Paystack.",
          metadata: { provider: "paystack" },
          created_at: nowIso,
        },
      ],
      organization_documents: [
        {
          id: "organization-document-1",
          organization_id: organization.id,
          listing_id: eastLegonSale.id,
          title: "Signed title packet",
          document_type: "title_check",
          signed_at: "2026-05-16T09:00:00.000Z",
          status: "signed",
          public_visibility: true,
          public_summary: "Counsel-reviewed title packet available for trust review.",
          updated_at: nowIso,
        },
      ],
      organization_insights: [
        {
          id: "organization-insight-1",
          organization_id: organization.id,
          response_time_hours: 3.5,
          conversion_rate: 0.32,
          customer_satisfaction_score: 4.6,
        },
      ],
      organization_members: [
        {
          id: "membership-1",
          organization_id: organization.id,
          user_id: ownerUser.id,
          role: "owner",
          organization,
        },
      ],
      organization_subscription_payments: [
        {
          id: "subscription-payment-1",
          organization_id: organization.id,
          subscription_id: "subscription-1",
          provider_reference: "pay_renew_001",
          amount_minor: growthTier.price_minor,
          currency: "GHS",
          status: "success",
          paid_at: nowIso,
          payment_channel: "mtn_momo",
          gateway_response: "Approved",
          authorization_url: null,
          stripe_checkout_session_id: null,
          created_at: nowIso,
        },
      ],
      organization_subscriptions: [
        {
          id: "subscription-1",
          organization_id: organization.id,
          tier_id: growthTier.id,
          pending_tier_id: null,
          pending_tier_effective_at: null,
          provider: "paystack",
          status: "active",
          authorization_url: null,
          provider_reference: "sub_001",
          current_period_start: "2026-05-01T00:00:00.000Z",
          current_period_end: "2026-06-01T00:00:00.000Z",
          next_payment_at: "2026-06-01T00:00:00.000Z",
          grace_period_ends_at: null,
          cancel_at_period_end: false,
          activated_at: "2026-05-01T00:00:00.000Z",
          suspended_at: null,
          cancelled_at: null,
        },
      ],
      organizations: [organization],
      platform_admins: [
        {
          id: "platform-admin-1",
          user_id: ownerUser.id,
          role: "admin",
          status: "active",
          created_at: "2026-05-01T09:00:00.000Z",
          updated_at: nowIso,
          user: {
            email: ownerUser.email,
            full_name: ownerUser.full_name,
          },
        },
      ],
      launch_readiness_items: [
        {
          id: "readiness-payment-sandbox",
          workstream: "payment_sandbox",
          title: "Run payment provider sandbox matrix",
          description: "Verify success, failure, duplicate webhook, refund, release, and fallback events.",
          status: "ready_for_review",
          priority: "critical",
          owner_team: "engineering",
          due_at: null,
          reviewed_by: null,
          reviewed_at: null,
          metadata: {},
          created_at: yesterdayIso,
          updated_at: nowIso,
        },
        {
          id: "readiness-identity",
          workstream: "identity_verification",
          title: "Approve Ghana Card and liveness vendor",
          description: "Confirm consent, fallback review, data retention, and DPIA before live identity checks.",
          status: "blocked",
          priority: "critical",
          owner_team: "trust",
          due_at: null,
          reviewed_by: null,
          reviewed_at: null,
          metadata: {},
          created_at: yesterdayIso,
          updated_at: nowIso,
        },
        {
          id: "readiness-community",
          workstream: "community",
          title: "Moderation playbook for neighborhood spaces",
          description: "Define emergency broadcast rules, abuse escalation, and local guide review SLAs.",
          status: "in_progress",
          priority: "high",
          owner_team: "operations",
          due_at: null,
          reviewed_by: null,
          reviewed_at: null,
          metadata: {},
          created_at: yesterdayIso,
          updated_at: nowIso,
        },
      ],
      external_provider_readiness: [
        {
          id: "provider-paystack-live",
          provider_category: "payment",
          provider_key: "paystack",
          display_name: "Paystack",
          environment: "production",
          status: "approved",
          fallback_provider_key: null,
          has_live_secret: true,
          webhook_configured: true,
          sandbox_verified_at: yesterdayIso,
          production_verified_at: null,
          last_checked_at: nowIso,
          notes: "Primary Ghana payment lane for MoMo, card, transfer, subscriptions, escrow release, and refunds.",
          metadata: {},
        },
        {
          id: "provider-ghana-card",
          provider_category: "identity",
          provider_key: "ghana_card_vendor",
          display_name: "Ghana Card / Liveness Vendor",
          environment: "production",
          status: "credentials_pending",
          fallback_provider_key: "manual_review",
          has_live_secret: false,
          webhook_configured: false,
          sandbox_verified_at: null,
          production_verified_at: null,
          last_checked_at: nowIso,
          notes: "Must stay disabled until legal review and vendor contract are complete.",
          metadata: {},
        },
      ],
      property_escrows: [
        {
          id: "escrow-1",
          transaction_id: "txn-1",
          listing_id: eastLegonSale.id,
          property_id: eastLegonSale.property_id,
          organization_id: organization.id,
          payer_user_id: buyerUser.id,
          amount_minor: 25000000,
          currency: "GHS",
          status: "disputed",
          dispute_reason: "Buyer asked for updated title confirmation before release.",
          disputed_at: nowIso,
          cancellation_deadline_at: "2026-05-24T10:30:00.000Z",
          created_at: yesterdayIso,
          updated_at: nowIso,
          organization: {
            name: organization.name,
            slug: organization.slug,
            paystack_transfer_recipient_code: organization.paystack_transfer_recipient_code,
          },
          payer: {
            full_name: buyerUser.full_name,
            email: buyerUser.email,
          },
          listing: {
            property: {
              address: eastLegonSale.property.address,
              city: eastLegonSale.property.city,
              region: eastLegonSale.property.region,
            },
          },
          documents: [
            {
              id: "escrow-document-1",
              document_type: "ownership_deed",
              title: "Ownership deed",
              status: "approved",
              watermarked_sha256: "sha256-ownership",
              document_sha256: "sha256-ownership",
            },
          ],
          events: [
            {
              id: "escrow-event-1",
              event_type: "dispute_opened",
              note: "Buyer requested another title confirmation pass.",
              created_at: nowIso,
            },
          ],
        },
      ],
      subscription_invoices: [
        {
          id: "invoice-1",
          subscription_id: "subscription-1",
          invoice_number: "INV-2026-0501",
          amount_minor: growthTier.price_minor,
          currency: "GHS",
          status: "paid",
          period_start: "2026-05-01T00:00:00.000Z",
          period_end: "2026-06-01T00:00:00.000Z",
          issued_at: "2026-05-01T00:00:00.000Z",
          paid_at: "2026-05-01T01:00:00.000Z",
          invoice_pdf_url: "https://example.com/invoice-1.pdf",
        },
      ],
      subscription_tiers: [starterTier, growthTier, proTier],
      users: [ownerUser, buyerUser],
    },
  };
}

export async function installMockBackend(page: Page, mode: MockMode) {
  const fixtures = createFixtureState();

  await page.addInitScript(
    ({ fixtures: serializedFixtures, mode: currentMode, supabaseUrl }) => {
      const supabaseOrigin = new URL(supabaseUrl).origin;
      const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
      const storageKey = `sb-${projectRef}-auth-token`;
      const state = {
        tables: JSON.parse(JSON.stringify(serializedFixtures.tables)),
      };
      window.__BAYTMIFTAH_MOCK_LOGS__ = [];

      function toBase64Url(value) {
        return btoa(JSON.stringify(value))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/g, "");
      }

      function buildAccessToken(user) {
        const exp = Math.floor(Date.now() / 1000) + 60 * 60;
        return `${toBase64Url({ alg: "HS256", typ: "JWT" })}.${toBase64Url({
          sub: user.id,
          email: user.email,
          role: "authenticated",
          aal: "aal1",
          amr: ["password"],
          exp,
        })}.mock-signature`;
      }

      function createSession(user) {
        const exp = Math.floor(Date.now() / 1000) + 60 * 60;
        return {
          access_token: buildAccessToken(user),
          refresh_token: "mock-refresh-token",
          expires_in: 60 * 60,
          expires_at: exp,
          token_type: "bearer",
          user,
        };
      }

      const signedInUser =
        currentMode === "public" ? null : serializedFixtures.authUsers[currentMode];
      const activeSession = signedInUser ? createSession(signedInUser) : null;
      const authOverride = {
        user: activeSession?.user ?? null,
        authAssurance: {
          currentLevel: activeSession ? "aal1" : null,
          nextLevel: activeSession ? "aal1" : null,
        },
      };

      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          localStorage.removeItem(key);
        }
      }

      if (activeSession) {
        localStorage.setItem(storageKey, JSON.stringify(activeSession));
      } else {
        localStorage.removeItem(storageKey);
      }

      window.__BAYTMIFTAH_AUTH_OVERRIDE__ = authOverride;

      function jsonResponse(
        body,
        options: { status?: number; headers?: Record<string, string> } = {}
      ) {
        const headers = new Headers(options.headers || {});
        if (!headers.has("content-type")) {
          headers.set("content-type", "application/json");
        }

        return new Response(body === null ? "null" : JSON.stringify(body), {
          status: options.status || 200,
          headers,
        });
      }

      function emptyResponse(status = 200, headers: Record<string, string> = {}) {
        return new Response(null, { status, headers });
      }

      function ensureTable(table) {
        if (!state.tables[table]) {
          state.tables[table] = [];
        }

        return state.tables[table];
      }

      function normalizeText(value) {
        return String(value ?? "")
          .trim()
          .toLowerCase();
      }

      function normalizePath(path) {
        return path
          .replace(/^properties\./, "property.")
          .replace(/^organizations\./, "organization.")
          .replace(/^users\./, "user.");
      }

      function getPathValue(row, path) {
        return normalizePath(path)
          .split(".")
          .reduce((current, part) => (current == null ? current : current[part]), row);
      }

      function decodeFilterValue(rawValue) {
        return decodeURIComponent(rawValue)
          .replace(/\+/g, " ")
          .replace(/^"/, "")
          .replace(/"$/, "");
      }

      function comparePrimitive(actual, expected) {
        if (actual == null && expected == null) return true;
        if (typeof actual === "boolean") {
          return String(actual) === String(expected).toLowerCase();
        }

        const actualNumber = Number(actual);
        const expectedNumber = Number(expected);
        if (Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)) {
          return actualNumber === expectedNumber;
        }

        return normalizeText(actual) === normalizeText(expected);
      }

      function compareRange(actual, expected, operator) {
        if (actual == null) return false;

        const actualNumber = Number(actual);
        const expectedNumber = Number(expected);
        if (Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)) {
          if (operator === "gte") return actualNumber >= expectedNumber;
          if (operator === "lte") return actualNumber <= expectedNumber;
          if (operator === "gt") return actualNumber > expectedNumber;
          return actualNumber < expectedNumber;
        }

        const actualDate = Date.parse(String(actual));
        const expectedDate = Date.parse(String(expected));
        if (!Number.isNaN(actualDate) && !Number.isNaN(expectedDate)) {
          if (operator === "gte") return actualDate >= expectedDate;
          if (operator === "lte") return actualDate <= expectedDate;
          if (operator === "gt") return actualDate > expectedDate;
          return actualDate < expectedDate;
        }

        if (operator === "gte") return String(actual) >= String(expected);
        if (operator === "lte") return String(actual) <= String(expected);
        if (operator === "gt") return String(actual) > String(expected);
        return String(actual) < String(expected);
      }

      function matchesLike(actual, pattern) {
        if (actual == null) return false;

        const value = normalizeText(actual);
        const cleanedPattern = decodeFilterValue(pattern)
          .toLowerCase()
          .replace(/^%/, "")
          .replace(/%$/, "");

        if (!cleanedPattern) return true;
        return value.includes(cleanedPattern);
      }

      function applyFilter(rows, rawPath, expression) {
        const path = normalizePath(rawPath);

        if (expression.startsWith("eq.")) {
          const expected = decodeFilterValue(expression.slice(3));
          return rows.filter((row) => comparePrimitive(getPathValue(row, path), expected));
        }

        if (expression.startsWith("neq.")) {
          const expected = decodeFilterValue(expression.slice(4));
          return rows.filter((row) => !comparePrimitive(getPathValue(row, path), expected));
        }

        if (expression.startsWith("ilike.")) {
          const expected = expression.slice(6);
          return rows.filter((row) => matchesLike(getPathValue(row, path), expected));
        }

        if (expression.startsWith("gte.")) {
          const expected = decodeFilterValue(expression.slice(4));
          return rows.filter((row) => compareRange(getPathValue(row, path), expected, "gte"));
        }

        if (expression.startsWith("lte.")) {
          const expected = decodeFilterValue(expression.slice(4));
          return rows.filter((row) => compareRange(getPathValue(row, path), expected, "lte"));
        }

        if (expression.startsWith("gt.")) {
          const expected = decodeFilterValue(expression.slice(3));
          return rows.filter((row) => compareRange(getPathValue(row, path), expected, "gt"));
        }

        if (expression.startsWith("lt.")) {
          const expected = decodeFilterValue(expression.slice(3));
          return rows.filter((row) => compareRange(getPathValue(row, path), expected, "lt"));
        }

        if (expression.startsWith("in.(") && expression.endsWith(")")) {
          const values = expression
            .slice(4, -1)
            .split(",")
            .map((value) => decodeFilterValue(value))
            .filter(Boolean);

          return rows.filter((row) =>
            values.some((value) => comparePrimitive(getPathValue(row, path), value))
          );
        }

        if (expression === "is.null") {
          return rows.filter((row) => getPathValue(row, path) == null);
        }

        if (expression === "not.is.null") {
          return rows.filter((row) => getPathValue(row, path) != null);
        }

        return rows;
      }

      function applyOrFilter(rows, expression, foreignTable) {
        const segments = decodeURIComponent(expression)
          .replace(/^\(/, "")
          .replace(/\)$/, "")
          .split(",")
          .map((segment) => segment.trim())
          .filter(Boolean);

        return rows.filter((row) =>
          segments.some((segment) => {
            const firstDot = segment.indexOf(".");
            const secondDot = segment.indexOf(".", firstDot + 1);
            if (firstDot === -1 || secondDot === -1) {
              return false;
            }

            const field = segment.slice(0, firstDot);
            const operator = segment.slice(firstDot + 1, secondDot);
            const value = segment.slice(secondDot + 1);
            const path = foreignTable ? `${foreignTable}.${field}` : field;
            return applyFilter([row], path, `${operator}.${value}`).length > 0;
          })
        );
      }

      function sortRows(rows, orderExpressions) {
        const expressions = orderExpressions
          .map((value) => value.trim())
          .filter(Boolean);

        if (expressions.length === 0) {
          return rows;
        }

        return [...rows].sort((left, right) => {
          for (const expression of expressions) {
            const [rawPath, rawDirection = "asc"] = expression.split(".");
            const path = normalizePath(rawPath);
            const direction = rawDirection === "desc" ? -1 : 1;
            const leftValue = getPathValue(left, path);
            const rightValue = getPathValue(right, path);

            if (leftValue == null && rightValue == null) {
              continue;
            }

            if (leftValue == null) return 1;
            if (rightValue == null) return -1;

            const leftNumber = Number(leftValue);
            const rightNumber = Number(rightValue);
            if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
              if (leftNumber !== rightNumber) {
                return (leftNumber - rightNumber) * direction;
              }
              continue;
            }

            const leftDate = Date.parse(String(leftValue));
            const rightDate = Date.parse(String(rightValue));
            if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
              if (leftDate !== rightDate) {
                return (leftDate - rightDate) * direction;
              }
              continue;
            }

            const compared = String(leftValue).localeCompare(String(rightValue));
            if (compared !== 0) {
              return compared * direction;
            }
          }

          return 0;
        });
      }

      function getContentRange(start, end, total) {
        const safeTotal = Math.max(total, 0);
        const safeStart = Math.max(start, 0);
        const safeEnd = end == null ? Math.max(safeStart, safeTotal - 1, safeStart) : end;
        return `${safeStart}-${safeEnd}/${safeTotal}`;
      }

      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input, init) => {
        const request = input instanceof Request ? input : new Request(String(input), init);
        const url = new URL(request.url, window.location.origin);
        const method = request.method.toUpperCase();

        if (url.origin === supabaseOrigin && url.pathname === "/auth/v1/user") {
          if (!activeSession) {
            return jsonResponse({ message: "Auth session missing!" }, { status: 401 });
          }

          return jsonResponse(activeSession.user);
        }

        if (url.origin === supabaseOrigin && url.pathname.startsWith("/auth/v1/token")) {
          if (!activeSession) {
            return jsonResponse({ message: "Auth session missing!" }, { status: 401 });
          }

          return jsonResponse(activeSession);
        }

        if (url.origin === "https://open.er-api.com") {
          return jsonResponse({
            result: "success",
            rates: {
              USD: 0.08,
              GBP: 0.06,
              GHS: 1,
            },
          });
        }

        if (url.origin === supabaseOrigin && url.pathname.startsWith("/functions/v1/")) {
          const functionName = url.pathname.replace("/functions/v1/", "");
          const bodyText = await request.text().catch(() => "");
          const body = bodyText ? JSON.parse(bodyText) : {};
          const now = new Date().toISOString();

          window.__BAYTMIFTAH_MOCK_LOGS__.push({
            functionName,
            method,
            body,
          });

          if (functionName === "verify-organization-subscription") {
            const organizationRow = ensureTable("organizations")[0];
            return jsonResponse({
              alreadyProcessed: false,
              organization: organizationRow,
              subscription: ensureTable("organization_subscriptions")[0],
            });
          }

          if (functionName === "initialize-organization-subscription") {
            const provider = body.provider || "paystack";
            return jsonResponse({
              provider,
              requestedProvider: provider,
              fallbackAttempted: provider !== "paystack",
              authorizationUrl: "/workspace?billing=verify&reference=mock_subscription_reference",
              reference: "mock_subscription_reference",
              organization: ensureTable("organizations")[0],
              subscription: ensureTable("organization_subscriptions")[0],
            });
          }

          if (functionName === "initialize-property-payment") {
            const provider = body.provider || "paystack";
            const listing = ensureTable("listings").find((row) => row.id === body.listingId) || ensureTable("listings")[0];
            const transaction = {
              id: `mock-transaction-${Date.now()}`,
              listing_id: listing?.id || body.listingId,
              organization_id: listing?.organization_id || "org-1",
              payer_user_id: activeSession?.user?.id || "user-buyer",
              provider: provider === "paystack" ? "paystack" : "paystack",
              requested_provider: provider,
              provider_reference: "mock_property_reference",
              amount_minor: Math.round(Number(body.amount || 0) * 100),
              currency: "GHS",
              purpose: body.purpose || "deposit",
              status: "initialized",
              created_at: now,
              updated_at: now,
              listing,
            };
            ensureTable("property_transactions").unshift(transaction);
            return jsonResponse({
              transaction,
              authorizationUrl: "/app/payments?checkout=mock_property_reference",
              accessCode: "mock_access_code",
              reference: "mock_property_reference",
              provider: "paystack",
              requestedProvider: provider,
              fallbackAttempted: provider !== "paystack",
              fallbackAttempts: provider !== "paystack" ? [{ provider, reference: "mock_failed_reference", error: "Provider credentials not configured in mock." }] : [],
              callbackUrl: "/app/payments?checkout=mock_property_reference",
            });
          }

          if (functionName === "verify-property-payment") {
            const transaction = ensureTable("property_transactions")[0];
            return jsonResponse({
              status: "success",
              alreadyProcessed: false,
              transaction: {
                ...transaction,
                status: "success",
                paid_at: now,
                updated_at: now,
              },
              receipt: {
                id: "mock-receipt-1",
                transaction_id: transaction?.id || "mock-transaction",
                integrity_status: "verified",
              },
            });
          }

          if (functionName === "initiate-paystack-refund") {
            const refund = {
              id: `mock-refund-${Date.now()}`,
              transaction_id: body.transactionId,
              amount_minor: Number(body.amount || 10000),
              currency: "GHS",
              status: "pending",
              reason: body.reason || "test_refund",
              created_at: now,
              updated_at: now,
            };
            ensureTable("property_refunds").unshift(refund);
            return jsonResponse({
              refund,
              transaction: ensureTable("property_transactions").find((row) => row.id === body.transactionId) || null,
              refundableBalanceMinor: 0,
            });
          }

          return jsonResponse({ ok: true, functionName });
        }

        if (url.origin !== supabaseOrigin || !url.pathname.startsWith("/rest/v1/")) {
          return originalFetch(input, init);
        }

        const table = url.pathname.replace("/rest/v1/", "");
        let rows = ensureTable(table).map((row) => ({ ...row }));
        const headers = new Headers(request.headers);

        for (const [rawKey, value] of url.searchParams.entries()) {
          if (["select", "order", "limit", "offset", "on_conflict"].includes(rawKey)) {
            continue;
          }

          if (rawKey === "or") {
            const foreignTable = url.searchParams.get("foreignTable");
            rows = applyOrFilter(rows, value, foreignTable ? normalizePath(foreignTable) : "");
            continue;
          }

          if (rawKey.endsWith(".or")) {
            const foreignTable = rawKey.slice(0, -3);
            rows = applyOrFilter(rows, value, foreignTable);
            continue;
          }

          rows = applyFilter(rows, rawKey, value);
        }

        rows = sortRows(rows, url.searchParams.getAll("order"));

        const totalBeforeRange = rows.length;
        window.__BAYTMIFTAH_MOCK_LOGS__.push({
          table,
          method,
          url: url.toString(),
          matchedRows: totalBeforeRange,
        });
        let start = Number(url.searchParams.get("offset") || 0);
        let end = null;
        const rangeHeader = headers.get("range");
        if (rangeHeader) {
          const [rawStart, rawEnd] = rangeHeader.split("-").map((part) => Number(part));
          start = Number.isFinite(rawStart) ? rawStart : 0;
          end = Number.isFinite(rawEnd) ? rawEnd : null;
        } else if (url.searchParams.has("limit")) {
          const limit = Number(url.searchParams.get("limit"));
          if (Number.isFinite(limit)) {
            end = start + limit - 1;
          }
        }

        const pagedRows =
          end == null ? rows.slice(start) : rows.slice(start, Math.max(end + 1, start));
        const contentRange = getContentRange(
          start,
          end == null
            ? Math.max(start, start + Math.max(pagedRows.length - 1, 0))
            : Math.max(start, start + Math.max(pagedRows.length - 1, 0)),
          totalBeforeRange
        );
        const wantsObject = (headers.get("accept") || "").includes(
          "application/vnd.pgrst.object+json"
        );

        if (method === "HEAD") {
          return emptyResponse(200, {
            "content-range": contentRange,
          });
        }

        if (method === "POST") {
          const bodyText = await request.text();
          const body = bodyText ? JSON.parse(bodyText) : {};
          const payload = Array.isArray(body) ? body : [body];
          const now = new Date().toISOString();
          const onConflict = url.searchParams.get("on_conflict");
          const conflictKeys = onConflict ? onConflict.split(",").map((key) => key.trim()) : [];
          const nextRows = ensureTable(table);
          const inserted = payload.map((item, index) => {
            const candidate = {
              ...item,
              id: item.id || `${table.replace(/[^a-z0-9]+/gi, "-")}-${nextRows.length + index + 1}`,
              created_at: item.created_at || now,
              updated_at: item.updated_at || now,
            };

            if (conflictKeys.length > 0) {
              const existingIndex = nextRows.findIndex((row) =>
                conflictKeys.every((key) => comparePrimitive(row[key], candidate[key]))
              );

              if (existingIndex >= 0) {
                nextRows[existingIndex] = {
                  ...nextRows[existingIndex],
                  ...candidate,
                };
                return nextRows[existingIndex];
              }
            }

            nextRows.unshift(candidate);
            return candidate;
          });

          return wantsObject
            ? jsonResponse(inserted[0] || null, {
                headers: { "content-range": getContentRange(0, 0, nextRows.length) },
              })
            : jsonResponse(inserted, {
                headers: { "content-range": getContentRange(0, inserted.length - 1, nextRows.length) },
              });
        }

        if (method === "PATCH") {
          const bodyText = await request.text();
          const updates = bodyText ? JSON.parse(bodyText) : {};
          const nextRows = ensureTable(table);
          const updated = nextRows
            .filter((row) => rows.some((candidate) => comparePrimitive(candidate.id, row.id)))
            .map((row) => Object.assign(row, updates, { updated_at: new Date().toISOString() }));

          return wantsObject
            ? jsonResponse(updated[0] || null, {
                headers: { "content-range": getContentRange(0, 0, updated.length) },
              })
            : jsonResponse(updated, {
                headers: { "content-range": getContentRange(0, updated.length - 1, updated.length) },
              });
        }

        if (method === "DELETE") {
          const nextRows = ensureTable(table);
          const removableIds = new Set(rows.map((row) => row.id));
          state.tables[table] = nextRows.filter((row) => !removableIds.has(row.id));
          return jsonResponse([]);
        }

        return wantsObject
          ? jsonResponse(pagedRows[0] || null, {
              headers: { "content-range": contentRange },
            })
          : jsonResponse(pagedRows, {
              headers: { "content-range": contentRange },
            });
      };
    },
    {
      fixtures,
      mode,
      supabaseUrl: process.env.VITE_SUPABASE_URL || "https://example.supabase.co",
    }
  );
}
