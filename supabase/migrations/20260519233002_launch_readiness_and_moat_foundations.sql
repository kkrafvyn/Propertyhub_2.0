-- BaytMiftah launch readiness and competitive moat foundations.
-- This migration does not activate external providers by itself. It gives the app
-- auditable places to track legal, payment, IoT, SMS, identity, registry, data,
-- AI, fraud, community, referral, construction, and contributor readiness.

CREATE TABLE IF NOT EXISTS public.launch_readiness_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workstream TEXT NOT NULL CHECK (
    workstream IN (
      'legal_compliance',
      'backup_restore',
      'payment_sandbox',
      'audit_anchoring',
      'iot_activation',
      'sms_ussd',
      'identity_verification',
      'land_registry',
      'hyperlocal_data',
      'community',
      'affordability_payments',
      'ai_investment',
      'referral_rewards',
      'fraud_prevention',
      'construction_intelligence',
      'user_monetization'
    )
  ),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    status IN ('not_started', 'in_progress', 'blocked', 'ready_for_review', 'approved', 'live', 'rejected')
  ),
  priority TEXT NOT NULL DEFAULT 'high' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  owner_team TEXT,
  due_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workstream, title)
);

CREATE TABLE IF NOT EXISTS public.launch_readiness_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  readiness_item_id UUID NOT NULL REFERENCES public.launch_readiness_items(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_type TEXT NOT NULL CHECK (
    evidence_type IN (
      'legal_document',
      'provider_dashboard',
      'sandbox_log',
      'backup_restore_log',
      'security_report',
      'data_source_contract',
      'device_test_log',
      'policy_signoff',
      'manual_sop',
      'other'
    )
  ),
  title TEXT NOT NULL,
  summary TEXT,
  external_url TEXT,
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'accepted', 'rejected', 'needs_changes')
  ),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.external_provider_readiness (
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
      'communications'
    )
  ),
  provider_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  status TEXT NOT NULL DEFAULT 'not_configured' CHECK (
    status IN ('not_configured', 'credentials_pending', 'configured', 'sandbox_testing', 'approved', 'live', 'disabled')
  ),
  fallback_provider_key TEXT,
  credential_storage TEXT NOT NULL DEFAULT 'server_env_or_vault',
  has_live_secret BOOLEAN NOT NULL DEFAULT FALSE,
  webhook_configured BOOLEAN NOT NULL DEFAULT FALSE,
  sandbox_verified_at TIMESTAMPTZ,
  production_verified_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_category, provider_key, environment)
);

