-- BaytMiftah production activation and product-depth controls.
-- These tables wire the remaining launch work without storing API secrets.
-- Provider credentials stay server-side in environment variables or a vault.

CREATE TABLE IF NOT EXISTS public.provider_integration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_category TEXT NOT NULL CHECK (
    provider_category IN (
      'payment',
      'iot',
      'sms',
      'ussd',
      'identity',
      'registry',
      'hyperlocal_data',
      'ai',
      'fraud',
      'communications',
      'monitoring',
      'backup'
    )
  ),
  provider_key TEXT NOT NULL,
  run_type TEXT NOT NULL CHECK (
    run_type IN (
      'connectivity_check',
      'sandbox_certification',
      'production_health_check',
      'webhook_probe',
      'fallback_drill',
      'data_import',
      'manual_evidence'
    )
  ),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'passed', 'failed', 'blocked', 'needs_review')
  ),
  external_reference TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legal_compliance_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL CHECK (
    domain IN (
      'escrow',
      'refunds',
      'data_protection',
      'property_verification',
      'sms',
      'ai',
      'iot_privacy',
      'referral_payouts',
      'affordability_payments',
      'general_terms'
    )
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'ready_for_counsel', 'approved', 'rejected', 'expired')
  ),
  policy_title TEXT NOT NULL,
  policy_version TEXT NOT NULL DEFAULT 'v1',
  reviewer_name TEXT,
  reviewer_role TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  evidence_url TEXT,
  risk_summary TEXT,
  required_changes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (domain, policy_version)
);

CREATE TABLE IF NOT EXISTS public.hyperlocal_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.hyperlocal_data_sources(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL CHECK (
    signal_type IN ('flood', 'drainage', 'power', 'water', 'safety', 'transit', 'traffic', 'commercial_density', 'rental_yield', 'sales_comparable')
  ),
  region TEXT,
  district TEXT,
  neighborhood TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signal_value NUMERIC,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence_score NUMERIC(5,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
  public_summary TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.neighborhood_community_spaces(id) ON DELETE SET NULL,
  broadcast_type TEXT NOT NULL CHECK (
    broadcast_type IN ('emergency_alert', 'flood_warning', 'power_notice', 'water_notice', 'security_notice', 'event_update', 'market_update')
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'queued', 'sent', 'cancelled', 'expired')
  ),
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.neighborhood_community_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'moderated', 'locked', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'members', 'moderators')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.community_chat_threads(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'published', 'hidden', 'removed')
  ),
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affordability_plan_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.affordability_payment_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending_kyc', 'pending_provider', 'active', 'paused', 'completed', 'cancelled', 'defaulted')
  ),
  amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  cadence TEXT NOT NULL DEFAULT 'weekly',
  next_due_at TIMESTAMPTZ,
  provider_key TEXT,
  provider_reference TEXT,
  legal_disclaimer_accepted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.investment_score_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_score_id UUID REFERENCES public.ai_investment_scores(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  area_key TEXT,
  status TEXT NOT NULL DEFAULT 'human_review' CHECK (
    status IN ('draft', 'human_review', 'approved', 'published', 'rejected', 'withdrawn')
  ),
  score NUMERIC(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  confidence_score NUMERIC(5,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
  model_version TEXT NOT NULL DEFAULT 'manual-v1',
  rationale TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contributor_marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_profile_id UUID REFERENCES public.contributor_profiles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (
    service_type IN ('area_guide', 'photography', 'field_report', 'neighborhood_review', 'property_video', 'inspection_support')
  ),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'approved', 'published', 'paused', 'rejected', 'archived')
  ),
  price_minor INTEGER CHECK (price_minor IS NULL OR price_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  service_area TEXT,
  portfolio_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.construction_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  forecast_type TEXT NOT NULL CHECK (
    forecast_type IN ('completion_date', 'occupancy', 'price_escalation', 'delay_risk', 'presale_readiness')
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'verified', 'published', 'rejected', 'archived')
  ),
  forecast_value TEXT NOT NULL,
  confidence_score NUMERIC(5,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
  evidence_summary TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.developer_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'submitted', 'verified', 'failed', 'expired')
  ),
  business_registration_reference TEXT,
  permit_reference TEXT,
  land_reference TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.white_label_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'configured', 'review', 'active', 'paused', 'retired')
  ),
  custom_domain TEXT,
  brand_palette JSONB NOT NULL DEFAULT '{}'::jsonb,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  configured_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, package_name)
);

