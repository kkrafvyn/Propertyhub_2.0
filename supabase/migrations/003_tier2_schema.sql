-- Property Hub REOS Tier 2 Features - Extended Database Schema
-- Run this AFTER 001_create_schema.sql

-- =============================================================================
-- 1. AI PROPERTY ASSISTANT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  parsed_filters JSONB,
  results_count INTEGER,
  clicked_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reason TEXT,
  confidence_score DECIMAL(3, 2),
  clicked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  preferred_areas TEXT[],
  preferred_price_min INTEGER,
  preferred_price_max INTEGER,
  preferred_bedroom_count INTEGER,
  preferred_property_types TEXT[],
  notification_frequency TEXT DEFAULT 'weekly',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 2. FRAUD DETECTION TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT CHECK (target_type IN ('listing', 'user', 'organization', 'transaction')),
  target_id UUID NOT NULL,
  alert_type TEXT CHECK (alert_type IN ('duplicate_image', 'suspicious_listing', 'suspicious_account', 'fraud_transaction', 'spam_behavior')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  description TEXT,
  evidence JSONB,
  status TEXT CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected', 'resolved')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.image_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  perceptual_hash TEXT,
  file_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(file_hash)
);

CREATE TABLE IF NOT EXISTS public.fraud_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT CHECK (target_type IN ('listing', 'user', 'organization')),
  target_id UUID NOT NULL,
  reason TEXT,
  description TEXT,
  evidence JSONB,
  status TEXT CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 3. MARKET INTELLIGENCE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.market_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  location TEXT,
  property_type TEXT,
  listing_type TEXT,
  avg_price INTEGER,
  median_price INTEGER,
  price_trend DECIMAL(5, 2),
  avg_listing_days INTEGER,
  occupancy_rate DECIMAL(5, 2),
  total_listings INTEGER,
  new_listings INTEGER,
  sold_listings INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(period, location, property_type, listing_type, date_trunc('day', created_at))
);

CREATE TABLE IF NOT EXISTS public.location_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  growth_rate DECIMAL(5, 2),
  investment_score DECIMAL(3, 2),
  safety_score DECIMAL(3, 2),
  accessibility_score DECIMAL(3, 2),
  demand_level TEXT CHECK (demand_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  trending_up BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_listings INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2),
  avg_lead_quality DECIMAL(3, 2),
  best_performing_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  response_time_hours DECIMAL(10, 2),
  customer_satisfaction_score DECIMAL(3, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 4. WHITE-LABEL SAAS TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1F2937',
  accent_color TEXT DEFAULT '#10B981',
  custom_domain TEXT UNIQUE,
  email_from_address TEXT,
  email_reply_to TEXT,
  terms_url TEXT,
  privacy_url TEXT,
  custom_css TEXT,
  theme_name TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled_features TEXT[] DEFAULT ARRAY['listings', 'messaging', 'analytics'],
  commission_rate DECIMAL(5, 2) DEFAULT 0,
  payment_terms TEXT,
  sms_notifications_enabled BOOLEAN DEFAULT FALSE,
  email_notifications_enabled BOOLEAN DEFAULT TRUE,
  push_notifications_enabled BOOLEAN DEFAULT TRUE,
  auto_lead_assignment BOOLEAN DEFAULT FALSE,
  lead_assignment_strategy TEXT DEFAULT 'round_robin',
  max_team_members INTEGER,
  api_access_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 5. VENDOR & CONTRACTOR ECOSYSTEM TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_category TEXT CHECK (business_category IN ('electrician', 'plumber', 'cleaner', 'mover', 'painter', 'carpenter', 'internet_provider', 'security', 'other')),
  phone TEXT,
  email TEXT,
  address TEXT,
  verified BOOLEAN DEFAULT FALSE,
  rating_avg DECIMAL(3, 2) DEFAULT 0,
  total_jobs_completed INTEGER DEFAULT 0,
  response_time_minutes INTEGER,
  service_areas TEXT[],
  availability_status TEXT CHECK (availability_status IN ('available', 'busy', 'unavailable')) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendor_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  description TEXT,
  base_price INTEGER,
  currency TEXT DEFAULT 'GHS',
  estimated_duration_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  requested_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  cost INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.vendor_assignments(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vendor_id, rater_id, assignment_id)
);