CREATE TABLE IF NOT EXISTS public.provider_sandbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_readiness_id UUID REFERENCES public.external_provider_readiness(id) ON DELETE SET NULL,
  provider_key TEXT NOT NULL,
  scenario TEXT NOT NULL CHECK (
    scenario IN (
      'successful_payment',
      'failed_payment',
      'duplicate_webhook',
      'subscription_renewal',
      'subscription_failure',
      'refund',
      'chargeback',
      'transfer_release',
      'provider_fallback',
      'device_command',
      'sms_delivery',
      'ussd_handoff',
      'identity_verification',
      'registry_check',
      'other'
    )
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'blocked')),
  reference TEXT,
  observed_at TIMESTAMPTZ,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.backup_restore_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'staging' CHECK (environment IN ('local', 'staging', 'production')),
  backup_source TEXT NOT NULL,
  restore_target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'passed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recovery_point_minutes INTEGER CHECK (recovery_point_minutes IS NULL OR recovery_point_minutes >= 0),
  recovery_time_minutes INTEGER CHECK (recovery_time_minutes IS NULL OR recovery_time_minutes >= 0),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_url TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.official_verification_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  check_type TEXT NOT NULL CHECK (
    check_type IN ('ghana_card_liveness', 'business_registration', 'tax_identity', 'land_registry', 'lands_commission', 'utility_bill', 'sanctions_pep')
  ),
  provider_key TEXT,
  subject_reference TEXT,
  consent_recorded_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'submitted', 'verified', 'failed', 'needs_manual_review', 'expired')
  ),
  result_summary TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hyperlocal_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (
    signal_type IN ('flood', 'drainage', 'power', 'water', 'safety', 'transit', 'traffic', 'commercial_density', 'rental_yield', 'sales_comparable')
  ),
  coverage_area TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'manual_collection', 'connected', 'stale', 'disabled')),
  confidence_score NUMERIC(5,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
  last_imported_at TIMESTAMPTZ,
  refresh_frequency TEXT,
  disclosure TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.neighborhood_community_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT,
  district TEXT,
  neighborhood TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  moderation_mode TEXT NOT NULL DEFAULT 'pre_moderated' CHECK (moderation_mode IN ('pre_moderated', 'post_moderated', 'trusted_members')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (region, district, neighborhood)
);

CREATE TABLE IF NOT EXISTS public.community_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.neighborhood_community_spaces(id) ON DELETE CASCADE,
  contributor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contribution_type TEXT NOT NULL CHECK (
    contribution_type IN ('area_guide', 'event', 'emergency_alert', 'flood_report', 'power_report', 'water_report', 'review', 'photo')
  ),
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'needs_changes', 'published', 'archived')),
  reward_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affordability_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('weekly_rent', 'daily_rent', 'installment_purchase', 'bnpl_partner', 'ussd_handoff')),
  provider_key TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'legal_review', 'provider_review', 'active', 'paused', 'retired')),
  currency TEXT NOT NULL DEFAULT 'GHS',
  amount_minor INTEGER CHECK (amount_minor IS NULL OR amount_minor >= 0),
  cadence TEXT,
  terms_summary TEXT,
  legal_review_required BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_investment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  area_key TEXT,
  model_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'human_review', 'published', 'withdrawn')),
  score NUMERIC(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  confidence_score NUMERIC(5,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
  explanation TEXT,
  risk_disclosure TEXT,
  feature_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referral_reward_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('visit_bonus', 'lead_bonus', 'rental_success', 'sale_success', 'agency_signup', 'content_contribution')),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'paid', 'voided')),
  amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  fraud_hold BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.advanced_fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL CHECK (
    signal_type IN ('device_fingerprint', 'image_authenticity', 'identity_liveness', 'sanctions_pep', 'suspicious_price', 'ghost_property', 'repeat_dispute', 'behavioral_velocity')
  ),
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'cleared', 'confirmed', 'false_positive')),
  signal_hash TEXT,
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.construction_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  update_title TEXT NOT NULL,
  progress_percent NUMERIC(5,2) CHECK (progress_percent IS NULL OR (progress_percent >= 0 AND progress_percent <= 100)),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'published', 'rejected', 'archived')),
  observed_at DATE,
  estimated_completion_date DATE,
  forecast_confidence NUMERIC(5,2) CHECK (forecast_confidence IS NULL OR (forecast_confidence >= 0 AND forecast_confidence <= 100)),
  photo_storage_paths TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contributor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contributor_type TEXT NOT NULL CHECK (contributor_type IN ('area_guide', 'photographer', 'local_expert', 'referral_partner')),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'suspended', 'rejected')),
  payout_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (payout_status IN ('not_configured', 'pending_verification', 'verified', 'disabled')),
  bio TEXT,
  service_area TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, contributor_type)
);

CREATE TABLE IF NOT EXISTS public.contributor_payout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_profile_id UUID NOT NULL REFERENCES public.contributor_profiles(id) ON DELETE CASCADE,
  contribution_id UUID REFERENCES public.community_contributions(id) ON DELETE SET NULL,
  reward_ledger_id UUID REFERENCES public.referral_reward_ledger(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('area_guide', 'photo', 'review', 'referral', 'field_report')),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'paid', 'voided')),
  amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  tax_note TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.launch_readiness_items (workstream, title, description, priority, owner_team, metadata)