CREATE TABLE IF NOT EXISTS public.commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'paused', 'archived')
  ),
  applies_to TEXT NOT NULL DEFAULT 'all_deals' CHECK (
    applies_to IN ('all_deals', 'rentals', 'sales', 'leases', 'commercial', 'agent_specific')
  ),
  percentage NUMERIC(5,2) CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
  flat_amount_minor INTEGER CHECK (flat_amount_minor IS NULL OR flat_amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  payout_cadence TEXT NOT NULL DEFAULT 'on_close',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_provider_integration_runs_provider
ON public.provider_integration_runs(provider_category, provider_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_signoffs_domain_status
ON public.legal_compliance_signoffs(domain, status);

CREATE INDEX IF NOT EXISTS idx_hyperlocal_observations_location
ON public.hyperlocal_observations(signal_type, region, district, neighborhood, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_broadcasts_space_status
ON public.community_broadcasts(space_id, status, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_chat_threads_space
ON public.community_chat_threads(space_id, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_affordability_enrollments_user
ON public.affordability_plan_enrollments(user_id, status, next_due_at);

CREATE INDEX IF NOT EXISTS idx_investment_score_reviews_listing
ON public.investment_score_reviews(listing_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contributor_marketplace_status
ON public.contributor_marketplace_listings(service_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_construction_forecasts_project
ON public.construction_forecasts(project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_developer_verifications_org
ON public.developer_verifications(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_white_label_packages_org
ON public.white_label_packages(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_commission_rules_org
ON public.commission_rules(organization_id, status);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'provider_integration_runs',
    'legal_compliance_signoffs',
    'hyperlocal_observations',
    'community_broadcasts',
    'community_chat_threads',
    'community_chat_messages',
    'affordability_plan_enrollments',
    'investment_score_reviews',
    'contributor_marketplace_listings',
    'construction_forecasts',
    'developer_verifications',
    'white_label_packages',
    'commission_rules'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON
  public.provider_integration_runs,
  public.legal_compliance_signoffs,
  public.hyperlocal_observations,
  public.community_broadcasts,
  public.community_chat_threads,
  public.community_chat_messages,
  public.affordability_plan_enrollments,
  public.investment_score_reviews,
  public.contributor_marketplace_listings,
  public.construction_forecasts,
  public.developer_verifications,
  public.white_label_packages,
  public.commission_rules
TO authenticated;

GRANT SELECT ON
  public.hyperlocal_observations,
  public.community_broadcasts,
  public.community_chat_threads,
  public.community_chat_messages,
  public.contributor_marketplace_listings,
  public.construction_forecasts
TO anon;

DROP TRIGGER IF EXISTS set_provider_integration_runs_updated_at ON public.provider_integration_runs;
CREATE TRIGGER set_provider_integration_runs_updated_at
BEFORE UPDATE ON public.provider_integration_runs
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_legal_compliance_signoffs_updated_at ON public.legal_compliance_signoffs;
CREATE TRIGGER set_legal_compliance_signoffs_updated_at
BEFORE UPDATE ON public.legal_compliance_signoffs
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_community_broadcasts_updated_at ON public.community_broadcasts;
CREATE TRIGGER set_community_broadcasts_updated_at
BEFORE UPDATE ON public.community_broadcasts
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_community_chat_threads_updated_at ON public.community_chat_threads;
CREATE TRIGGER set_community_chat_threads_updated_at
BEFORE UPDATE ON public.community_chat_threads
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_community_chat_messages_updated_at ON public.community_chat_messages;
CREATE TRIGGER set_community_chat_messages_updated_at
BEFORE UPDATE ON public.community_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_affordability_enrollments_updated_at ON public.affordability_plan_enrollments;
CREATE TRIGGER set_affordability_enrollments_updated_at
BEFORE UPDATE ON public.affordability_plan_enrollments
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_investment_score_reviews_updated_at ON public.investment_score_reviews;
CREATE TRIGGER set_investment_score_reviews_updated_at
BEFORE UPDATE ON public.investment_score_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_contributor_marketplace_updated_at ON public.contributor_marketplace_listings;
CREATE TRIGGER set_contributor_marketplace_updated_at
BEFORE UPDATE ON public.contributor_marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_construction_forecasts_updated_at ON public.construction_forecasts;
CREATE TRIGGER set_construction_forecasts_updated_at
BEFORE UPDATE ON public.construction_forecasts
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_developer_verifications_updated_at ON public.developer_verifications;
CREATE TRIGGER set_developer_verifications_updated_at
BEFORE UPDATE ON public.developer_verifications
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_white_label_packages_updated_at ON public.white_label_packages;
CREATE TRIGGER set_white_label_packages_updated_at
BEFORE UPDATE ON public.white_label_packages
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_commission_rules_updated_at ON public.commission_rules;
CREATE TRIGGER set_commission_rules_updated_at
BEFORE UPDATE ON public.commission_rules
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP POLICY IF EXISTS "Admins manage provider integration runs" ON public.provider_integration_runs;
CREATE POLICY "Admins manage provider integration runs"
ON public.provider_integration_runs FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Admins manage legal compliance signoffs" ON public.legal_compliance_signoffs;
CREATE POLICY "Admins manage legal compliance signoffs"
ON public.legal_compliance_signoffs FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Anyone can read public hyperlocal observations" ON public.hyperlocal_observations;
CREATE POLICY "Anyone can read public hyperlocal observations"
ON public.hyperlocal_observations FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Admins manage hyperlocal observations" ON public.hyperlocal_observations;
CREATE POLICY "Admins manage hyperlocal observations"
ON public.hyperlocal_observations FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Anyone can read sent community broadcasts" ON public.community_broadcasts;
CREATE POLICY "Anyone can read sent community broadcasts"
ON public.community_broadcasts FOR SELECT
USING (status IN ('queued', 'sent'));

DROP POLICY IF EXISTS "Admins manage community broadcasts" ON public.community_broadcasts;
CREATE POLICY "Admins manage community broadcasts"
ON public.community_broadcasts FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Anyone can read public community threads" ON public.community_chat_threads;
CREATE POLICY "Anyone can read public community threads"
ON public.community_chat_threads FOR SELECT
USING (visibility = 'public' AND status IN ('open', 'moderated'));

DROP POLICY IF EXISTS "Authenticated users create community threads" ON public.community_chat_threads;
CREATE POLICY "Authenticated users create community threads"
ON public.community_chat_threads FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins manage community threads" ON public.community_chat_threads;
CREATE POLICY "Admins manage community threads"
ON public.community_chat_threads FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Anyone can read published community messages" ON public.community_chat_messages;
CREATE POLICY "Anyone can read published community messages"
ON public.community_chat_messages FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS "Authenticated users create community messages" ON public.community_chat_messages;
CREATE POLICY "Authenticated users create community messages"
ON public.community_chat_messages FOR INSERT
TO authenticated
WITH CHECK (author_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage community messages" ON public.community_chat_messages;
CREATE POLICY "Admins manage community messages"
ON public.community_chat_messages FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Users view own affordability enrollments" ON public.affordability_plan_enrollments;
CREATE POLICY "Users view own affordability enrollments"
ON public.affordability_plan_enrollments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users create own affordability enrollments" ON public.affordability_plan_enrollments;
CREATE POLICY "Users create own affordability enrollments"
ON public.affordability_plan_enrollments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage affordability enrollments" ON public.affordability_plan_enrollments;
CREATE POLICY "Admins manage affordability enrollments"
ON public.affordability_plan_enrollments FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Admins manage investment score reviews" ON public.investment_score_reviews;
CREATE POLICY "Admins manage investment score reviews"
ON public.investment_score_reviews FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Anyone reads published contributor marketplace listings" ON public.contributor_marketplace_listings;
CREATE POLICY "Anyone reads published contributor marketplace listings"
ON public.contributor_marketplace_listings FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS "Contributors manage own marketplace listings" ON public.contributor_marketplace_listings;
CREATE POLICY "Contributors manage own marketplace listings"
ON public.contributor_marketplace_listings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.contributor_profiles profile
    WHERE profile.id = contributor_marketplace_listings.contributor_profile_id
      AND profile.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.contributor_profiles profile
    WHERE profile.id = contributor_marketplace_listings.contributor_profile_id
      AND profile.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins manage contributor marketplace listings" ON public.contributor_marketplace_listings;
CREATE POLICY "Admins manage contributor marketplace listings"
ON public.contributor_marketplace_listings FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Anyone reads published construction forecasts" ON public.construction_forecasts;
CREATE POLICY "Anyone reads published construction forecasts"
ON public.construction_forecasts FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS "Org members view construction forecasts" ON public.construction_forecasts;
CREATE POLICY "Org members view construction forecasts"
ON public.construction_forecasts FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Admins manage construction forecasts" ON public.construction_forecasts;
CREATE POLICY "Admins manage construction forecasts"
ON public.construction_forecasts FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Admins manage developer verifications" ON public.developer_verifications;
CREATE POLICY "Admins manage developer verifications"
ON public.developer_verifications FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Org members view own developer verification" ON public.developer_verifications;
CREATE POLICY "Org members view own developer verification"
ON public.developer_verifications FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Org owners manage white label packages" ON public.white_label_packages;
CREATE POLICY "Org owners manage white label packages"
ON public.white_label_packages FOR ALL
TO authenticated
USING (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
)
WITH CHECK (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Admins manage white label packages" ON public.white_label_packages;
CREATE POLICY "Admins manage white label packages"
ON public.white_label_packages FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Org members manage commission rules" ON public.commission_rules;
CREATE POLICY "Org members manage commission rules"
ON public.commission_rules FOR ALL
TO authenticated
USING (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
)
WITH CHECK (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Admins manage commission rules" ON public.commission_rules;
CREATE POLICY "Admins manage commission rules"
ON public.commission_rules FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

INSERT INTO public.external_provider_readiness (
  provider_category,
  provider_key,
  display_name,
  environment,
  status,
  fallback_provider_key,
  has_live_secret,
  webhook_configured,
  notes,
  metadata
)
VALUES
  ('identity', 'ghana_card_liveness', 'Ghana Card + Liveness Provider', 'production', 'credentials_pending', 'manual_identity_review', FALSE, TRUE, 'Connect OCR/liveness vendor after DPIA and consent flow approval.', '{"strict_flag":"--strict-identity","requires_consent":true}'::jsonb),
  ('registry', 'lands_commission_manual', 'Lands Commission / Manual Registry Verification', 'production', 'credentials_pending', 'manual_registry_review', FALSE, FALSE, 'Use official/manual registry workflow until an approved API contract exists.', '{"strict_flag":"--strict-identity","manual_fallback":true}'::jsonb),
  ('fraud', 'sanctions_pep', 'Sanctions and PEP Screening', 'production', 'credentials_pending', 'manual_fraud_review', FALSE, TRUE, 'Human review remains required for high-risk outputs.', '{"strict_flag":"--strict-identity","review_first":true}'::jsonb),
  ('fraud', 'image_authenticity', 'Image Authenticity Screening', 'production', 'credentials_pending', 'manual_image_review', FALSE, FALSE, 'Use provider evidence only as an advisory fraud signal.', '{"strict_flag":"--strict-identity","review_first":true}'::jsonb),
  ('hyperlocal_data', 'flood_drainage_feed', 'Flood and Drainage Data Feed', 'production', 'credentials_pending', 'manual_field_collection', FALSE, FALSE, 'Connect official or contracted flood/drainage feed when available.', '{"strict_flag":"--strict-data","signals":["flood","drainage"]}'::jsonb),
  ('hyperlocal_data', 'utilities_reliability_feed', 'Power and Water Reliability Feed', 'production', 'credentials_pending', 'manual_field_collection', FALSE, FALSE, 'Connect ECG/water-provider or research partner data after data agreement.', '{"strict_flag":"--strict-data","signals":["power","water"]}'::jsonb),
  ('hyperlocal_data', 'mobility_safety_feed', 'Transit, Traffic, Safety, and Commercial Density Feed', 'production', 'credentials_pending', 'manual_field_collection', FALSE, FALSE, 'Connect mobility/safety/commercial-density feeds with source disclosure.', '{"strict_flag":"--strict-data","signals":["transit","traffic","safety","commercial_density"]}'::jsonb),
  ('communications', 'community_broadcasts', 'Community Broadcast Delivery', 'production', 'credentials_pending', 'in_app_only', FALSE, FALSE, 'SMS/WhatsApp provider needed before external emergency broadcasts.', '{"strict_flag":"--strict-comms","in_app_ready":true}'::jsonb),
  ('ai', 'ghana_investment_model', 'Ghana Investment Scoring Model', 'production', 'credentials_pending', 'manual_score_review', FALSE, FALSE, 'Publish only after data governance and human review are approved.', '{"strict_flag":"--strict-data","review_first":true}'::jsonb),
  ('monitoring', 'production_observability', 'Production Monitoring and Log Drain', 'production', 'credentials_pending', NULL, FALSE, TRUE, 'Add monitoring DSN, uptime target, and log drain endpoint.', '{"strict_flag":"--strict-ops"}'::jsonb),
  ('backup', 'restore_evidence', 'Backup Restore Evidence', 'production', 'credentials_pending', NULL, FALSE, FALSE, 'Attach restore drill proof before public launch.', '{"strict_flag":"--strict-ops"}'::jsonb)
ON CONFLICT (provider_category, provider_key, environment) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  fallback_provider_key = EXCLUDED.fallback_provider_key,
  notes = EXCLUDED.notes,
  metadata = public.external_provider_readiness.metadata || EXCLUDED.metadata,
  updated_at = NOW();

COMMENT ON TABLE public.provider_integration_runs IS
  'Provider activation runs and evidence records. Does not store API keys or secrets.';
COMMENT ON TABLE public.legal_compliance_signoffs IS
  'Counsel and operations signoff records for launch-sensitive domains.';
COMMENT ON TABLE public.hyperlocal_observations IS
  'Imported or manually collected neighborhood signals for flood, utilities, safety, transit, traffic, and commercial density.';
COMMENT ON TABLE public.community_broadcasts IS
  'Moderated neighborhood and emergency broadcasts, with external channels gated by provider readiness.';
COMMENT ON TABLE public.community_chat_threads IS
  'Neighborhood chat threads for community Q&A and local updates.';
COMMENT ON TABLE public.affordability_plan_enrollments IS
  'Buyer or renter enrollments in weekly, daily, BNPL, lender, or USSD payment plan pilots.';
COMMENT ON TABLE public.investment_score_reviews IS
  'Human-reviewed AI investment score approval workflow.';
COMMENT ON TABLE public.contributor_marketplace_listings IS
  'Approved contributor service marketplace listings such as area guides and property photography.';
COMMENT ON TABLE public.construction_forecasts IS
  'Human-reviewed construction forecasts for completion, occupancy, price escalation, delay risk, and presale readiness.';
COMMENT ON TABLE public.white_label_packages IS
  'Agency white-label configuration records.';
COMMENT ON TABLE public.commission_rules IS
  'Organization-level commission tracking rules.';