-- =============================================================================
-- 6. AUTOMATION ENGINE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  workflow_type TEXT CHECK (workflow_type IN ('lead', 'listing', 'transaction', 'team', 'custom')),
  trigger_type TEXT,
  conditions JSONB,
  actions JSONB,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  trigger_source_id UUID,
  status TEXT CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 7. RECOMMENDATION ENGINE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.recommendation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  algorithm_version TEXT,
  recommended_listings JSONB,
  interacted BOOLEAN DEFAULT FALSE,
  clicked_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 8. MOBILE APP ECOSYSTEM TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mobile_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT UNIQUE NOT NULL,
  device_type TEXT CHECK (device_type IN ('ios', 'android')),
  app_version TEXT,
  os_version TEXT,
  last_active_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.mobile_devices(id) ON DELETE CASCADE,
  subscription_endpoint TEXT,
  subscription_key TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 9. MULTI-CHANNEL COMMUNICATION HUB TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  notification_frequency TEXT CHECK (notification_frequency IN ('immediate', 'daily', 'weekly', 'never')) DEFAULT 'daily',
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT,
  channel TEXT CHECK (channel IN ('email', 'sms', 'push', 'in_app', 'whatsapp')),
  subject TEXT,
  content TEXT,
  delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 10. GEOINTELLIGENCE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.location_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  safety_score DECIMAL(3, 2),
  investment_score DECIMAL(3, 2),
  accessibility_score DECIMAL(3, 2),
  walkability_score DECIMAL(3, 2),
  school_proximity_score DECIMAL(3, 2),
  healthcare_proximity_score DECIMAL(3, 2),
  overall_score DECIMAL(3, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nearby_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  service_type TEXT CHECK (service_type IN ('school', 'hospital', 'shopping_center', 'restaurant', 'park', 'gym', 'bank', 'transit', 'other')),
  service_name TEXT,
  distance_meters INTEGER,
  google_places_id TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.heatmap_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  demand_level TEXT CHECK (demand_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  supply_level TEXT CHECK (supply_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  price_level TEXT CHECK (price_level IN ('budget', 'mid_range', 'premium', 'luxury')),
  listing_count INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CREATE INDEXES FOR TIER 2
-- =============================================================================

CREATE INDEX idx_ai_searches_user ON public.ai_searches(user_id);
CREATE INDEX idx_ai_recommendations_user ON public.ai_recommendations(user_id);
CREATE INDEX idx_fraud_alerts_target ON public.fraud_alerts(target_type, target_id);
CREATE INDEX idx_fraud_alerts_status ON public.fraud_alerts(status);
CREATE INDEX idx_image_hashes_listing ON public.image_hashes(listing_id);
CREATE INDEX idx_market_analytics_location ON public.market_analytics(location, period);
CREATE INDEX idx_organization_insights_org ON public.organization_insights(organization_id);
CREATE INDEX idx_vendor_assignments_org ON public.vendor_assignments(organization_id);
CREATE INDEX idx_vendor_assignments_status ON public.vendor_assignments(status);
CREATE INDEX idx_automation_workflows_org ON public.automation_workflows(organization_id);
CREATE INDEX idx_automation_logs_workflow ON public.automation_logs(workflow_id);
CREATE INDEX idx_recommendation_logs_user ON public.recommendation_logs(user_id);
CREATE INDEX idx_notification_logs_user ON public.notification_logs(user_id);
CREATE INDEX idx_location_scores_city ON public.location_scores(city, region);
CREATE INDEX idx_nearby_services_property ON public.nearby_services(property_id);

-- =============================================================================
-- ENABLE RLS FOR TIER 2 TABLES
-- =============================================================================

ALTER TABLE public.ai_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nearby_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heatmap_data ENABLE ROW LEVEL SECURITY;