VALUES
  ('legal_compliance', 'Counsel signoff for legal policies', 'Terms, Privacy, Escrow Terms, Refund Policy, KYC/AML model, title disclaimers, and IoT/privacy language must be reviewed by Ghana counsel.', 'critical', 'Legal/Product', '{"external_dependency": true}'::jsonb),
  ('backup_restore', 'Backup and restore drill evidence', 'Run a restore drill and capture recovery point/time evidence before public launch.', 'critical', 'Engineering/Ops', '{"external_dependency": false}'::jsonb),
  ('payment_sandbox', 'Payment provider sandbox certification', 'Capture successful, failed, duplicate webhook, refund, transfer, chargeback, and fallback evidence for Paystack, Stripe, and Flutterwave.', 'critical', 'Engineering/Finance/Ops', '{"external_dependency": true}'::jsonb),
  ('audit_anchoring', 'Weekly integrity audit anchoring', 'Configure cron/secrets for scheduled integrity checkpoints.', 'high', 'Engineering/Ops', '{"external_dependency": false}'::jsonb),
  ('iot_activation', 'Live Smart Access device testing', 'Configure provider credentials and test TTLock, Yale, Tuya, parking gate, dock door, occupancy, and CCTV readiness with real devices.', 'critical', 'Engineering/Ops', '{"external_dependency": true}'::jsonb),
  ('sms_ussd', 'SMS and USSD activation', 'Select provider, register sender/short code, implement consent/opt-out, and validate booking/payment handoff paths.', 'high', 'Product/Ops/Engineering', '{"external_dependency": true}'::jsonb),
  ('identity_verification', 'Ghana Card and liveness vendor activation', 'Add vendor, consent capture, DPIA, manual fallback, and review queues.', 'critical', 'Product/Ops/Legal', '{"external_dependency": true}'::jsonb),
  ('land_registry', 'Lands Commission verification SOP', 'Create official/manual property search SOP and counsel-approved verification wording.', 'critical', 'Legal/Ops/Product', '{"external_dependency": true}'::jsonb),
  ('hyperlocal_data', 'Hyperlocal data feeds', 'Connect or manually curate flood, drainage, safety, power/water, transit, traffic, and commercial density signals.', 'high', 'Product/Data', '{"external_dependency": true}'::jsonb),
  ('community', 'Neighborhood community moderation', 'Launch community spaces with moderation, reports, emergency broadcasts, and contributor controls.', 'medium', 'Product/Trust & Safety', '{"external_dependency": false}'::jsonb),
  ('affordability_payments', 'Weekly/daily and BNPL payment plans', 'Add plans only after licensed partner/legal review so BaytMiftah does not become an unlicensed lender.', 'high', 'Product/Finance/Legal', '{"external_dependency": true}'::jsonb),
  ('ai_investment', 'AI investment score governance', 'Add Ghana-trained data, methodology, confidence scores, human review, and risk disclaimers.', 'medium', 'Product/Data/Legal', '{"external_dependency": true}'::jsonb),
  ('referral_rewards', 'Referral reward payout controls', 'Add reward ledger, approval workflow, fraud holds, payout policy, and accounting treatment.', 'medium', 'Product/Finance/Trust & Safety', '{"external_dependency": false}'::jsonb),
  ('fraud_prevention', 'Advanced fraud provider activation', 'Add device fingerprinting, image authenticity, liveness, sanctions/PEP, and final investigation runbooks.', 'high', 'Trust & Safety/Engineering', '{"external_dependency": true}'::jsonb),
  ('construction_intelligence', 'Construction progress intelligence', 'Add progress updates, developer verification, completion forecasts, and presale workflow controls.', 'medium', 'Product/Ops', '{"external_dependency": false}'::jsonb),
  ('user_monetization', 'Contributor monetization controls', 'Add paid area guides, photography submissions, payout review, tax notes, and content QA.', 'medium', 'Product/Finance', '{"external_dependency": false}'::jsonb)
ON CONFLICT (workstream, title) DO NOTHING;

INSERT INTO public.external_provider_readiness (
  provider_category,
  provider_key,
  display_name,
  environment,
  status,
  fallback_provider_key,
  notes,
  metadata
)
VALUES
  ('payment', 'paystack', 'Paystack', 'production', 'credentials_pending', NULL, 'Primary Ghana payment lane.', '{"supports": ["subscriptions", "escrow", "transfers", "refunds"]}'::jsonb),
  ('payment', 'stripe', 'Stripe', 'production', 'credentials_pending', 'paystack', 'Diaspora card and subscription lane.', '{"supports": ["subscriptions", "escrow", "refunds"]}'::jsonb),
  ('payment', 'flutterwave', 'Flutterwave', 'production', 'credentials_pending', 'paystack', 'Fallback and Africa expansion lane.', '{"supports": ["subscriptions", "escrow", "transfers", "refunds"]}'::jsonb),
  ('iot', 'ttlock', 'TTLock', 'production', 'credentials_pending', 'manual', 'Smart lock provider.', '{"device_classes": ["smart_lock"]}'::jsonb),
  ('iot', 'yale', 'Yale Access', 'production', 'credentials_pending', 'manual', 'Smart lock provider.', '{"device_classes": ["smart_lock"]}'::jsonb),
  ('iot', 'tuya', 'Tuya IoT', 'production', 'credentials_pending', 'manual', 'Energy, locks, occupancy, and sensors.', '{"device_classes": ["smart_lock", "energy_meter", "occupancy_sensor", "door_sensor"]}'::jsonb),
  ('sms', 'sms_provider', 'SMS Provider', 'production', 'not_configured', NULL, 'Short code or sender ID provider still needs selection.', '{}'::jsonb),
  ('ussd', 'ussd_partner', 'USSD Partner', 'production', 'not_configured', NULL, 'USSD payment/booking partner still needs selection.', '{}'::jsonb),
  ('identity', 'ghana_card_liveness', 'Ghana Card + Liveness Vendor', 'production', 'not_configured', NULL, 'Vendor must support consent, manual fallback, and DPIA requirements.', '{}'::jsonb),
  ('registry', 'lands_commission', 'Lands Commission Checks', 'production', 'not_configured', NULL, 'Official/manual property verification path.', '{}'::jsonb),
  ('hyperlocal_data', 'flood_power_water', 'Flood, Power, and Water Data', 'production', 'not_configured', NULL, 'Trusted data feeds or curated data pipeline.', '{}'::jsonb),
  ('fraud', 'image_device_sanctions', 'Image, Device, and Sanctions Risk Providers', 'production', 'not_configured', NULL, 'Advanced fraud provider bundle.', '{}'::jsonb)
ON CONFLICT (provider_category, provider_key, environment) DO NOTHING;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'launch_readiness_items',
    'launch_readiness_evidence',
    'external_provider_readiness',
    'provider_sandbox_events',
    'backup_restore_drills',
    'official_verification_checks',
    'hyperlocal_data_sources',
    'neighborhood_community_spaces',
    'community_contributions',
    'affordability_payment_plans',
    'ai_investment_scores',
    'referral_reward_ledger',
    'advanced_fraud_signals',
    'construction_progress_updates',
    'contributor_profiles',
    'contributor_payout_items'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP TRIGGER IF EXISTS set_%I_updated_at ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at()',
      table_name,
      table_name
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_launch_readiness_items_workstream_status
ON public.launch_readiness_items(workstream, status);
CREATE INDEX IF NOT EXISTS idx_launch_readiness_evidence_item
ON public.launch_readiness_evidence(readiness_item_id, status);
CREATE INDEX IF NOT EXISTS idx_external_provider_readiness_category
ON public.external_provider_readiness(provider_category, status);
CREATE INDEX IF NOT EXISTS idx_provider_sandbox_events_provider
ON public.provider_sandbox_events(provider_key, scenario, status);
CREATE INDEX IF NOT EXISTS idx_backup_restore_drills_status
ON public.backup_restore_drills(environment, status);
CREATE INDEX IF NOT EXISTS idx_official_verification_checks_org
ON public.official_verification_checks(organization_id, check_type, status);
CREATE INDEX IF NOT EXISTS idx_hyperlocal_data_sources_signal
ON public.hyperlocal_data_sources(signal_type, status);
CREATE INDEX IF NOT EXISTS idx_community_spaces_location
ON public.neighborhood_community_spaces(region, district, neighborhood);
CREATE INDEX IF NOT EXISTS idx_community_contributions_space
ON public.community_contributions(space_id, status);
CREATE INDEX IF NOT EXISTS idx_affordability_payment_plans_org
ON public.affordability_payment_plans(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_investment_scores_listing
ON public.ai_investment_scores(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_referral_reward_ledger_referrer
ON public.referral_reward_ledger(referrer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_advanced_fraud_signals_org
ON public.advanced_fraud_signals(organization_id, risk_level, status);
CREATE INDEX IF NOT EXISTS idx_construction_progress_project
ON public.construction_progress_updates(project_id, status);
CREATE INDEX IF NOT EXISTS idx_contributor_profiles_user
ON public.contributor_profiles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_contributor_payout_items_profile
ON public.contributor_payout_items(contributor_profile_id, status);

GRANT SELECT, INSERT, UPDATE ON
  public.launch_readiness_items,
  public.launch_readiness_evidence,
  public.external_provider_readiness,
  public.provider_sandbox_events,
  public.backup_restore_drills,
  public.official_verification_checks,
  public.hyperlocal_data_sources,
  public.neighborhood_community_spaces,
  public.community_contributions,
  public.affordability_payment_plans,
  public.ai_investment_scores,
  public.referral_reward_ledger,
  public.advanced_fraud_signals,
  public.construction_progress_updates,
  public.contributor_profiles,
  public.contributor_payout_items
TO authenticated;

DROP POLICY IF EXISTS "Admins manage launch readiness items" ON public.launch_readiness_items;
CREATE POLICY "Admins manage launch readiness items"
ON public.launch_readiness_items FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Admins manage launch readiness evidence" ON public.launch_readiness_evidence;
CREATE POLICY "Admins manage launch readiness evidence"
ON public.launch_readiness_evidence FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Org members can view own readiness evidence" ON public.launch_readiness_evidence;
CREATE POLICY "Org members can view own readiness evidence"
ON public.launch_readiness_evidence FOR SELECT
USING (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Admins manage provider readiness" ON public.external_provider_readiness;
CREATE POLICY "Admins manage provider readiness"
ON public.external_provider_readiness FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Admins manage provider sandbox events" ON public.provider_sandbox_events;
CREATE POLICY "Admins manage provider sandbox events"
ON public.provider_sandbox_events FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Admins manage backup restore drills" ON public.backup_restore_drills;
CREATE POLICY "Admins manage backup restore drills"
ON public.backup_restore_drills FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Admins manage official verification checks" ON public.official_verification_checks;
CREATE POLICY "Admins manage official verification checks"
ON public.official_verification_checks FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Org members can view official verification checks" ON public.official_verification_checks;
CREATE POLICY "Org members can view official verification checks"
ON public.official_verification_checks FOR SELECT
USING (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Users can view own official verification checks" ON public.official_verification_checks;
CREATE POLICY "Users can view own official verification checks"
ON public.official_verification_checks FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage hyperlocal data sources" ON public.hyperlocal_data_sources;
CREATE POLICY "Admins manage hyperlocal data sources"
ON public.hyperlocal_data_sources FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Authenticated users can view connected hyperlocal sources" ON public.hyperlocal_data_sources;
CREATE POLICY "Authenticated users can view connected hyperlocal sources"
ON public.hyperlocal_data_sources FOR SELECT
USING (status = 'connected');

DROP POLICY IF EXISTS "Admins manage community spaces" ON public.neighborhood_community_spaces;
CREATE POLICY "Admins manage community spaces"
ON public.neighborhood_community_spaces FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Authenticated users can view active community spaces" ON public.neighborhood_community_spaces;
CREATE POLICY "Authenticated users can view active community spaces"
ON public.neighborhood_community_spaces FOR SELECT
USING (status = 'active');

DROP POLICY IF EXISTS "Admins manage community contributions" ON public.community_contributions;
CREATE POLICY "Admins manage community contributions"
ON public.community_contributions FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Users create own community contributions" ON public.community_contributions;
CREATE POLICY "Users create own community contributions"
ON public.community_contributions FOR INSERT
WITH CHECK (contributor_user_id = auth.uid());

DROP POLICY IF EXISTS "Users view own or published community contributions" ON public.community_contributions;
CREATE POLICY "Users view own or published community contributions"
ON public.community_contributions FOR SELECT
USING (contributor_user_id = auth.uid() OR status = 'published');

DROP POLICY IF EXISTS "Admins manage affordability payment plans" ON public.affordability_payment_plans;
CREATE POLICY "Admins manage affordability payment plans"
ON public.affordability_payment_plans FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Org members view affordability payment plans" ON public.affordability_payment_plans;
CREATE POLICY "Org members view affordability payment plans"
ON public.affordability_payment_plans FOR SELECT
USING (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Admins manage AI investment scores" ON public.ai_investment_scores;
CREATE POLICY "Admins manage AI investment scores"
ON public.ai_investment_scores FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Authenticated users view published AI investment scores" ON public.ai_investment_scores;
CREATE POLICY "Authenticated users view published AI investment scores"
ON public.ai_investment_scores FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS "Admins manage referral rewards" ON public.referral_reward_ledger;
CREATE POLICY "Admins manage referral rewards"
ON public.referral_reward_ledger FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Users view own referral rewards" ON public.referral_reward_ledger;
CREATE POLICY "Users view own referral rewards"
ON public.referral_reward_ledger FOR SELECT
USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage advanced fraud signals" ON public.advanced_fraud_signals;
CREATE POLICY "Admins manage advanced fraud signals"
ON public.advanced_fraud_signals FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Org members view advanced fraud signals" ON public.advanced_fraud_signals;
CREATE POLICY "Org members view advanced fraud signals"
ON public.advanced_fraud_signals FOR SELECT
USING (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Admins manage construction progress updates" ON public.construction_progress_updates;
CREATE POLICY "Admins manage construction progress updates"
ON public.construction_progress_updates FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Org members view construction progress updates" ON public.construction_progress_updates;
CREATE POLICY "Org members view construction progress updates"
ON public.construction_progress_updates FOR SELECT
USING (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Authenticated users view published construction progress" ON public.construction_progress_updates;
CREATE POLICY "Authenticated users view published construction progress"
ON public.construction_progress_updates FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS "Admins manage contributor profiles" ON public.contributor_profiles;
CREATE POLICY "Admins manage contributor profiles"
ON public.contributor_profiles FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Users manage own contributor profiles" ON public.contributor_profiles;
CREATE POLICY "Users manage own contributor profiles"
ON public.contributor_profiles FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage contributor payout items" ON public.contributor_payout_items;
CREATE POLICY "Admins manage contributor payout items"
ON public.contributor_payout_items FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Contributors view own payout items" ON public.contributor_payout_items;
CREATE POLICY "Contributors view own payout items"
ON public.contributor_payout_items FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.contributor_profiles profile
    WHERE profile.id = contributor_payout_items.contributor_profile_id
      AND profile.user_id = auth.uid()
  )
);

COMMENT ON TABLE public.launch_readiness_items IS
  'Tracks the remaining legal, operational, provider, and moat launch workstreams that cannot be completed safely without evidence.';
COMMENT ON TABLE public.external_provider_readiness IS
  'Tracks server-side readiness for payment, IoT, SMS, USSD, identity, registry, data, AI, and fraud providers without storing secrets in public tables.';
COMMENT ON TABLE public.provider_sandbox_events IS
  'Evidence ledger for provider sandbox scenarios such as duplicate webhooks, failed payments, refunds, transfers, and fallback behavior.';
COMMENT ON TABLE public.official_verification_checks IS
  'Tracks Ghana Card, business, tax, Lands Commission, utility, and sanctions checks with consent and manual review status.';
COMMENT ON TABLE public.referral_reward_ledger IS
  'Approval-first referral reward ledger with fraud holds before payout.';
COMMENT ON TABLE public.contributor_payout_items IS
  'User monetization payout queue for paid guides, photos, reports, and referral items.';
